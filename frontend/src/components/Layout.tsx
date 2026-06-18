import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LogOut,
  Bell,
  User,
  Sun,
  Moon,
  Edit,
  Receipt,
  Settings,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';

import EditProfileModal from './EditProfileModal';
import NotificationPanel from './NotificationPanel';

const Layout: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { label: t('dashboard.invoices'), path: '/admin/invoices', icon: Receipt },
    { label: t('dashboard.invoiceSettings'), path: '/admin/invoices/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout()
      .then(() => navigate('/login'))
      .catch(() => navigate('/login'));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <div className="flex min-h-screen">
        {/* Sidebar Desktop + Bottom Nav Mobile */}
        <aside className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-800/95 border-t border-gray-200 dark:border-gray-700 p-2 md:relative md:bottom-auto md:left-auto md:right-auto md:w-64 md:min-h-screen md:border-t-0 md:border-r md:p-4">
          <div className="hidden md:flex items-center space-x-3 mb-8">
            <img
              src="/Logo_withoutBG.png.jpeg"
              alt="Apna Invoice Logo"
              className="w-12 h-12 object-contain"
            />
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Apna Invoice
            </h1>
          </div>

          <nav className="flex md:block overflow-x-auto md:overflow-visible gap-2 md:space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`min-w-max md:w-full flex items-center justify-center md:justify-start space-x-2 md:space-x-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-left transition-colors ${
                    active
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs md:text-sm font-medium">{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={handleLogout}
              className="min-w-max md:w-full flex items-center justify-center md:justify-start space-x-2 md:space-x-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-xs md:text-sm font-medium">{t('dashboard.logout')}</span>
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-3 md:p-6 min-h-screen pb-24 md:pb-6 overflow-x-hidden">
          <div className="flex justify-end items-center gap-3 md:gap-4 mb-4 md:mb-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Toggle Theme"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-2 z-50 max-w-[90vw]">
                  <NotificationPanel onClose={() => setNotificationOpen(false)} />
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center"
                title="Profile"
              >
                <User className="h-4 w-4 text-white" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 max-w-[90vw] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-purple-500 capitalize mt-1">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowEditProfile(true);
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="text-sm">{t('dashboard.editProfile')}</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm">{t('dashboard.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>

      {showEditProfile && (
        <EditProfileModal onClose={() => setShowEditProfile(false)} />
      )}
    </div>
  );
};

export default Layout;