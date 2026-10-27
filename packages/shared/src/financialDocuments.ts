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

export interface FinancialLineItemAmounts {
  quantity?: number | string | null;
  rate?: number | string | null;
  amount?: number | string | null;
}

export interface InvoiceBalanceSource {
  amount?: number | string | null;
  remainingAmount?: number | string | null;
  outstandingAmount?: number | string | null;
  balanceDue?: number | string | null;
  creditNoteApplications?: Array<{
    amountApplied?: number | string | null;
    amount_applied?: number | string | null;
  }>;
  credit_note_applications?: Array<{
    amountApplied?: number | string | null;
    amount_applied?: number | string | null;
  }>;
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

export function calculateFinancialDocumentSubtotal(
  items: FinancialLineItemAmounts[],
): number {
  if (!Array.isArray(items)) return 0;

  const subtotal = items.reduce((sum, item) => {
    const persistedAmount = Number(item?.amount);
    if (item?.amount !== null && item?.amount !== undefined && Number.isFinite(persistedAmount)) {
      return sum + persistedAmount;
    }

    const quantity = Number(item?.quantity);
    const rate = Number(item?.rate);
    if (!Number.isFinite(quantity) || !Number.isFinite(rate)) return sum;
    return sum + quantity * rate;
  }, 0);

  return Number(subtotal.toFixed(2));
}

export interface DocumentLineItemCalculationInput {
  id?: string;
  itemId?: string | null;
  itemName?: string;
  name?: string;
  description?: string;
  quantity?: number | string | null;
  rate?: number | string | null;
  amount?: number | string | null;
}

export interface DocumentTotalsInput {
  items?: DocumentLineItemCalculationInput[] | null;
  manualAmount?: number | string | null;
  subtotal?: number | string | null;
  discountType?: "percentage" | "fixed" | string | null;
  discountValue?: number | string | null;
  discountAmount?: number | string | null;
  taxPercent?: number | string | null;
  taxAmount?: number | string | null;
  shippingCharges?: number | string | null;
  adjustment?: number | string | null;
  amount?: number | string | null;
}

export interface DocumentTotalsResult {
  subtotal: number;
  discountType: "percentage" | "fixed" | "";
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  taxPercent: number;
  taxAmount: number;
  shippingCharges: number;
  adjustment: number;
  total: number;
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateDocumentTotals(input: DocumentTotalsInput): DocumentTotalsResult {
  const items = Array.isArray(input.items) ? input.items : [];
  const calculatedItemsSubtotal = calculateFinancialDocumentSubtotal(items as FinancialLineItemAmounts[]);

  let subtotal = 0;
  if (items.length > 0 && calculatedItemsSubtotal > 0) {
    subtotal = calculatedItemsSubtotal;
  } else if (items.length > 0 && items.some((it) => (Number(it?.amount) || 0) > 0 || ((Number(it?.quantity) || 0) > 0 && (Number(it?.rate) || 0) > 0))) {
    subtotal = calculatedItemsSubtotal;
  } else if (input.manualAmount !== undefined && input.manualAmount !== null && input.manualAmount !== "") {
    const parsedManual = Number(input.manualAmount);
    subtotal = Number.isFinite(parsedManual) && parsedManual >= 0 ? roundToTwo(parsedManual) : 0;
  } else if (input.subtotal !== undefined && input.subtotal !== null && input.subtotal !== "") {
    const parsedSubtotal = Number(input.subtotal);
    subtotal = Number.isFinite(parsedSubtotal) && parsedSubtotal >= 0 ? roundToTwo(parsedSubtotal) : 0;
  } else {
    subtotal = calculatedItemsSubtotal;
  }

  const rawDiscountType = String(input.discountType || "").toLowerCase().trim();
  const discountType: "percentage" | "fixed" | "" =
    rawDiscountType === "percentage" || rawDiscountType === "percent" || rawDiscountType === "%"
      ? "percentage"
      : rawDiscountType === "fixed" || rawDiscountType === "flat" || rawDiscountType === "amount"
        ? "fixed"
        : "";

  const parsedDiscountValue = Number(input.discountValue);
  const discountValue = Number.isFinite(parsedDiscountValue) && parsedDiscountValue > 0 ? parsedDiscountValue : 0;

  const parsedExplicitDiscountAmount = Number(input.discountAmount);
  const explicitDiscountAmount = Number.isFinite(parsedExplicitDiscountAmount) && parsedExplicitDiscountAmount > 0
    ? parsedExplicitDiscountAmount
    : 0;

  let discountAmount = 0;
  if (discountType === "percentage" && discountValue > 0) {
    discountAmount = roundToTwo((subtotal * discountValue) / 100);
  } else if (discountType === "fixed" && discountValue > 0) {
    discountAmount = roundToTwo(Math.min(discountValue, subtotal));
  } else if (explicitDiscountAmount > 0) {
    discountAmount = roundToTwo(Math.min(explicitDiscountAmount, subtotal));
  } else if (discountValue > 0) {
    discountAmount = roundToTwo(Math.min(discountValue, subtotal));
  }

  // Discount cannot exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);

  const taxableAmount = roundToTwo(Math.max(0, subtotal - discountAmount));

  const parsedTaxPercent = Number(input.taxPercent);
  const taxPercent = Number.isFinite(parsedTaxPercent) && parsedTaxPercent >= 0 ? parsedTaxPercent : 0;

  const parsedExplicitTaxAmount = Number(input.taxAmount);
  const explicitTaxAmount = Number.isFinite(parsedExplicitTaxAmount) && parsedExplicitTaxAmount >= 0
    ? parsedExplicitTaxAmount
    : 0;

  let taxAmount = 0;
  if (taxPercent > 0) {
    taxAmount = roundToTwo((taxableAmount * taxPercent) / 100);
  } else if (explicitTaxAmount > 0) {
    taxAmount = roundToTwo(explicitTaxAmount);
  }

  const parsedShipping = Number(input.shippingCharges);
  const shippingCharges = Number.isFinite(parsedShipping) && parsedShipping > 0
    ? roundToTwo(parsedShipping)
    : 0;

  const parsedAdjustment = Number(input.adjustment);
  const adjustment = Number.isFinite(parsedAdjustment)
    ? roundToTwo(parsedAdjustment)
    : 0;

  const calculatedTotal = roundToTwo(
    Math.max(0, taxableAmount + taxAmount + shippingCharges + adjustment)
  );

  return {
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    taxableAmount,
    taxPercent,
    taxAmount,
    shippingCharges,
    adjustment,
    total: calculatedTotal,
  };
}

export function getDocumentSummaryDetails(doc: any): DocumentTotalsResult {
  if (!doc || typeof doc !== "object") {
    return {
      subtotal: 0,
      discountType: "",
      discountValue: 0,
      discountAmount: 0,
      taxableAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      shippingCharges: 0,
      adjustment: 0,
      total: 0,
    };
  }

  const items = Array.isArray(doc.items)
    ? doc.items
    : Array.isArray(doc.estimate_items)
      ? doc.estimate_items
      : Array.isArray(doc.invoice_items)
        ? doc.invoice_items
        : [];

  const discountType = (doc.discountType ?? doc.discount_type ?? "") as string;
  const discountValue = doc.discountValue ?? doc.discount_value;
  const discountAmount = doc.discountAmount ?? doc.discount_amount;
  const taxPercent = doc.taxPercent ?? doc.tax_percent;
  const taxAmount = doc.taxAmount ?? doc.tax_amount;
  const shippingCharges = doc.shippingCharges ?? doc.shipping_charges;
  const adjustment = doc.adjustment;
  const manualAmount = doc.subtotal ?? doc.amount;

  return calculateDocumentTotals({
    items,
    manualAmount,
    discountType,
    discountValue,
    discountAmount,
    taxPercent,
    taxAmount,
    shippingCharges,
    adjustment,
    amount: doc.amount,
  });
}

export function calculateInvoiceOutstandingAmount(invoice: InvoiceBalanceSource): number {
  const explicitBalance = [
    invoice.remainingAmount,
    invoice.outstandingAmount,
    invoice.balanceDue,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number)
    .find(Number.isFinite);
  if (explicitBalance !== undefined) return Math.max(0, explicitBalance);

  const applications =
    invoice.creditNoteApplications || invoice.credit_note_applications || [];
  const applied = applications.reduce((sum, application) => {
    const amount = Number(application.amountApplied ?? application.amount_applied ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const total = Number(invoice.amount);
  return Math.max(0, (Number.isFinite(total) ? total : 0) - applied);
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
