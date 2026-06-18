import { create } from 'zustand';
import { generateInvoiceNumber, generateInvoiceNumberFromDB } from '../utils/invoiceNumberGenerator';
import { autosaveDraft, loadDraft, clearDraft } from '../services/invoiceDataService';
import { calculateInvoiceTotals, InvoiceCalculations } from '../utils/invoiceMath';
import { loadActivePreset, type InvoiceSeedDefaultsConfig } from '../services/invoiceSeedDefaultsService';
import { saveInvoice, type SaveInvoiceResult } from '../services/invoiceSaveService';

export interface LineItem {
  id: string;
  name: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface BillFrom {
  company: string;
  email: string;
  phone: string;
  address: string;
}

export interface BillTo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface InvoiceState {
  invoiceId?: string;
  number: string;
  issueDate: string;
  dueDate: string;
  currency: 'INR' | 'USD' | 'AED';
  billFrom: BillFrom;
  billTo: BillTo;
  lineItems: LineItem[];
  taxRate: number;
  discountType?: 'flat' | 'percent';
  discountValue: number;
  includeNotes: boolean;
  notes: string;
  includeTerms: boolean;
  terms: string;
  includeSignature: boolean;
  signatureUrl: string;
}

interface InvoiceStore extends InvoiceState {
  updateField: <K extends keyof InvoiceState>(field: K, value: InvoiceState[K]) => void;
  updateBillFrom: <K extends keyof BillFrom>(field: K, value: BillFrom[K]) => void;
  updateBillTo: <K extends keyof BillTo>(field: K, value: BillTo[K]) => void;
  addLineItem: () => void;
  removeLineItem: (id: string) => void;
  updateLineItem: (id: string, updates: Partial<LineItem>) => void;
  reorderLineItems: (fromIndex: number, toIndex: number) => void;
  reset: () => void;
  resetToNew: (userId?: string) => Promise<void>;
  duplicate: () => void;
  loadFromDraft: () => void;
  loadInvoice: (invoice: any) => void;
  getCalculations: () => InvoiceCalculations;
  applySeedDefaults: (defaults: InvoiceSeedDefaultsConfig) => void;
  saveToDB: (userId: string) => Promise<SaveInvoiceResult>;
}

function getInitialState(defaults?: InvoiceSeedDefaultsConfig, invoiceNumber?: string): InvoiceState {
  const today = new Date();
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    number: invoiceNumber || generateInvoiceNumber(today.toISOString()),
    issueDate: today.toISOString().split('T')[0],
    dueDate: sevenDaysLater.toISOString().split('T')[0],
    currency: defaults?.defaultCurrency || 'INR',
    billFrom: defaults?.defaultBillFrom || {
      company: 'Apna Invoice',
      email: '',
      phone: '',
      address: '',
    },
    billTo: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    lineItems: Array.from({ length: 10 }, (_, index) => ({
      id: `${Date.now()}-${index}`,
      name: '',
      description: '',
      qty: 1,
      unitPrice: 0,
    })),
    taxRate: defaults?.defaultTaxRate ?? 6,
    discountType: defaults?.defaultDiscountType,
    discountValue: defaults?.defaultDiscountValue ?? 0,
    includeNotes: defaults?.includeNotesByDefault ?? false,
    notes: defaults?.defaultNotes || '',
    includeTerms: defaults?.includeTermsByDefault ?? false,
    terms: defaults?.defaultTerms || '',
    includeSignature: defaults?.includeSignatureByDefault ?? false,
    signatureUrl: '',
  };
}

