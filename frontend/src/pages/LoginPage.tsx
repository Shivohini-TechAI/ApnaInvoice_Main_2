import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [pendingToken, setPendingToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [toast, setToast] = useState('');
  const { login } = useAuth();
  const location = useLocation();
  const successMessage = location.state?.successMessage || '';
  const messageType = location.state?.messageType || '';
  const sendOtp = async () => {
    if (!phone.trim()) return setError(t('auth.login.invalidEmail') || 'Enter phone');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) setError(t('auth.login.pleaseSignup') || 'Please sign up before logging in');
        else setError(data.message || t('auth.errors.serverError'));
        setLoading(false);
        return;
      }
      setPendingToken(data.pendingToken);
      sessionStorage.setItem('pending_token', data.pendingToken);
      sessionStorage.setItem('pending_masked_phone', data.maskedPhone || '');
      setSent(true);
      const msg = t('otp.sentToPhone', { phone: data.maskedPhone || phone });
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setError(err.message || t('auth.errors.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!verified) return setError(t('auth.login.verifyFirst') || 'Please verify OTP first');
    // token/user already stored by verifyOtp; proceed to login via context
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token) return setError('No session found');

    setLoading(true);
    try {
      const result = await login(token, user ? JSON.parse(user) : undefined);
      if (!result.success) {
        setError(result.error || 'Login failed');
        return;
      }
      // Navigate to dashboard and reload the app so all providers initialize
      navigate('/admin/invoices');
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim() || !(pendingToken || sessionStorage.getItem('pending_token'))) return setError(t('otp.placeholder') || 'Enter OTP');
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken: pendingToken || sessionStorage.getItem('pending_token'), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || t('auth.errors.unexpectedError') || 'Verification failed'); setLoading(false); return; }
      // Store token/user and mark verified. Do not auto-redirect; require clicking Login.
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setVerified(true);
      setToast(t('otp.verified') || 'Phone verified');
      setTimeout(() => setToast(''), 2000);
    } catch (err:any) { setError(err.message || 'Verification failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      {toast && (
        <div className="fixed right-4 top-4 z-50 bg-green-600 text-white px-4 py-2 rounded shadow">{toast}</div>
      )}
      <div className="w-full max-w-md">
        {/* Logo and App Name */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
            <img 
              src="/Real_Logo_V1.png.jpeg" 
              alt="Apna Invoice Logo" 
              className="w-full h-full object-contain"
            />
          </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Apna Invoice
          </h1>
        </div>

        {/* Welcome Text - Centered */}
        <div className="text-center mb-8">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.login.title')}
          </h2>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Success Message */}
            {successMessage && messageType === 'success' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-700 dark:text-green-400 text-sm">{successMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('auth.login.mobileNumber') || 'Mobile Number'}
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (!sent) setError('');
                  // reset verification state when phone changes
                  setVerified(false);
                  setSent(false);
                  setPendingToken('');
                  sessionStorage.removeItem('pending_token');
                  sessionStorage.removeItem('pending_masked_phone');
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={t('auth.login.mobileNumber') || 'e.g. +919876543210'}
                required
              />
            </div>

            {!sent && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md disabled:opacity-50"
                >
                  {loading ? t('auth.login.loading') : t('auth.login.sendOtp')}
                </button>
              </div>
            )}

            {sent && (
              <>
                <p className="text-sm text-gray-600">OTP sent to {sessionStorage.getItem('pending_masked_phone') || ''}</p>
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('otp.title')}</label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder={t('otp.placeholder')}
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={loading || otp.trim().length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                    >
                      {loading ? t('auth.login.loading') : t('otp.verify')}
                    </button>

                    <button
                      type="submit"
                      disabled={!verified || loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
                    >
                      {t('auth.login.loginButton')}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={async ()=>{
                      setLoading(true); setError('');
                      try{
                        const res = await fetch(`${API_URL}/auth/resend-otp`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pendingToken: sessionStorage.getItem('pending_token') })});
                        const d = await res.json(); if(!res.ok) setError(d.message||'Resend failed');
                      }catch(e:any){ setError(e.message||'Resend failed'); }
                      setLoading(false);
                    }}
                    className="text-sm text-blue-600"
                  >
                    {t('otp.resend')}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('auth.login.noAccount')}{' '}
              <Link
                to="/signup"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold transition-colors"
              >
                {t('auth.login.signupLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
