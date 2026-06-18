import type { InvoiceState } from '../store/invoiceStore';
import { calculateInvoiceTotals } from '../utils/invoiceMath';

export interface SaveInvoiceResult {
  invoiceId: string;
  success: boolean;
  error?: string;
}

import { API_URL } from '../utils/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function saveInvoice(
  invoiceState: InvoiceState & { invoiceId?: string },
  userId: string
): Promise<SaveInvoiceResult> {
  if (!userId) {
    return {
      invoiceId: '',
      success: false,
      error: 'User not authenticated',
    };
  }

  // Allow all authenticated users to create/edit invoices. Invoice role gating removed.

  try {
    const calculations = calculateInvoiceTotals(
      invoiceState.lineItems,
      Number(invoiceState.taxRate || 0),
      invoiceState.discountType,
      Number(invoiceState.discountValue || 0)
    );

    const isUpdate = !!invoiceState.invoiceId;

    if (isUpdate) {
      return await updateInvoice(invoiceState, userId, calculations);
    }

    return await createInvoice(invoiceState, userId, calculations);
  } catch (error) {
    console.error('Error saving invoice:', error);

    return {
      invoiceId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save invoice',
    };
  }
}

async function createInvoice(
  invoiceState: InvoiceState & { invoiceId?: string },
  userId: string,
  calculations: ReturnType<typeof calculateInvoiceTotals>
): Promise<SaveInvoiceResult> {
  const token = getToken();

  if (!token) {
    return {
      invoiceId: '',
      success: false,
      error: 'Authentication token missing. Please login again.',
    };
  }

  const invoiceData = {
    number: invoiceState.number,
    issue_date: invoiceState.issueDate,
    due_date: invoiceState.dueDate,
    currency: invoiceState.currency,

    bill_from_company: invoiceState.billFrom.company,
    bill_from_email: invoiceState.billFrom.email,
    bill_from_phone: invoiceState.billFrom.phone,
    bill_from_address: invoiceState.billFrom.address,

    bill_to_name: invoiceState.billTo.name,
    bill_to_email: invoiceState.billTo.email,
    bill_to_phone: invoiceState.billTo.phone,
    bill_to_address: invoiceState.billTo.address,

    tax_rate: Number(invoiceState.taxRate || 0),
    discount_type: invoiceState.discountType || 'flat',
    discount_value: Number(invoiceState.discountValue || 0),

    subtotal: Number(calculations.subtotal || 0),
    tax_amount: Number(calculations.taxAmount || 0),
    discount_amount: Number(calculations.discountAmount || 0),
    total_due: Number(calculations.totalDue || 0),

    include_notes: invoiceState.includeNotes,
    notes: invoiceState.notes,

    include_terms: invoiceState.includeTerms,
    terms: invoiceState.terms,

    include_signature: invoiceState.includeSignature,
    signature_url: invoiceState.signatureUrl,

    created_by: userId,

    line_items: invoiceState.lineItems.map((item) => ({
      name: item.name,
      description: item.description,
      qty: Number(item.qty || 0),
      unit_price: Number(item.unitPrice || 0),
      line_total: Number(item.qty || 0) * Number(item.unitPrice || 0),
    })),
  };

  const response = await fetch(`${API_URL}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(invoiceData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to create invoice');
  }

  if (!data.invoice?.id) {
    throw new Error('Failed to create invoice');
  }

  return {
    invoiceId: data.invoice.id,
    success: true,
  };
}

async function updateInvoice(
  invoiceState: InvoiceState & { invoiceId?: string },
  userId: string,
  calculations: ReturnType<typeof calculateInvoiceTotals>
): Promise<SaveInvoiceResult> {
  const token = getToken();

  if (!token) {
    return {
      invoiceId: '',
      success: false,
      error: 'Authentication token missing. Please login again.',
    };
  }

  const invoiceId = invoiceState.invoiceId!;

  const invoiceData = {
    number: invoiceState.number,
    issue_date: invoiceState.issueDate,
    due_date: invoiceState.dueDate,
    currency: invoiceState.currency,

    bill_from_company: invoiceState.billFrom.company,
    bill_from_email: invoiceState.billFrom.email,
    bill_from_phone: invoiceState.billFrom.phone,
    bill_from_address: invoiceState.billFrom.address,

    bill_to_name: invoiceState.billTo.name,
    bill_to_email: invoiceState.billTo.email,
    bill_to_phone: invoiceState.billTo.phone,
    bill_to_address: invoiceState.billTo.address,

    tax_rate: Number(invoiceState.taxRate || 0),
    discount_type: invoiceState.discountType || 'flat',
    discount_value: Number(invoiceState.discountValue || 0),

    subtotal: Number(calculations.subtotal || 0),
    tax_amount: Number(calculations.taxAmount || 0),
    discount_amount: Number(calculations.discountAmount || 0),
    total_due: Number(calculations.totalDue || 0),

    include_notes: invoiceState.includeNotes,
    notes: invoiceState.notes,

    include_terms: invoiceState.includeTerms,
    terms: invoiceState.terms,

    include_signature: invoiceState.includeSignature,
    signature_url: invoiceState.signatureUrl,

    created_by: userId,

    line_items: invoiceState.lineItems.map((item) => ({
      name: item.name,
      description: item.description,
      qty: Number(item.qty || 0),
      unit_price: Number(item.unitPrice || 0),
      line_total: Number(item.qty || 0) * Number(item.unitPrice || 0),
    })),
  };

  const response = await fetch(`${API_URL}/invoices/${invoiceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(invoiceData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to update invoice');
  }

  return {
    invoiceId,
    success: true,
  };
}