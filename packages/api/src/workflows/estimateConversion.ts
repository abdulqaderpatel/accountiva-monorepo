import {
  buildInvoiceFromEstimate,
  calculateDocumentTotals,
  isUuid,
  type EstimateConversionSource,
  type InvoicePayload,
} from '@accountiva/shared';
import {
  createInvoice,
  fetchNextInvoiceNumber,
  type InvoiceRecord,
} from '../queries/invoices';
import {
  updateEstimateStatus,
  fetchEstimate,
  type EstimateRecord,
} from '../queries/estimates';

export interface EstimateConversionInput {
  estimateId: string;
  estimate: EstimateConversionSource | EstimateConversionRecord;
  invoiceDate: string;
  dueDate: string;
}

export interface EstimateConversionRecord {
  estimateNumber?: string;
  number?: string;
  customerId?: string | null;
  customer_id?: string | null;
  customer?: { id?: string | null } | null;
  customers?: { id?: string | null } | null;
  amount: number;
  items: Array<{
    id?: string;
    itemId?: string | null;
    itemName?: string;
    name?: string;
    description?: string;
    quantity: number;
    rate: number;
    amount?: number;
  }>;
  referenceNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  terms?: string;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  shippingCharges?: number;
  packagingCharges?: number;
  adjustment?: number;
  roundOff?: number;
  notes?: string;
  termsConditions?: string;
  taxPercent?: number;
  taxAmount?: number;
  customFields?: Record<string, unknown>;
  custom_fields?: Record<string, unknown>;
}

export interface EstimateConversionDependencies {
  fetchNextInvoiceNumber: () => Promise<string>;
  createInvoice: (payload: InvoicePayload) => Promise<InvoiceRecord>;
  updateEstimateStatus: (id: string, status: 'Invoiced') => Promise<unknown>;
  fetchEstimate?: (id: string) => Promise<EstimateRecord>;
}

export type EstimateConversionResult =
  | {
      status: 'complete';
      invoiceNumber: string;
      invoice: InvoiceRecord;
    }
  | {
      status: 'invoice-created-status-pending';
      invoiceNumber: string;
      invoice: InvoiceRecord;
      error: unknown;
    };

const defaultDependencies: EstimateConversionDependencies = {
  fetchNextInvoiceNumber,
  createInvoice,
  updateEstimateStatus,
  fetchEstimate,
};

