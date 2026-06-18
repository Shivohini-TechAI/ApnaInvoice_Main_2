export interface LineItem {
  id: string;
  name: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface InvoiceCalculations {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalDue: number;
}

export function calculateSubtotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => {
    return sum + (item.qty * item.unitPrice);
  }, 0);
}

export function calculateDiscountAmount(
  subtotal: number,
  discountType?: 'flat' | 'percent',
  discountValue: number = 0
): number {
  if (!discountType || discountValue <= 0) {
    return 0;
  }

  let discount = 0;

  if (discountType === 'percent') {
    discount = subtotal * (discountValue / 100);
  } else {
    discount = discountValue;
  }

  // Guard: discount cannot be negative or exceed subtotal
  return Math.max(0, Math.min(discount, subtotal));
}

export function calculateTaxableAmount(
  subtotal: number,
  discountAmount: number
): number {
  return Math.max(0, subtotal - discountAmount);
}

export function calculateTaxAmount(
  taxableAmount: number,
  taxRate: number
): number {
  return taxableAmount * (taxRate / 100);
}

export function calculateTotalDue(
  taxableAmount: number,
  taxAmount: number
): number {
  return taxableAmount + taxAmount;
}

export function calculateInvoiceTotals(
  lineItems: LineItem[],
  taxRate: number,
  discountType?: 'flat' | 'percent',
  discountValue: number = 0
): InvoiceCalculations {
  const subtotal = calculateSubtotal(lineItems);
  const discountAmount = calculateDiscountAmount(subtotal, discountType, discountValue);
  const taxableAmount = calculateTaxableAmount(subtotal, discountAmount);
  const taxAmount = calculateTaxAmount(taxableAmount, taxRate);
  const totalDue = calculateTotalDue(taxableAmount, taxAmount);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    totalDue,
  };
}
