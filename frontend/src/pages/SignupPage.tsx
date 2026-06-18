import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../utils/api';

const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { t } = useTranslation();
  const [toast, setToast] = useState('');

  const sendOtp = async () => {
    if (!phone.trim()) return setError(t('auth.login.invalidEmail') || 'Enter phone');
    if (sent) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup-send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to send OTP');
        setLoading(false);
        return;
      }
      setPendingToken(data.pendingToken);
      sessionStorage.setItem('pending_token', data.pendingToken);
      sessionStorage.setItem('pending_masked_phone', data.maskedPhone || '');
      setSent(true);
      setToast(t('otp.sentToPhone', { phone: data.maskedPhone || phone }));
      setTimeout(() => setToast(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!sessionStorage.getItem('pending_token')) return setError(t('otp.noPending') || 'No pending request');
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pendingToken: sessionStorage.getItem('pending_token') }) });
      const d = await res.json();
      if (!res.ok) { setError(d.message || t('otp.resendFailed') || 'Resend failed'); return; }
      setToast(t('otp.resend') || 'OTP resent');
      setTimeout(() => setToast(''), 3000);
    } catch (e:any) { setError(e.message || 'Resend failed'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!otp.trim() || !(pendingToken || sessionStorage.getItem('pending_token'))) return setError(t('otp.placeholder') || 'Enter OTP');
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pendingToken: pendingToken || sessionStorage.getItem('pending_token'), otp: otp.trim() }) });
      const d = await res.json();
      if (!res.ok) { setError(d.message || t('auth.errors.unexpectedError') || 'Verification failed'); return; }
      if (d.token) {
        localStorage.setItem('token', d.token);
        localStorage.setItem('user', JSON.stringify(d.user || {}));
      }
      setVerified(true);
      setToast(t('otp.verify') || 'Phone verified');
      setTimeout(() => setToast(''), 3000);
    } catch (e:any) { setError(e.message || 'Verification failed'); }
    finally { setLoading(false); }
  };

  const createAccount = async () => {
    if (!verified) return setError(t('auth.login.pleaseSignup') || 'Please verify phone first');
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.message || t('auth.signup.signupFailed') || 'Create account failed');
        return;
      }
      setToast(t('auth.signup.signupSuccess') || 'Account created. Please login.');
      setTimeout(() => setToast(''), 2500);
      navigate('/login');
    } catch (e:any) { setError(e.message || 'Create account failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
            <img src="/Real_Logo_V1.png.jpeg" alt="Apna Invoice Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Apna Invoice</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('auth.signup.title')}</h2>
          </div>

          <div className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
              </div>
            )}
            {toast && (
              <div className="fixed right-4 top-4 z-50 bg-green-600 text-white px-4 py-2 rounded shadow">{toast}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('auth.signup.fullName')}</label>
              <input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900" placeholder={t('auth.signup.fullName') || 'Full name'} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('auth.signup.phoneNumber')}</label>
              <input type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900" placeholder={t('auth.signup.phonePlaceholder')} />
              <div className="mt-2 flex items-center justify-between">
                <button type="button" onClick={sendOtp} disabled={loading || !phone.trim() || sent} className="text-sm text-blue-600">{t('auth.login.sendOtp') || 'Verify'}</button>
                {sent && <button type="button" onClick={resendOtp} disabled={loading} className="text-sm text-blue-600">{t('otp.resend') || 'Resend OTP'}</button>}
              </div>
            </div>

            {sent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('otp.title')}</label>
                <input type="text" value={otp} onChange={(e)=>setOtp(e.target.value)} className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900" placeholder={t('otp.placeholder')} maxLength={6} />
                <div className="mt-3 flex items-center justify-between">
                  <button type="button" onClick={verifyOtp} disabled={loading || !otp.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">{t('otp.verify') || 'Verify OTP'}</button>
                  <button type="button" onClick={createAccount} disabled={!verified} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md disabled:opacity-50">{t('auth.signup.signupButton') || 'Create Account'}</button>
                </div>
              </div>
            )}

            <div className="pt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t('auth.signup.haveAccount')} <Link to="/login" className="text-purple-600 font-semibold">{t('auth.signup.loginLink')}</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;