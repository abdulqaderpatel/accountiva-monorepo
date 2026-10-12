const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  AED: 'en-AE',
  CAD: 'en-CA',
  AUD: 'en-AU',
  SGD: 'en-SG',
  JPY: 'ja-JP',
  SAR: 'en-SA',
  QAR: 'en-QA',
  OMR: 'en-OM',
  KWD: 'en-KW',
  BHD: 'en-BH',
  ZAR: 'en-ZA',
  NZD: 'en-NZ',
  HKD: 'en-HK',
  CHF: 'de-CH',
  CNY: 'zh-CN',
};

/**
 * Get Active Organization Currency code from storage or fallback
 */
export const getActiveCurrency = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem('accountiva_org_currency');
    if (stored && /^[A-Za-z]{3}$/.test(stored.trim())) {
      return stored.trim().toUpperCase();
    }
  }
  return 'INR';
};

/**
 * Get currency symbol for a currency code (defaults to active org currency)
 */
export const getCurrencySymbol = (currency?: string): string => {
  const targetCurrency =
    typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency.trim())
      ? currency.trim().toUpperCase()
      : getActiveCurrency();

  try {
    const formatter = new Intl.NumberFormat(CURRENCY_LOCALES[targetCurrency] || 'en-US', {
      style: 'currency',
      currency: targetCurrency,
    });
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find((p) => p.type === 'currency');
    return symbolPart ? symbolPart.value : targetCurrency;
  } catch {
    return targetCurrency === 'INR' ? '₹' : '$';
  }
};

/**
 * Currency Formatter
 * @param amount Number to format
 * @param currency Currency code (default: active organization currency or INR)
 * @param options Additional Intl.NumberFormatOptions
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency?: string,
  options?: Intl.NumberFormatOptions
): string => {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const targetCurrency =
    typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency.trim())
      ? currency.trim().toUpperCase()
      : getActiveCurrency();

  const locale = CURRENCY_LOCALES[targetCurrency] || (targetCurrency === 'INR' ? 'en-IN' : 'en-US');

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: targetCurrency,
      maximumFractionDigits: 0,
      ...options,
    }).format(safeAmount);
  } catch {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      ...options,
    }).format(safeAmount);
  }
};

/**
 * Date Formatter
 * @param date Date string or object
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', options).format(d);
};

/**
 * Percentage Formatter
 * @param value Number to format
 * @returns Formatted percentage string
 */
export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

export interface InvoiceStatusInfo {
  label: string;
  colorClass: string;
  dotClass: string;
  variant: 'draft' | 'success' | 'warning' | 'danger' | 'info' | 'default';
}

/**
 * Get Invoice Relative Status Info
 * @param status Original status from DB
 * @param dueDate Due date of the invoice
 * @returns Object with label, styling class, dot indicator class, and variant
 */
export const getInvoiceStatusInfo = (status: string, dueDate: string | Date | null): InvoiceStatusInfo => {
  if (status === 'Draft') {
    return {
      label: 'Draft',
      variant: 'draft',
      colorClass: 'border-transparent bg-zinc-600 text-white dark:bg-zinc-700 dark:text-zinc-100 shadow-xs font-medium',
      dotClass: '',
    };
  }

  if (status === 'Paid') {
    return {
      label: 'Paid',
      variant: 'success',
      colorClass: 'border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white shadow-xs font-medium',
      dotClass: '',
    };
  }

  if (status === 'Overdue') {
    return {
      label: 'Overdue',
      variant: 'danger',
      colorClass: 'border-transparent bg-rose-600 text-white dark:bg-rose-600 dark:text-white shadow-xs font-medium',
      dotClass: '',
    };
  }

  if (!dueDate) {
    return {
      label: 'Outstanding',
      variant: 'warning',
      colorClass: 'border-transparent bg-amber-500 text-white dark:bg-amber-600 dark:text-white shadow-xs font-medium',
      dotClass: '',
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return {
      label: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      variant: 'warning',
      colorClass: 'border-transparent bg-amber-500 text-white dark:bg-amber-600 dark:text-white shadow-xs font-medium',
      dotClass: '',
    };
  } else if (diffDays === 0) {
    return {
      label: 'Due today',
      variant: 'warning',
      colorClass: 'border-transparent bg-amber-600 text-white dark:bg-amber-600 dark:text-white shadow-xs font-semibold',
      dotClass: '',
    };
  } else {
    const overdueDays = Math.abs(diffDays);
    return {
      label: `${overdueDays}d overdue`,
      variant: 'danger',
      colorClass: 'border-transparent bg-rose-600 text-white dark:bg-rose-600 dark:text-white shadow-xs font-medium',
      dotClass: '',
    };
  }
};
