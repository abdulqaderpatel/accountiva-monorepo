import {
  invoiceSchema,
  validateFinancialDocumentDates,
  validateFinancialLineItems,
  type FinancialLineItemInput,
} from "@accountiva/shared";

export interface InvoiceFormValues {
  invoiceNumber: string;
  customerId: string;
  amount: number;
  date: string;
  dueDate: string;
  items?: FinancialLineItemInput[];
}

export type InvoiceFormErrors = Partial<Record<keyof InvoiceFormValues, string>>;

export function validateInvoiceForm(values: InvoiceFormValues): InvoiceFormErrors {
  const result = invoiceSchema.safeParse(values);
  const errors: InvoiceFormErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof InvoiceFormValues;
      if (!errors[field]) errors[field] = issue.message;
    }
  }

  if (values.items && values.items.length > 0) {
    const itemError = validateFinancialLineItems(values.items);
    if (itemError) errors.items = itemError;
  }

  if (!errors.date && !errors.dueDate) {
    const dateError = validateFinancialDocumentDates(values.date, values.dueDate, "Due date");
    if (dateError) errors.dueDate = dateError;
  }

  return errors;
}

type AmountOnlyInvoice = {
  amount?: unknown;
  discountAmount?: unknown;
  discount_amount?: unknown;
  taxAmount?: unknown;
  tax_amount?: unknown;
  shippingCharges?: unknown;
  shipping_charges?: unknown;
  packagingCharges?: unknown;
  packaging_charges?: unknown;
  adjustment?: unknown;
  roundOff?: unknown;
  round_off?: unknown;
};

const finiteAmount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function getAmountOnlyInvoiceSubtotal(invoice: AmountOnlyInvoice): number {
  const subtotal =
    finiteAmount(invoice.amount) +
    finiteAmount(invoice.discountAmount ?? invoice.discount_amount) -
    finiteAmount(invoice.taxAmount ?? invoice.tax_amount) -
    finiteAmount(invoice.shippingCharges ?? invoice.shipping_charges) -
    finiteAmount(invoice.packagingCharges ?? invoice.packaging_charges) -
    finiteAmount(invoice.roundOff ?? invoice.round_off ?? invoice.adjustment);

  return Math.max(0, Math.round((subtotal + Number.EPSILON) * 100) / 100);
}

export function getAmountOnlyInvoiceEditState(invoice: AmountOnlyInvoice) {
  return {
    manualAmount: getAmountOnlyInvoiceSubtotal(invoice),
    roundOff: finiteAmount(invoice.roundOff ?? invoice.round_off ?? invoice.adjustment),
    autoRoundOff: false as const,
  };
}
