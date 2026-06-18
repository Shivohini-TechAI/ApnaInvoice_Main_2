import React from 'react';
import { FileText } from 'lucide-react';

const InvoiceRoleIndicator: React.FC = () => {

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Invoice Manager
      </span>
    </div>
  );
};

export default InvoiceRoleIndicator;

