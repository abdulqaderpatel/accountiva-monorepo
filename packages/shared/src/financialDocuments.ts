export const INVOICE_STATUSES = ["Draft", "Outstanding", "Paid"] as const;
export const ESTIMATE_STATUSES = [
  "Draft",
  "Sent",
  "Accepted",
  "Declined",
  "Invoiced",
] as const;
export const CREDIT_NOTE_STATUSES = ["Draft", "Open", "Closed", "Void"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];
export type CreditNoteStatus = (typeof CREDIT_NOTE_STATUSES)[number];

export interface FinancialLineItemInput {
  id?: string;
  itemId?: string | null;
  itemName: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface FinancialDocumentFields {
  customerId: string;
  date: string;
  amount: number;
  items: FinancialLineItemInput[];
  referenceNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  terms?: string;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  shippingCharges?: number;
  adjustment?: number;
  notes?: string;
  termsConditions?: string;
  taxPercent?: number;
  taxAmount?: number;
  customFields?: Record<string, unknown>;
}

export interface InvoicePayload extends FinancialDocumentFields {
  invoiceNumber: string;
  dueDate: string;
  status: InvoiceStatus;
}

export interface EstimatePayload extends FinancialDocumentFields {
  estimateNumber: string;
  expiryDate: string;
  status: EstimateStatus;
}

export interface CreditNotePayload extends Omit<FinancialDocumentFields, "shippingCharges" | "terms"> {
  creditNoteNumber: string;
  status: CreditNoteStatus;
  subtotal?: number;
  referenceInvoiceId?: string;
}

export interface EstimateConversionSource
  extends Omit<FinancialDocumentFields, "date" | "customerId"> {
  estimateNumber: string;
  customerId: string | null | undefined;
}

export function validateFinancialLineItems(items: FinancialLineItemInput[]): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return "At least one line item is required.";
  }

  for (const [index, item] of items.entries()) {
    const label = `Line item ${index + 1}`;
    if (!item || typeof item.itemName !== "string" || item.itemName.trim() === "") {
      return `${label} must have a name.`;
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return `${label} quantity must be greater than zero.`;
    }
    if (!Number.isFinite(item.rate) || item.rate < 0) {
      return `${label} rate must be a non-negative number.`;
    }
    if (!Number.isFinite(item.amount) || item.amount < 0) {
      return `${label} amount must be a non-negative number.`;
    }
  }

  return null;
}

function parseDocumentDate(value: string): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateFinancialDocumentDates(
  date: string,
  endDate?: string,
  endDateLabel = "End date",
): string | null {
  const issueTimestamp = parseDocumentDate(date);
  if (issueTimestamp === null) return "A valid issue date is required.";

  if (endDate === undefined) return null;
  const endTimestamp = parseDocumentDate(endDate);
  if (endTimestamp === null) return `A valid ${endDateLabel.toLowerCase()} is required.`;
  if (endTimestamp < issueTimestamp) {
    return `${endDateLabel} cannot be before the issue date.`;
  }

  return null;
}

export function buildInvoiceFromEstimate(
  source: EstimateConversionSource,
  options: { invoiceNumber: string; date: string; dueDate: string },
): InvoicePayload {
  const estimateNumber = source.estimateNumber?.trim();
  if (!estimateNumber) throw new Error("The estimate number is required for conversion.");

  const customerId = source.customerId?.trim();
  if (!customerId) throw new Error("Select a customer before converting this estimate.");

  const invoiceNumber = options.invoiceNumber?.trim();
  if (!invoiceNumber) throw new Error("An invoice number is required for conversion.");

  const lineItemError = validateFinancialLineItems(source.items);
  if (lineItemError) throw new Error(lineItemError);

  const dateError = validateFinancialDocumentDates(options.date, options.dueDate, "Due date");
  if (dateError) throw new Error(dateError);

  if (!Number.isFinite(source.amount) || source.amount < 0) {
    throw new Error("The estimate total must be a non-negative number.");
  }

  const conversionNote = `Converted from Estimate ${estimateNumber}.`;
  const originalNotes = source.notes?.trim();

  return {
    invoiceNumber,
    customerId,
    date: options.date,
    dueDate: options.dueDate,
    amount: source.amount,
    status: "Draft",
    items: source.items.map((item) => ({ ...item })),
    referenceNumber: source.referenceNumber,
    billingAddress: source.billingAddress,
    shippingAddress: source.shippingAddress,
    terms: source.terms,
    discountType: source.discountType,
    discountValue: source.discountValue,
    discountAmount: source.discountAmount,
    shippingCharges: source.shippingCharges,
    adjustment: source.adjustment,
    notes: originalNotes ? `${conversionNote}\n\n${originalNotes}` : conversionNote,
    termsConditions: source.termsConditions,
    taxPercent: source.taxPercent,
    taxAmount: source.taxAmount,
    customFields: source.customFields ? { ...source.customFields } : undefined,
  };
}

export function isDuplicateDocumentNumberError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown };
  };
  return candidate.status === 409 || candidate.response?.status === 409;
}
