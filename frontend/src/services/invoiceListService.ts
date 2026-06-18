export interface InvoiceListItem {
  id: string;
  number: string;
  bill_to_name: string;
  issue_date: string;
  due_date: string;
  currency: string;
  total_due: number;
  created_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  name: string;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface FullInvoice {
  id: string;
  number: string;
  issue_date: string;
  due_date: string;
  currency: 'INR' | 'USD' | 'AED';
  bill_from_company: string;
  bill_from_email: string;
  bill_from_phone: string;
  bill_from_address: string;
  bill_to_name: string;
  bill_to_email: string;
  bill_to_phone: string;
  bill_to_address: string;
  tax_rate: number;
  discount_type?: 'flat' | 'percent';
  discount_value: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_due: number;
  include_notes: boolean;
  notes: string;
  include_terms: boolean;
  terms: string;
  include_signature: boolean;
  signature_url: string;
  created_by: string;
  created_at: string;
  lineItems: InvoiceLineItem[];
}

import { API_URL } from '../utils/api';

function getToken() {
  return localStorage.getItem("token");
}

export async function deleteInvoiceById(invoiceId: string): Promise<void> {
  const token = getToken();

  const response = await fetch(`${API_URL}/invoices/${invoiceId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete invoice');
  }
}

export async function fetchUserInvoices(
  userId: string,
  userEmail?: string,
  userRole?: string
): Promise<InvoiceListItem[]> {
  const token = getToken();

  const response = await fetch(`${API_URL}/invoices`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch invoices");
  }

  return data.invoices || [];
}

export async function fetchInvoiceById(
  invoiceId: string,
  userId: string,
  userEmail?: string,
  userRole?: string
): Promise<FullInvoice> {
  const token = getToken();

  const response = await fetch(`${API_URL}/invoices/${invoiceId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch invoice");
  }

  const invoice = data.invoice;

return {
  id: invoice.id,
  number: invoice.number,
  issue_date: invoice.issue_date,
  due_date: invoice.due_date,
  currency: invoice.currency,
  bill_from_company: invoice.bill_from_company || '',
  bill_from_email: invoice.bill_from_email || '',
  bill_from_phone: invoice.bill_from_phone || '',
  bill_from_address: invoice.bill_from_address || '',
  bill_to_name: invoice.bill_to_name || '',
  bill_to_email: invoice.bill_to_email || '',
  bill_to_phone: invoice.bill_to_phone || '',
  bill_to_address: invoice.bill_to_address || '',
  tax_rate: Number(invoice.tax_rate || 0),
  discount_type: invoice.discount_type,
  discount_value: Number(invoice.discount_value || 0),
  subtotal: Number(invoice.subtotal || 0),
  tax_amount: Number(invoice.tax_amount || 0),
  discount_amount: Number(invoice.discount_amount || 0),
  total_due: Number(invoice.total_due || 0),
  include_notes: Boolean(invoice.include_notes),
  notes: invoice.notes || '',
  include_terms: Boolean(invoice.include_terms),
  terms: invoice.terms || '',
  include_signature: Boolean(invoice.include_signature),
  signature_url: invoice.signature_url || '',
  created_by: invoice.created_by,
  created_at: invoice.created_at,
  lineItems: (invoice.line_items || []).map((item: any) => ({
    id: item.id,
    invoice_id: item.invoice_id,
    name: item.name,
    description: item.description || '',
    qty: Number(item.qty || 0),
    unit_price: Number(item.unit_price || 0),
    line_total: Number(item.line_total || 0),
  })),
};
}