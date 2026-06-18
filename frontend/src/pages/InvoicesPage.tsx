import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import TabbedRightPane from '../components/invoices/TabbedRightPane';

const InvoicesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto">
      {/* Header with Role Indicator and Settings Button */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0 rounded-t-xl shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('dashboard.invoiceCreator')}
          </h1>
        </div>
      </div>

      {/* Centered Content */}
      <div className="bg-white dark:bg-gray-800 border-l border-r border-b border-gray-200 dark:border-gray-700 rounded-b-xl shadow-sm">
        <TabbedRightPane />
      </div>
    </div>
  );
};

export default InvoicesPage;
