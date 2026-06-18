import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';

const LanguageSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setLanguage } = useLanguage();

  const handleLanguageSelect = (lang: string) => {
    console.log('Language selected:', lang);
    try {
      setLanguage(lang);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and App Name */}
        <div className="text-center mb-12">
          <div className="mx-auto w-24 h-24 rounded-2xl flex items-center justify-center mb-6 overflow-hidden bg-white dark:bg-gray-800 shadow-lg">
            <img
              src="/Real_Logo_V1.png.jpeg"
              alt="Apna Invoice Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Apna Invoice
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('languageSelection.description')}
          </p>
        </div>

        {/* Language Selection Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('languageSelection.title')}
            </h2>
          </div>

          <div className="space-y-4">
            {/* English Button */}
            <button
              onClick={() => handleLanguageSelect('en')}
              className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 border-2 border-purple-500 bg-purple-500 text-white hover:bg-purple-600 hover:border-purple-600 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              🇺🇸 {t('languageSelection.english')}
            </button>

            {/* Hindi Button */}
            <button
              onClick={() => handleLanguageSelect('hi')}
              className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 border-2 border-blue-500 bg-blue-500 text-white hover:bg-blue-600 hover:border-blue-600 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              🇮🇳 {t('languageSelection.hindi')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2026 Apna Invoice. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectionPage;
