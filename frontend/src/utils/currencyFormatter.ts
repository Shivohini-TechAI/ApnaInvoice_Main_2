export type Currency = 'INR' | 'USD' | 'AED';

export interface CurrencyConfig {
  locale: string;
  symbol: string;
  code: string;
}

const currencyConfigs: Record<Currency, CurrencyConfig> = {
  INR: {
    locale: 'en-IN',
    symbol: '₹',
    code: 'INR',
  },
  USD: {
    locale: 'en-US',
    symbol: '$',
    code: 'USD',
  },
  AED: {
    locale: 'en-AE',
    symbol: 'د.إ',
    code: 'AED',
  },
};

export function getCurrencySymbol(currency: Currency): string {
  return currencyConfigs[currency].symbol;
}

export function formatCurrency(
  amount: number,
  currency: Currency,
  options?: {
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const config = currencyConfigs[currency];
  const {
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options || {};

  const formattedNumber = amount.toLocaleString(config.locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  if (showSymbol) {
    return `${config.symbol} ${formattedNumber}`;
  }

  return formattedNumber;
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
