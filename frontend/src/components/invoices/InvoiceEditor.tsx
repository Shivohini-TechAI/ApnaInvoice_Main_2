import { API_URL } from '../../utils/api';
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, RotateCcw, Copy, FileText, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useAuth } from '../../hooks/useAuth';
import { getCurrencySymbol, formatCurrency } from '../../utils/currencyFormatter';
import { fetchUserInvoices } from '../../services/invoiceListService';


interface InvoiceEditorProps {
  onSaved?: () => void;
}

const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ onSaved }) => {
  console.log("InvoiceEditor Rendered");
  const store = useInvoiceStore();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [previousInvoices, setPreviousInvoices] = useState<any[]>([]);

  // Signature state
  const [dbSignatureUrl, setDbSignatureUrl] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isDeletingSignature, setIsDeletingSignature] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Load draft
  useEffect(() => {
    store.loadFromDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load previous invoices
  useEffect(() => {
    const loadPreviousInvoices = async () => {
      try {
        if (!user) return;
        const invoices = await fetchUserInvoices(user.id, user.email, user.role);
        setPreviousInvoices(invoices);
      } catch (error) {
        console.error('Failed to load invoice history:', error);
      }
    };
    loadPreviousInvoices();
  }, [user]);

  // Fetch signature from DB on mount / user change
  useEffect(() => {
    const fetchSignature = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/signature`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (data.success && data.signature_url) {
          setDbSignatureUrl(data.signature_url);
          store.updateField('signatureUrl', data.signature_url);
          store.updateField('includeSignature', true);
        }
      } catch (error) {
        console.error('Failed to fetch signature:', error);
      }
    };
    fetchSignature();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("FILE UPLOAD TRIGGERED");
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSignature(true);
    try {
      // 1. Upload file to server
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      const uploadData = await uploadResponse.json();

      if (!uploadData.success) {
        toast.error('Failed to upload signature file.');
        return;
      }

      const uploadedUrl = uploadData.file.url;

      // 2. Save URL to user_profiles in DB
      const saveResponse = await fetch(`${API_URL}/auth/signature`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ signature_url: uploadedUrl }),
      });

      const saveData = await saveResponse.json();

      if (!saveData.success) {
        toast.error('Failed to save signature to account.');
        return;
      }

      // 3. Update local state and store
      setDbSignatureUrl(uploadedUrl);
      store.updateField('signatureUrl', uploadedUrl);
      store.updateField('includeSignature', true);
      toast.success('Signature saved to your account.');
    } catch (error) {
      console.error('Signature upload error:', error);
      toast.error('Failed to upload signature.');
    } finally {
      setIsUploadingSignature(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDeleteSignature = async () => {
    if (!window.confirm('Are you sure you want to delete your signature?')) return;

    setIsDeletingSignature(true);
    try {
      const token = localStorage.getItem('token');

      // Delete file from server if it's a server-hosted URL
      if (dbSignatureUrl) {
  await fetch(`${API_URL}/upload/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: dbSignatureUrl,
    }),
  });
}

      // Clear from DB
      const response = await fetch(`${API_URL}/auth/signature`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ signature_url: null }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error('Failed to delete signature.');
        return;
      }

      // Clear local state and store
      setDbSignatureUrl(null);
      store.updateField('signatureUrl', '');
      store.updateField('includeSignature', false);
      toast.success('Signature deleted.');
    } catch (error) {
      console.error('Delete signature error:', error);
      toast.error('Failed to delete signature.');
    } finally {
      setIsDeletingSignature(false);
    }
  };

  const handleResetToNew = () => {
    if (window.confirm('Are you sure you want to reset the invoice? All changes will be lost and a new invoice will be created.')) {
      store.resetToNew();
    }
  };

  const handleDuplicate = () => {
    if (window.confirm('Create a duplicate invoice with a new invoice number?')) {
      store.duplicate();
    }
  };

  const handleSaveInvoice = async () => {
    if (!user) {
      toast.error('You must be logged in to save invoices.', { id: 'save-invoice' });
      return;
    }

    if (!store.billTo.name || store.lineItems.length === 0) {
      toast.error('Please fill in client name and add at least one line item.', { id: 'save-invoice' });
      return;
    }

    setIsSaving(true);
    try {
      toast.loading('Saving invoice...', { id: 'save-invoice' });

      const result = await store.saveToDB(user.id);

      if (result.success) {
        toast.success('Invoice saved successfully.', { id: 'save-invoice' });
        await store.resetToNew(user.id);

        // Re-apply DB signature after reset so it persists
        if (dbSignatureUrl) {
          store.updateField('signatureUrl', dbSignatureUrl);
          store.updateField('includeSignature', true);
        }

        if (onSaved) onSaved();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(result.error || 'Failed to save invoice. Please try again.', { id: 'save-invoice' });
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice. Please try again.', { id: 'save-invoice' });
    } finally {
      setIsSaving(false);
    }
  };

  const calculations = store.getCalculations();

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-6 space-y-6">
        <div className="space-y-6">
          {/* Invoice Meta */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Invoice Details
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={store.number}
                  onChange={(e) => store.updateField('number', e.target.value)}
                  aria-label="Invoice Number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={store.issueDate}
                    onChange={(e) => store.updateField('issueDate', e.target.value)}
                    aria-label="Issue Date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={store.dueDate}
                    onChange={(e) => store.updateField('dueDate', e.target.value)}
                    aria-label="Due Date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <div className="flex space-x-2">
                  {(['INR', 'USD'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => store.updateField('currency', curr)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${store.currency === curr
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                      {getCurrencySymbol(curr)} {curr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bill From */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Bill From
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={store.billFrom.company}
                  onChange={(e) => store.updateBillFrom('company', e.target.value)}
                  aria-label="Company Name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={store.billFrom.email}
                  onChange={(e) => store.updateBillFrom('email', e.target.value)}
                  aria-label="Company Email"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={store.billFrom.phone}
                  onChange={(e) => store.updateBillFrom('phone', e.target.value)}
                  aria-label="Company Phone"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  value={store.billFrom.address}
                  onChange={(e) => store.updateBillFrom('address', e.target.value)}
                  aria-label="Company Address"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Bill To
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User Name
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-2"
                  onChange={(e) => {
                    const selectedUser = users.find((u) => u.id === e.target.value);
                    if (selectedUser) {
                      store.updateBillTo('name', selectedUser.name || '');
                      store.updateBillTo('email', selectedUser.email || '');
                      store.updateBillTo('phone', selectedUser.phone || '');
                    }
                  }}
                >
                  <option value="">Select Existing User</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={store.billTo.name}
                  onChange={(e) => store.updateBillTo('name', e.target.value)}
                  aria-label="Client Name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={store.billTo.email}
                  onChange={(e) => store.updateBillTo('email', e.target.value)}
                  aria-label="Client Email"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={store.billTo.phone}
                  onChange={(e) => store.updateBillTo('phone', e.target.value)}
                  aria-label="Client Phone"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  value={store.billTo.address}
                  onChange={(e) => store.updateBillTo('address', e.target.value)}
                  aria-label="Client Address"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Line Items
              </h3>
              <button
                type="button"
                onClick={() => store.addLineItem()}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="space-y-3">
              {store.lineItems.map((item, index) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-3 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Item {index + 1}
                    </span>
                    {store.lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => store.removeLineItem(item.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        aria-label={`Remove line item ${index + 1}`}
                        title={`Remove line item ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Item Name
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => store.updateLineItem(item.id, { name: e.target.value })}
                        aria-label={`Item ${index + 1} Name`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Description
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => store.updateLineItem(item.id, { description: e.target.value })}
                        rows={2}
                        aria-label={`Item ${index + 1} Description`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => store.updateLineItem(item.id, { qty: parseInt(e.target.value) || 1 })}
                          aria-label={`Item ${index + 1} Quantity`}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Unit Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => store.updateLineItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          aria-label={`Item ${index + 1} Unit Price`}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Total
                        </label>
                        <input
                          type="text"
                          value={(item.qty * item.unitPrice).toFixed(2)}
                          readOnly
                          aria-label={`Item ${index + 1} Total`}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Discount */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Tax & Discount
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={store.taxRate}
                  onChange={(e) => store.updateField('taxRate', parseFloat(e.target.value) || 0)}
                  aria-label="Tax Rate"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Type
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => store.updateField('discountType', undefined)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${!store.discountType
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => store.updateField('discountType', 'flat')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${store.discountType === 'flat'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => store.updateField('discountType', 'percent')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${store.discountType === 'percent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    Percent
                  </button>
                </div>
              </div>

              {store.discountType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Discount Value {store.discountType === 'percent' ? '(%)' : ''}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={store.discountValue}
                    onChange={(e) => store.updateField('discountValue', parseFloat(e.target.value) || 0)}
                    aria-label="Discount Value"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Notes
              </h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={store.includeNotes}
                  onChange={(e) => store.updateField('includeNotes', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include</span>
              </label>
            </div>

            {store.includeNotes && (
              <textarea
                value={store.notes}
                onChange={(e) => store.updateField('notes', e.target.value)}
                aria-label="Invoice Notes"
                rows={4}
                placeholder="Add any additional notes or instructions..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Terms & Conditions
              </h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={store.includeTerms}
                  onChange={(e) => store.updateField('includeTerms', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include</span>
              </label>
            </div>

            {store.includeTerms && (
              <textarea
                value={store.terms}
                onChange={(e) => store.updateField('terms', e.target.value)}
                aria-label="Invoice Terms"
                rows={4}
                placeholder="Add payment terms, conditions, and policies..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            )}
          </div>

          {/* Signature */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Signature TEST 123
              </h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={store.includeSignature}
                  onChange={(e) => store.updateField('includeSignature', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include</span>
              </label>
            </div>

            {/* Current signature from DB */}
            {dbSignatureUrl ? (
              <div className="space-y-3">
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current signature (saved to your account):</p>
                  <img src={dbSignatureUrl} alt="Saved Signature" className="h-16 object-contain" />
                </div>

                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded-lg text-sm cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                    {isUploadingSignature ? 'Uploading...' : 'Upload New'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploadingSignature}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleDeleteSignature}
                    disabled={isDeletingSignature}
                    className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                  >
                    {isDeletingSignature ? 'Deleting...' : 'Delete Signature'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">No signature saved. Upload one to attach it to all future invoices.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploadingSignature}
                  aria-label="Upload signature image"
                  className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
                {isUploadingSignature && (
                  <p className="text-xs text-blue-600 mt-1">Uploading and saving to your account...</p>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
              Invoice Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(calculations.subtotal, store.currency)}
                </span>
              </div>
              {store.discountType && store.discountValue > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Discount {store.discountType === 'percent' ? `(${store.discountValue}%)` : ''}:
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(calculations.discountAmount, store.currency)}
                  </span>
                </div>
              )}
              {store.taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax ({store.taxRate}%):</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(calculations.taxAmount, store.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                <span className="text-base font-bold text-gray-900 dark:text-gray-100">Total Due:</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(calculations.totalDue, store.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleSaveInvoice}
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Invoice'}</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDuplicate}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>Duplicate</span>
              </button>

              <button
                type="button"
                onClick={handleResetToNew}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>New</span>
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center flex items-center justify-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>Autosaved to browser storage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditor;