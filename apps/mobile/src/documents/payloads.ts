import {
  calculateDocumentTotals,
  validateFinancialDocumentDates,
  validateFinancialLineItems,
  type CreditNotePayload,
  type CreditNoteStatus,
  type EstimatePayload,
  type EstimateStatus,
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
  packagingCharges?: number | string;
  adjustment?: number | string;
  roundOff?: number | string;
  autoRoundOff?: boolean;
  taxPercent?: number | string;
  notes?: string;
  termsConditions?: string;
  customFields?: Record<string, unknown>;
}

export interface MobileEstimateFormValues {
  estimateNumber: string;
  customerId: string;
  date: string;
  expiryDate: string;
  status: EstimateStatus;
  items: MobileDocumentLineItem[];
  referenceNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  terms?: string;
  discountType?: string;
  discountValue?: number | string;
  shippingCharges?: number | string;
  packagingCharges?: number | string;
  adjustment?: number | string;
  roundOff?: number | string;
  autoRoundOff?: boolean;
  taxPercent?: number | string;
  notes?: string;
  termsConditions?: string;
  customFields?: Record<string, unknown>;
}

export interface MobileCreditNoteFormValues {
  creditNoteNumber: string;
  customerId: string;
  date: string;
  status: CreditNoteStatus;
  items: MobileDocumentLineItem[];
  referenceNumber?: string;
  referenceInvoiceId?: string;
  billingAddress?: string;
  shippingAddress?: string;
  discountType?: string;
  discountValue?: number | string;
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

  const totals = calculateDocumentTotals({
    items,
    discountType: values.discountType,
    discountValue: values.discountValue,
    taxPercent: values.taxPercent,
    shippingCharges: values.shippingCharges,
    packagingCharges: values.packagingCharges,
    adjustment: values.roundOff ?? values.adjustment,
    autoRoundOff: values.autoRoundOff,
  });

  if (totals.total <= 0) throw new Error("Invoice total must be greater than zero.");

  const payload: InvoicePayload = {
    invoiceNumber,
    customerId,
    date: values.date,
    dueDate: values.dueDate,
    status: values.status,
    items,
    amount: totals.total,
    discountType: totals.discountType || undefined,
    discountValue: totals.discountValue,
    discountAmount: totals.discountAmount,
    shippingCharges: totals.shippingCharges,
    adjustment: totals.adjustment,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
  };

  if (values.referenceNumber?.trim()) payload.referenceNumber = values.referenceNumber.trim();
  if (values.billingAddress?.trim()) payload.billingAddress = values.billingAddress.trim();
  if (values.shippingAddress?.trim()) payload.shippingAddress = values.shippingAddress.trim();
  if (values.terms?.trim()) payload.terms = values.terms.trim();
  if (totals.packagingCharges) payload.packagingCharges = totals.packagingCharges;
  if (values.notes?.trim()) payload.notes = values.notes.trim();
  if (values.termsConditions?.trim()) payload.termsConditions = values.termsConditions.trim();
  if (values.customFields) payload.customFields = values.customFields;

  return payload;
}

export function buildMobileEstimatePayload(values: MobileEstimateFormValues): EstimatePayload {
  const estimateNumber = values.estimateNumber.trim();
  if (!estimateNumber) throw new Error("Estimate number is required.");

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

  const dateError = validateFinancialDocumentDates(values.date, values.expiryDate, "Expiry date");
  if (dateError) throw new Error(dateError);

  const totals = calculateDocumentTotals({
    items,
    discountType: values.discountType,
    discountValue: values.discountValue,
    taxPercent: values.taxPercent,
    shippingCharges: values.shippingCharges,
    packagingCharges: values.packagingCharges,
    adjustment: values.roundOff ?? values.adjustment,
    autoRoundOff: values.autoRoundOff,
  });

  if (totals.total <= 0) throw new Error("Estimate total must be greater than zero.");

  const payload: EstimatePayload = {
    estimateNumber,
    customerId,
    date: values.date,
    expiryDate: values.expiryDate,
    status: values.status,
    items,
    amount: totals.total,
    discountType: totals.discountType || undefined,
    discountValue: totals.discountValue,
    discountAmount: totals.discountAmount,
    shippingCharges: totals.shippingCharges,
    adjustment: totals.adjustment,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
  };

  if (values.referenceNumber?.trim()) payload.referenceNumber = values.referenceNumber.trim();
  if (values.billingAddress?.trim()) payload.billingAddress = values.billingAddress.trim();
  if (values.shippingAddress?.trim()) payload.shippingAddress = values.shippingAddress.trim();
  if (values.terms?.trim()) payload.terms = values.terms.trim();
  if (totals.packagingCharges) payload.packagingCharges = totals.packagingCharges;
  if (values.notes?.trim()) payload.notes = values.notes.trim();
  if (values.termsConditions?.trim()) payload.termsConditions = values.termsConditions.trim();
  if (values.customFields) payload.customFields = values.customFields;

  return payload;
}

export function buildMobileCreditNotePayload(
  values: MobileCreditNoteFormValues,
): CreditNotePayload {
  const creditNoteNumber = values.creditNoteNumber.trim();
  if (!creditNoteNumber) throw new Error("Credit note number is required.");

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

  const dateError = validateFinancialDocumentDates(values.date);
  if (dateError) throw new Error(dateError);

  const totals = calculateDocumentTotals({
    items,
    discountType: values.discountType,
    discountValue: values.discountValue,
    taxPercent: values.taxPercent,
    adjustment: values.adjustment,
  });

  if (totals.total <= 0) throw new Error("Credit note total must be greater than zero.");

  return {
    creditNoteNumber,
    customerId,
    date: values.date,
    status: values.status,
    items,
    amount: totals.total,
    subtotal: totals.subtotal,
    referenceNumber: values.referenceNumber?.trim() || undefined,
    referenceInvoiceId: values.referenceInvoiceId?.trim() || undefined,
    billingAddress: values.billingAddress?.trim() || undefined,
    shippingAddress: values.shippingAddress?.trim() || undefined,
    discountType: totals.discountType || undefined,
    discountValue: totals.discountValue,
    discountAmount: totals.discountAmount,
    adjustment: totals.adjustment,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
    notes: values.notes?.trim() || undefined,
    termsConditions: values.termsConditions?.trim() || undefined,
    customFields: values.customFields,
  };
}
