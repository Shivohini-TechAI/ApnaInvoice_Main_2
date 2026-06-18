import { InvoiceState } from '../store/invoiceStore';

const DRAFT_KEY = 'shivohini-hub:invoiceDraft';
const AUTOSAVE_DELAY = 1000;

let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveDraft(draft: InvoiceState): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save invoice draft:', error);
  }
}

export function loadDraft(): InvoiceState | null {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load invoice draft:', error);
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.error('Failed to clear invoice draft:', error);
  }
}

export function autosaveDraft(draft: InvoiceState): void {
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
  }

  autosaveTimeout = setTimeout(() => {
    saveDraft(draft);
  }, AUTOSAVE_DELAY);
}

export function hasDraft(): boolean {
  try {
    return localStorage.getItem(DRAFT_KEY) !== null;
  } catch {
    return false;
  }
}
