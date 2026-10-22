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
  estimate: EstimateConversionSource;
  invoiceDate: string;
  dueDate: string;
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

export async function convertEstimateToInvoice(
  input: EstimateConversionInput,
  deps: EstimateConversionDependencies = defaultDependencies,
): Promise<EstimateConversionResult> {
  const invoiceNumber = await deps.fetchNextInvoiceNumber();
  const payload = buildInvoiceFromEstimate(input.estimate, {
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
