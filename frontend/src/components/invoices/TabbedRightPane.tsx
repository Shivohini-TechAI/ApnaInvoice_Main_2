import React, { useState } from 'react';
import { FileText, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import InvoicePreview from './InvoicePreview';
import InvoiceRecords from './InvoiceRecords';

interface TabbedRightPaneProps {
  refreshTrigger?: number;
}

const TabbedRightPane: React.FC<TabbedRightPaneProps> = ({ refreshTrigger }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'preview' | 'records'>('preview');

  const handleSwitchToPreview = () => {
    setActiveTab('preview');
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '600px' }}>
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1 p-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{t('invoices.preview')}</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'records'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <List className="h-4 w-4" />
            <span>{t('invoices.records')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'preview' ? (
  <div className="p-6">
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <InvoicePreview />
    </div>
  </div>
) : (
          <InvoiceRecords refreshTrigger={refreshTrigger} onSwitchToPreview={handleSwitchToPreview} />
        )}
      </div>
    </div>
  );
};

export default TabbedRightPane;
