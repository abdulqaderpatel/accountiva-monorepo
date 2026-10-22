import {
  validateFinancialDocumentDates,
  validateFinancialLineItems,
  type InvoicePayload,
  type InvoiceStatus,
} from "@accountiva/shared";

export interface MobileDocumentLineItem {
  id?: string;
  itemId?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
}

export interface MobileInvoiceFormValues {
  invoiceNumber: string;
  customerId: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  items: MobileDocumentLineItem[];
  referenceNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  terms?: string;
  discountType?: string;
  discountValue?: number | string;
  shippingCharges?: number | string;
  adjustment?: number | string;
  taxPercent?: number | string;
  notes?: string;
  termsConditions?: string;
  customFields?: Record<string, unknown>;
}

const roundMoney = (value: number) => Number(value.toFixed(2));

function asFiniteNumber(value: number | string | undefined, fallback = 0): number {
  if (value === "" || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function buildMobileInvoicePayload(values: MobileInvoiceFormValues): InvoicePayload {
  const invoiceNumber = values.invoiceNumber.trim();
  if (!invoiceNumber) throw new Error("Invoice number is required.");

  const customerId = values.customerId.trim();
  if (!customerId) throw new Error("Please select a customer.");

  const items = values.items.map((item) => ({
    id: item.id,
    itemId: item.itemId,
    itemName: item.name.trim(),
    description: item.description?.trim() || undefined,
    quantity: Number(item.quantity),
    rate: Number(item.rate),
    amount: roundMoney(Number(item.quantity) * Number(item.rate)),
  }));

  const itemError = validateFinancialLineItems(items);
  if (itemError) throw new Error(itemError);

  const dateError = validateFinancialDocumentDates(values.date, values.dueDate, "Due date");
  if (dateError) throw new Error(dateError);

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const discountValue = Math.max(0, asFiniteNumber(values.discountValue));
  const discountAmount = roundMoney(
    values.discountType === "percentage"
      ? subtotal * (discountValue / 100)
      : values.discountType === "fixed"
        ? Math.min(discountValue, subtotal)
        : 0,
  );
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxPercent = Math.max(0, asFiniteNumber(values.taxPercent));
  const taxAmount = roundMoney(taxableAmount * (taxPercent / 100));
  const shippingCharges = asFiniteNumber(values.shippingCharges);
  const adjustment = asFiniteNumber(values.adjustment);
  const amount = roundMoney(
    Math.max(0, taxableAmount + taxAmount + shippingCharges + adjustment),
  );

  if (amount <= 0) throw new Error("Invoice total must be greater than zero.");

  return {
    invoiceNumber,
    customerId,
    date: values.date,
    dueDate: values.dueDate,
    status: values.status,
    items,
    amount,
    referenceNumber: values.referenceNumber?.trim() || undefined,
    billingAddress: values.billingAddress?.trim() || undefined,
    shippingAddress: values.shippingAddress?.trim() || undefined,
    terms: values.terms?.trim() || undefined,
    discountType: values.discountType || undefined,
    discountValue,
    discountAmount,
    shippingCharges,
    adjustment,
    taxPercent,
    taxAmount,
    notes: values.notes?.trim() || undefined,
    termsConditions: values.termsConditions?.trim() || undefined,
    customFields: values.customFields,
  };
}
