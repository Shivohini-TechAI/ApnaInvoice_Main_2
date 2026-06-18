import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LanguageSelectionPage from './pages/LanguageSelectionPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceSeedDefaultsPage from './pages/InvoiceSeedDefaultsPage';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import InvoiceRouteGuard from './components/invoices/InvoiceRouteGuard';

import { useAuth } from './hooks/useAuth';
import { useLanguage } from './hooks/useLanguage';

function AppContent() {
  const { user, loading } = useAuth();
  const { isLanguageSelected } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading application...</p>
        </div>
      </div>
    );
  }
  
  if (!isLanguageSelected) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<LanguageSelectionPage />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/admin/invoices" /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/admin/invoices" /> : <SignupPage />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/admin/invoices" /> : <ForgotPasswordPage />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/invoices" />} />
          <Route path="dashboard" element={<Navigate to="/admin/invoices" />} />

          <Route
            path="admin/invoices"
            element={
              <ProtectedRoute requiredRole={['admin', 'provider', 'user']}>
                <InvoicesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin/invoices/settings"
            element={
              <ProtectedRoute requiredRole={['admin']}>
                <InvoiceRouteGuard>
                  <InvoiceSeedDefaultsPage />
                </InvoiceRouteGuard>
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to={user ? '/admin/invoices' : '/login'} />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
          <Toaster position="top-right" richColors />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;