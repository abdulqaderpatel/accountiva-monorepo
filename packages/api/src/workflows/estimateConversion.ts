import {
  buildInvoiceFromEstimate,
  type EstimateConversionSource,
  type InvoicePayload,
} from '@accountiva/shared';
import {
  createInvoice,
  fetchNextInvoiceNumber,
  type InvoiceRecord,
} from '../queries/invoices';
import { updateEstimateStatus } from '../queries/estimates';

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
  adjustment?: number;
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
};

function normalizeEstimate(source: EstimateConversionSource | EstimateConversionRecord): EstimateConversionSource {
  const record = source as EstimateConversionRecord;
  return {
    estimateNumber: source.estimateNumber || record.number || "",
    customerId:
      source.customerId ||
      record.customer?.id ||
      record.customers?.id,
    amount: Number(source.amount),
    items: source.items.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      itemName: item.itemName || (item as EstimateConversionRecord["items"][number]).name || "",
      description: item.description,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      amount: Number(
        item.amount ?? (Number(item.quantity) * Number(item.rate)),
      ),
    })),
    referenceNumber: source.referenceNumber,
    billingAddress: source.billingAddress,
    shippingAddress: source.shippingAddress,
    terms: source.terms,
    discountType: source.discountType,
    discountValue: source.discountValue,
    discountAmount: source.discountAmount,
    shippingCharges: source.shippingCharges,
    adjustment: source.adjustment,
    notes: source.notes,
    termsConditions: source.termsConditions,
    taxPercent: source.taxPercent,
    taxAmount: source.taxAmount,
    customFields: source.customFields || record.custom_fields,
  };
}

export async function convertEstimateToInvoice(
  input: EstimateConversionInput,
  deps: EstimateConversionDependencies = defaultDependencies,
): Promise<EstimateConversionResult> {
  const invoiceNumber = await deps.fetchNextInvoiceNumber();
  const payload = buildInvoiceFromEstimate(normalizeEstimate(input.estimate), {
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
