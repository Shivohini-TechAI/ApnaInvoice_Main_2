import dayjs from 'dayjs';
import { API_URL } from './api';

const COUNTER_KEY = 'shivohini-hub:invoiceCounter';

export function getStoredCounter(): number {
  try {
    const stored = localStorage.getItem(COUNTER_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

export function setStoredCounter(value: number): void {
  try {
    localStorage.setItem(COUNTER_KEY, value.toString());
  } catch (error) {
    console.error('Failed to save invoice counter:', error);
  }
}

export function incrementCounter(): number {
  const current = getStoredCounter();
  const next = current + 1;
  setStoredCounter(next);
  return next;
}

export async function generateInvoiceNumberFromDB(): Promise<string> {
  const today = new Date();
  const yearMonth = dayjs(today).format('YYYYMM');

  try {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/invoices`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success && Array.isArray(data.invoices) && data.invoices.length > 0) {
      // Find the highest counter across ALL invoices matching INV-YYYYMM-NNN pattern
      let maxCounter = 0;

      for (const invoice of data.invoices) {
        const match = invoice.number?.match(/^INV-(\d{6})-(\d{3,})$/);
        if (match) {
          const counter = parseInt(match[2], 10);
          if (counter > maxCounter) {
            maxCounter = counter;
          }
        }
      }

      const nextCounter = maxCounter + 1;
      // Sync localStorage with DB reality
      setStoredCounter(nextCounter);
      const paddedCounter = nextCounter.toString().padStart(3, '0');
      return `INV-${yearMonth}-${paddedCounter}`;
    }
  } catch (error) {
    console.error('Failed to fetch invoices for number generation, falling back to localStorage:', error);
  }

  // Fallback to localStorage if API fails
  const counter = incrementCounter();
  const paddedCounter = counter.toString().padStart(3, '0');
  return `INV-${yearMonth}-${paddedCounter}`;
}

// Keep this for any sync callers — uses localStorage only
export function generateInvoiceNumber(issueDate: string): string {
  const counter = incrementCounter();
  const yearMonth = dayjs(issueDate).format('YYYYMM');
  const paddedCounter = counter.toString().padStart(3, '0');
  return `INV-${yearMonth}-${paddedCounter}`;
}

export function resetCounter(): void {
  try {
    localStorage.removeItem(COUNTER_KEY);
  } catch (error) {
    console.error('Failed to reset invoice counter:', error);
  }
}