export function normalizeEstimate(source: EstimateConversionSource | EstimateConversionRecord): EstimateConversionSource {
  const record = source as EstimateConversionRecord;
  const rawSource = source as any;

  // Resolve customer ID across all possible locations and casing formats
  const resolvedCustomerId =
    source.customerId ||
    rawSource.customer_id ||
    rawSource.clientId ||
    rawSource.client_id ||
    (typeof record.customer === 'object' && record.customer !== null ? record.customer.id : undefined) ||
    (record.customer as any)?._id ||
    (typeof record.customers === 'object' && record.customers !== null ? record.customers.id : undefined) ||
    (record.customers as any)?._id ||
    (typeof rawSource.customer === 'string' && isUuid(rawSource.customer) ? rawSource.customer : undefined);

  const rawItems = Array.isArray(source.items)
    ? source.items
    : Array.isArray(rawSource.estimate_items)
      ? rawSource.estimate_items
      : Array.isArray(rawSource.invoice_items)
        ? rawSource.invoice_items
        : [];

  const items = rawItems.map((item: any) => {
    const rawItemId = item.itemId ?? item.item_id;
    // Only pass catalog itemId if it is a genuine UUID; otherwise omit it (custom/ad-hoc item)
    // Never pass item.id (which is estimate_items row ID, not catalog item ID)
    const itemId = isUuid(rawItemId) ? rawItemId : undefined;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const rate = Math.max(0, Number(item.rate ?? item.unitPrice ?? 0));
    const amount = Number.isFinite(Number(item.amount))
      ? Number(item.amount)
      : Math.round((quantity * rate + Number.EPSILON) * 100) / 100;
    const itemName =
      item.itemName ||
      item.name ||
      item.title ||
      item.items?.name ||
      item.description ||
      "Item";

    return {
      id: item.id,
      itemId,
      itemName,
      description: item.description || "",
      quantity,
      rate,
      amount,
    };
  });

  const discountType = source.discountType ?? rawSource.discount_type;
  const discountValue = source.discountValue ?? rawSource.discount_value;
  const discountAmount = source.discountAmount ?? rawSource.discount_amount;
  const taxPercent = source.taxPercent ?? rawSource.tax_percent;
  const taxAmount = source.taxAmount ?? rawSource.tax_amount;
  const shippingCharges = source.shippingCharges ?? rawSource.shipping_charges;
  const packagingCharges = source.packagingCharges ?? rawSource.packaging_charges ?? rawSource.packingCharges;
  const adjustment = source.adjustment ?? rawSource.adjustment ?? rawSource.roundOff ?? rawSource.round_off;

  const totals = calculateDocumentTotals({
    items,
    manualAmount: source.amount ?? rawSource.amount,
    discountType,
    discountValue,
    discountAmount,
    taxPercent,
    taxAmount,
    shippingCharges,
    packagingCharges,
    adjustment,
  });

  const finalAmount = Number.isFinite(Number(source.amount)) && Number(source.amount) > 0
    ? Number(source.amount)
    : totals.total;

  return {
    estimateNumber: source.estimateNumber || record.number || rawSource.estimate_number || "",
    customerId: resolvedCustomerId,
    amount: finalAmount,
    items,
    referenceNumber: source.referenceNumber || rawSource.reference_number,
    billingAddress: source.billingAddress || rawSource.billing_address,
    shippingAddress: source.shippingAddress || rawSource.shipping_address,
    terms: source.terms,
    discountType: totals.discountType || undefined,
    discountValue: totals.discountValue,
    discountAmount: totals.discountAmount,
    shippingCharges: totals.shippingCharges,
    packagingCharges: totals.packagingCharges,
    adjustment: totals.adjustment,
    roundOff: totals.roundOff,
    notes: source.notes || rawSource.notes,
    termsConditions: source.termsConditions || rawSource.terms_conditions,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
    customFields: source.customFields || record.custom_fields,
  };
}

export async function convertEstimateToInvoice(
  input: EstimateConversionInput,
  deps: EstimateConversionDependencies = defaultDependencies,
): Promise<EstimateConversionResult> {
  let normalized = normalizeEstimate(input.estimate);

  // If customerId or items are missing and fetchEstimate is available, fetch full estimate from backend
  if ((!normalized.customerId || normalized.items.length === 0) && input.estimateId && deps.fetchEstimate) {
    try {
      const fetched = await deps.fetchEstimate(input.estimateId) as any;
      if (fetched) {
        const mergedItems =
          Array.isArray(input.estimate.items) && input.estimate.items.length > 0
            ? input.estimate.items
            : fetched.items || fetched.estimate_items || [];

        normalized = normalizeEstimate({
          ...fetched,
          ...input.estimate,
          customerId:
            normalized.customerId ||
            fetched.customerId ||
            fetched.customer_id ||
            fetched.customer?.id ||
            fetched.customers?.id,
          items: mergedItems,
        });
      }
    } catch {
      // ignore fetch fallback error and proceed to validation
    }
  }

  const invoiceNumber = await deps.fetchNextInvoiceNumber();
  const payload = buildInvoiceFromEstimate(normalized, {
    invoiceNumber,
    date: input.invoiceDate,
    dueDate: input.dueDate,
  });
  const invoice = await deps.createInvoice(payload);
  const createdInvoiceNumber =
    typeof invoice.invoiceNumber === 'string' && invoice.invoiceNumber.trim()
      ? invoice.invoiceNumber
      : invoiceNumber;

  try {
    await deps.updateEstimateStatus(input.estimateId, 'Invoiced');
  } catch (error) {
    return {
      status: 'invoice-created-status-pending',
      invoiceNumber: createdInvoiceNumber,
      invoice,
      error,
    };
  }

  return {
    status: 'complete',
    invoiceNumber: createdInvoiceNumber,
    invoice,
  };
}
