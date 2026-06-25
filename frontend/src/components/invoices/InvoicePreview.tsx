import { API_URL } from '../../utils/api';
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Save, Download, RotateCcw, Upload, Edit, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useInvoiceStore } from '../../store/invoiceStore';
import { formatCurrency } from '../../utils/currencyFormatter';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { useAuth } from '../../hooks/useAuth';
import dayjs from 'dayjs';
import { fetchUserInvoices } from '../../services/invoiceListService';

interface InvoicePreviewProps {
  onSaved?: () => void;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ onSaved }) => {
  const { t } = useTranslation();
  const store = useInvoiceStore();
  const calculations = store.getCalculations();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [previousInvoices, setPreviousInvoices] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  useEffect(() => {
    const loadPreviousInvoices = async () => {
      try {
        if (!user) return;
        const invoices = await fetchUserInvoices(user.id, user.email, user.role);
        setPreviousInvoices(invoices);
      } catch (err) {
        console.error('Failed to load invoice history:', err);
      }
    };
    loadPreviousInvoices();
  }, [user]);

  useEffect(() => {
    const loadSignature = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/signature`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success && data.signature_url) {
          store.updateField('signatureUrl', data.signature_url);
          store.updateField('includeSignature', true);
        }
      } catch (error) {
        console.error('Failed to load signature:', error);
      }
    };
    if (user?.id) {
      loadSignature();
    }
  }, [user]);

  const editableClass =
    'w-full bg-transparent border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 outline-none';

  const formatDate = (dateString: string) => {
    return dateString ? dayjs(dateString).format('DD/MM/YYYY') : '';
  };

  const formatAmount = (amount: number) => {
    return formatCurrency(Number(amount || 0), store.currency, { showSymbol: false });
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setIsUploadingSignature(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadData.success) {
        throw new Error('Upload failed');
      }
      const uploadedUrl = uploadData.file.url;
      const saveResponse = await fetch(`${API_URL}/auth/signature`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signature_url: uploadedUrl }),
      });
      const saveData = await saveResponse.json();
      if (!saveData.success) {
        throw new Error('Save failed');
      }
      store.updateField('signatureUrl', uploadedUrl);
      store.updateField('includeSignature', true);
      toast.success('Signature saved successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload signature');
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (!user) {
      toast.error(t('common.error'), { id: 'save-invoice' });
      return;
    }
    if (!store.billTo.name || store.lineItems.length === 0) {
      toast.error(t('common.error'), { id: 'save-invoice' });
      return;
    }
    setIsSaving(true);
    try {
      toast.loading(t('common.loading'), { id: 'save-invoice' });
      const result = await store.saveToDB(user.id);
      if (result.success) {
        toast.success(t('common.success'), { id: 'save-invoice' });
        setIsEditing(false);
        const currentSignature = store.signatureUrl;
        await store.resetToNew(user.id);
        if (currentSignature) {
          store.updateField('signatureUrl', currentSignature);
          store.updateField('includeSignature', true);
        }
        if (onSaved) {
          onSaved();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(result.error || t('common.error'), { id: 'save-invoice' });
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(t('common.error'), { id: 'save-invoice' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      toast.loading(t('common.loading'), { id: 'download-pdf' });
      await generateInvoicePDF({
        invoiceId: '',
        invoiceNumber: store.number,
        clientName: store.billTo?.name || 'user',
        currency: store.currency,
      });
      toast.success(t('common.success'), { id: 'download-pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('common.error'), { id: 'download-pdf' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const phone = store.billTo.phone || '';
      const digits = phone.replace(/\D/g, '');
      const whatsappNumber = digits.length === 10 ? `91${digits}` : digits;
      const message = `Hello ${store.billTo.name},\n\nInvoice ${store.number} has been generated.\n\nAmount Due: ${formatAmount(calculations.totalDue)}\n\nPlease find the invoice attached.`;
      const whatsappUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error(error);
      toast.error('Failed to open WhatsApp');
    }
  };

  const handleNewInvoice = async () => {
    if (window.confirm(t('invoices.newInvoice'))) {
      await store.resetToNew(user?.id);
      setIsEditing(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

      const handleDeleteSignature = async () => {
  try {
    const token = localStorage.getItem('token');
    const currentSignatureUrl = store.signatureUrl;

    if (currentSignatureUrl) {
      await fetch(`${API_URL}/upload/delete`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: currentSignatureUrl,
        }),
      });
    }

    await fetch(`${API_URL}/auth/signature`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signature_url: null }),
    });

    store.updateField('signatureUrl', '');
    store.updateField('includeSignature', false);
    toast.success('Signature deleted');
  } catch (error) {
    console.error('Delete signature error:', error);
    toast.error('Delete failed');
  }
};

  return (
    <div className="h-full overflow-y-auto bg-gray-100 dark:bg-gray-900">
      <div className="p-8">
        <div
          ref={invoiceRef}
          id="invoice-preview"
          className="relative max-w-7xl mx-auto bg-white shadow-2xl w-full min-h-[297mm]"
        >
          <button
            type="button"
            data-html2canvas-ignore="true"
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 z-20 inline-flex items-center space-x-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium shadow"
          >
            <Edit className="h-4 w-4" />
            <span>{t('common.edit')}</span>
          </button>

          <div className="px-12 py-8 flex items-center justify-between bg-[#0B2D5B]">
            <div className="flex-shrink-0">
              <h1 className="leading-none mb-4 text-[#F2C01A] text-[48px] font-bold tracking-[0.05em]">
                INVOICE
              </h1>
              <div className="space-y-2 text-white text-sm">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300 w-24">Invoice #:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={store.number}
                      onChange={(e) => store.updateField('number', e.target.value)}
                      title="Invoice number"
                      aria-label="Invoice number"
                      className={`${editableClass} font-semibold text-white`}
                    />
                  ) : (
                    <span className="font-semibold">{store.number}</span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-gray-300 w-24">Due Date:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={store.dueDate}
                      onChange={(e) => store.updateField('dueDate', e.target.value)}
                      title="Due date"
                      aria-label="Due date"
                      className={`${editableClass} font-semibold text-white`}
                    />
                  ) : (
                    <span className="font-semibold">{formatDate(store.dueDate)}</span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-gray-300 w-24">Invoice Date:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={store.issueDate}
                      onChange={(e) => store.updateField('issueDate', e.target.value)}
                      title="Invoice date"
                      aria-label="Invoice date"
                      className={`${editableClass} font-semibold text-white`}
                    />
                  ) : (
                    <span className="font-semibold">{formatDate(store.issueDate)}</span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-gray-300 w-24">Currency:</span>
                  {isEditing ? (
                    <select
                      value={store.currency}
                      onChange={(e) =>
                        store.updateField('currency', e.target.value as 'INR' | 'USD' | 'AED')
                      }
                      title="Select currency"
                      aria-label="Currency"
                      className="bg-[#0B2D5B] border border-gray-400 rounded px-2 py-1 text-white font-semibold"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                    </select>
                  ) : (
                    <span className="font-semibold">{store.currency}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-start justify-end">
              <img
                src={`${window.location.origin}/Logo_withoutBG.png.jpeg`}
                alt="Apna Invoice"
                className="h-16 w-auto invoice-preview-image"
                crossOrigin="anonymous"
              />
            </div>
          </div>

          <div className="bg-[#6FE9E8] h-[8px]" />

          <div className="px-8 py-4 grid grid-cols-2 gap-12">
            <div>
              <h3 className="mb-3 uppercase text-[#0B2D5B] text-[14px] font-bold tracking-[0.05em]">
                Bill To:
              </h3>
              <div className="space-y-2 text-sm text-[#101828]">
                {isEditing ? (
                  <>
                    <select
                      value=""
                      className={`${editableClass} font-semibold text-base`}
                      onChange={(e) => {
                        const selectedInvoice = previousInvoices.find(
                          (inv) => inv.id === e.target.value
                        );
                        if (selectedInvoice) {
                          store.updateBillTo('name', selectedInvoice.bill_to_name || '');
                          store.updateBillTo('email', selectedInvoice.bill_to_email || '');
                          store.updateBillTo('phone', selectedInvoice.bill_to_phone || '');
                          store.updateBillTo('address', selectedInvoice.bill_to_address || '');
                        }
                      }}
                    >
                      <option value="">Select Existing User</option>
                      {previousInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.bill_to_name} - {invoice.number}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={store.billTo.name}
                      onChange={(e) => store.updateBillTo('name', e.target.value)}
                      placeholder="Client Name"
                      title="Client Name"
                      aria-label="Client Name"
                      className={`${editableClass} font-semibold text-base`}
                    />

                    <textarea
                      value={store.billTo.address}
                      onChange={(e) => store.updateBillTo('address', e.target.value)}
                      placeholder="Address"
                      title="Client address"
                      aria-label="Client address"
                      rows={2}
                      className={`${editableClass} text-gray-600 resize-none`}
                    />

                    <input
                      type="email"
                      value={store.billTo.email}
                      onChange={(e) => store.updateBillTo('email', e.target.value)}
                      placeholder="Email"
                      title="Client email"
                      aria-label="Client email"
                      className={`${editableClass} text-gray-600`}
                    />

                    <input
                      type="text"
                      value={store.billTo.phone}
                      onChange={(e) => store.updateBillTo('phone', e.target.value)}
                      placeholder="Phone"
                      title="Client phone"
                      aria-label="Client phone"
                      className={`${editableClass} text-gray-600`}
                    />
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-base">{store.billTo.name || 'User Name'}</p>
                    {store.billTo.address && (
                      <p className="text-gray-600 whitespace-pre-line">{store.billTo.address}</p>
                    )}
                    {store.billTo.email && (
                      <p className="text-gray-600">{store.billTo.email}</p>
                    )}
                    {store.billTo.phone && (
                      <p className="text-gray-600">{store.billTo.phone}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 uppercase text-[#0B2D5B] text-[14px] font-bold tracking-[0.05em]">
                Bill From:
              </h3>
              <div className="space-y-2 text-sm text-[#101828]">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={store.billFrom.company}
                      onChange={(e) => store.updateBillFrom('company', e.target.value)}
                      placeholder="Company Name"
                      title="Company name"
                      aria-label="Company name"
                      className={`${editableClass} font-semibold text-base text-[#101828]`}
                    />

                    <textarea
                      value={store.billFrom.address}
                      onChange={(e) => store.updateBillFrom('address', e.target.value)}
                      placeholder="Address"
                      title="Company address"
                      aria-label="Company address"
                      rows={2}
                      className={`${editableClass} text-gray-600 resize-none`}
                    />

                    <input
                      type="email"
                      value={store.billFrom.email}
                      onChange={(e) => store.updateBillFrom('email', e.target.value)}
                      placeholder="Email"
                      title="Company email"
                      aria-label="Company email"
                      className={`${editableClass} text-gray-600`}
                    />

                    <input
                      type="text"
                      value={store.billFrom.phone}
                      onChange={(e) => store.updateBillFrom('phone', e.target.value)}
                      placeholder="Phone"
                      title="Company phone"
                      aria-label="Company phone"
                      className={`${editableClass} text-gray-600`}
                    />
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-base">
                      {store.billFrom.company || 'Apna Invoice'}
                    </p>
                    {store.billFrom.address && (
                      <p className="text-gray-600 whitespace-pre-line">{store.billFrom.address}</p>
                    )}
                    {store.billFrom.email && (
                      <p className="text-gray-600">{store.billFrom.email}</p>
                    )}
                    {store.billFrom.phone && (
                      <p className="text-gray-600">{store.billFrom.phone}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="px-12 pb-8">
            <table className="w-full border-collapse border border-[#E5E7EB]">
              <thead>
                <tr className="bg-[#0B2D5B]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border border-gray-300 w-[25%]">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border border-gray-300 w-[35%]">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider border border-gray-300 w-[13%]">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider border border-gray-300 w-[12%]">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider border border-gray-300 w-[15%]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {store.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-2 py-2 text-sm border border-gray-300 text-[#101828]">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            store.updateLineItem(item.id, { name: e.target.value })
                          }
                          placeholder="Item name"
                          className={`${editableClass} text-[#101828]`}
                        />
                      ) : (
                        item.name || '-'
                      )}
                    </td>

                    <td className="px-2 py-2 text-sm text-gray-600 border border-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            store.updateLineItem(item.id, { description: e.target.value })
                          }
                          placeholder="Description"
                          className={`${editableClass} text-gray-600`}
                        />
                      ) : (
                        item.description || '-'
                      )}
                    </td>

                    <td className="px-2 py-2 text-sm text-right border border-gray-300 text-[#101828]">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            store.updateLineItem(item.id, {
                              unitPrice: Number(e.target.value || 0),
                            })
                          }
                          title="Unit price"
                          aria-label="Unit price"
                          className={`${editableClass} text-right text-[#101828]`}
                        />
                      ) : (
                        formatAmount(item.unitPrice)
                      )}
                    </td>

                    <td className="px-2 py-2 text-sm text-right border border-gray-300 text-[#101828]">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) =>
                            store.updateLineItem(item.id, {
                              qty: Number(e.target.value || 1),
                            })
                          }
                          title="Quantity"
                          aria-label="Quantity"
                          className={`${editableClass} text-right text-[#101828]`}
                        />
                      ) : (
                        item.qty
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold text-right border border-gray-300 text-[#101828]">
                      {formatAmount(item.qty * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isEditing && (
              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => store.addLineItem()}
                  className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>

                {store.lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      store.removeLineItem(store.lineItems[store.lineItems.length - 1].id)
                    }
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Remove Last</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <div className="border-2 border-[#0B2D5B] w-[320px]">
                <div className="flex justify-between px-4 py-2 border-b border-[#E5E7EB]">
                  <span className="text-sm font-medium text-[#101828]">Subtotal:</span>
                  <span className="text-sm font-semibold text-[#101828]">
                    {formatAmount(calculations.subtotal)}
                  </span>
                </div>

                {isEditing ? (
                  <div className="flex justify-between items-center px-4 py-2 border-b border-[#E5E7EB]">
                    <span className="text-sm font-medium text-[#101828]">Tax:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={store.taxRate}
                        onChange={(e) =>
                          store.updateField('taxRate', Number(e.target.value || 0))
                        }
                        title="Tax percentage"
                        aria-label="Tax percentage"
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-sm outline-none focus:border-blue-500"
                      />
                      <span className="text-sm text-[#101828]">%</span>
                    </div>
                  </div>
                ) : (
                  store.taxRate > 0 && (
                    <div className="flex justify-between px-4 py-2 border-b border-[#E5E7EB]">
                      <span className="text-sm font-medium text-[#101828]">
                        Tax ({Number(store.taxRate || 0).toFixed(2)}%):
                      </span>
                      <span className="text-sm font-semibold text-[#101828]">
                        {formatAmount(calculations.taxAmount)}
                      </span>
                    </div>
                  )
                )}

                <div className="flex justify-between px-4 py-3 bg-[#0B2D5B]">
                  <span className="text-base font-bold text-[#F2C01A]">Amount Due:</span>
                  <span className="text-base font-bold text-white">
                    {store.currency} {formatAmount(calculations.totalDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {store.includeSignature && store.signatureUrl && (
            <div className="px-12 py-8 border-t border-[#E5E7EB]">
              <div className="flex justify-end">
                <div className="flex flex-col items-end w-[320px]">
                  <img
                    src={store.signatureUrl}
                    alt="Signature"
                    className="h-20 object-contain mb-2"
                  />
                  <div className="border-t-2 border-gray-800 w-full mb-1" />
                  <p className="text-sm text-gray-600">Authorized Signature</p>
                </div>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="px-12 py-6 border-t border-[#E5E7EB] flex justify-end items-center gap-3">
              <label className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-200">
                <Upload className="h-4 w-4" />
                <span>{isUploadingSignature ? 'Uploading...' : 'Upload Signature'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />
              </label>

              {store.signatureUrl && (
                <button
                  type="button"
                  onClick={handleDeleteSignature}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  Delete Signature
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-center bg-[#0B2D5B] h-[40px]">
            <p className="text-white text-sm">Thank you for your business!</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={handleSaveInvoice}
            disabled={isSaving}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? t('invoices.saving') : t('invoices.saveInvoice')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
          >
            <Download className="h-4 w-4" />
            <span>{isDownloading ? t('invoices.downloadingPDF') : t('invoices.downloadPDF')}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Share WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleNewInvoice}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t('invoices.newInvoice')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;