import { invoiceSchema } from "@accountiva/shared";

export interface InvoiceFormValues {
  invoiceNumber: string;
  customerId: string;
  amount: number;
  date: string;
  dueDate: string;
}

export type InvoiceFormErrors = Partial<Record<keyof InvoiceFormValues | "items", string>>;

export function validateInvoiceForm(values: InvoiceFormValues): InvoiceFormErrors {
  const result = invoiceSchema.safeParse(values);
  if (result.success) return {};

  const errors: InvoiceFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof InvoiceFormValues;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}