const initialState = getInitialState();

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  ...initialState,

  updateField: (field, value) => {
    set({ [field]: value });
    autosaveDraft(get());
  },

  updateBillFrom: (field, value) => {
    set((state) => ({
      billFrom: { ...state.billFrom, [field]: value },
    }));
    autosaveDraft(get());
  },

  updateBillTo: (field, value) => {
    set((state) => ({
      billTo: { ...state.billTo, [field]: value },
    }));
    autosaveDraft(get());
  },

  addLineItem: () => {
    set((state) => ({
      lineItems: [
        ...state.lineItems,
        {
          id: Date.now().toString(),
          name: '',
          description: '',
          qty: 1,
          unitPrice: 0,
        },
      ],
    }));
    autosaveDraft(get());
  },

  removeLineItem: (id) => {
    set((state) => ({
      lineItems: state.lineItems.filter((item) => item.id !== id),
    }));
    autosaveDraft(get());
  },

  updateLineItem: (id, updates) => {
    set((state) => ({
      lineItems: state.lineItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
    autosaveDraft(get());
  },

  reorderLineItems: (fromIndex, toIndex) => {
    set((state) => {
      const items = [...state.lineItems];
      const [removed] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, removed);
      return { lineItems: items };
    });
    autosaveDraft(get());
  },

  reset: () => set(initialState),

  resetToNew: async (userId?: string) => {
  let defaults: InvoiceSeedDefaultsConfig | undefined;

  if (userId) {
    try {
      defaults = await loadActivePreset(userId);
    } catch (error) {
      console.error('Failed to load seed defaults:', error);
    }
  }

  let invoiceNumber: string | undefined;

  try {
    invoiceNumber = await generateInvoiceNumberFromDB();
  } catch (error) {
    console.error('Failed to generate invoice number from DB:', error);
  }

  const currentState = get();

  const savedSignatureUrl = currentState.signatureUrl;
  const savedIncludeSignature = currentState.includeSignature;

  const newState = getInitialState(defaults, invoiceNumber);

  set({
    ...newState,
    invoiceId: undefined,

    // Preserve signature
    signatureUrl: savedSignatureUrl,
    includeSignature: savedIncludeSignature,
  });

  clearDraft();
},

  applySeedDefaults: (defaults: InvoiceSeedDefaultsConfig) => {
    set((state) => ({
      currency: defaults.defaultCurrency,
      billFrom: defaults.defaultBillFrom,
      taxRate: defaults.defaultTaxRate,
      discountType: defaults.defaultDiscountType,
      discountValue: defaults.defaultDiscountValue ?? 0,
      includeNotes: defaults.includeNotesByDefault,
      notes: defaults.defaultNotes,
      includeTerms: defaults.includeTermsByDefault,
      terms: defaults.defaultTerms,
      includeSignature: defaults.includeSignatureByDefault,
    }));
    autosaveDraft(get());
  },

  duplicate: () => {
    const currentState = get();
    const today = new Date();
    const newNumber = generateInvoiceNumber(today.toISOString());

    set({
      ...currentState,
      invoiceId: undefined,
      number: newNumber,
      issueDate: today.toISOString().split('T')[0],
      dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    autosaveDraft(get());
  },

  loadFromDraft: () => {
    const draft = loadDraft();
    if (draft) {
      set(draft);
    }
  },

  loadInvoice: (invoice: any) => {
    set({
      invoiceId: invoice.id,
      number: invoice.number,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      currency: invoice.currency,
      billFrom: {
        company: invoice.bill_from_company,
        email: invoice.bill_from_email,
        phone: invoice.bill_from_phone,
        address: invoice.bill_from_address,
      },
      billTo: {
        name: invoice.bill_to_name,
        email: invoice.bill_to_email,
        phone: invoice.bill_to_phone,
        address: invoice.bill_to_address,
      },
      lineItems: invoice.lineItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unit_price,
      })),
      taxRate: invoice.tax_rate,
      discountType: invoice.discount_type,
      discountValue: invoice.discount_value,
      includeNotes: invoice.include_notes,
      notes: invoice.notes,
      includeTerms: invoice.include_terms,
      terms: invoice.terms,
      includeSignature: invoice.include_signature,
      signatureUrl: invoice.signature_url,
    });
    autosaveDraft(get());
  },

  getCalculations: () => {
    const state = get();
    return calculateInvoiceTotals(
      state.lineItems,
      state.taxRate,
      state.discountType,
      state.discountValue
    );
  },

  saveToDB: async (userId: string) => {
    const state = get();
    const result = await saveInvoice({ ...state }, userId);

    if (result.success && result.invoiceId) {
      set({ invoiceId: result.invoiceId });
    }

    return result;
  },
}));