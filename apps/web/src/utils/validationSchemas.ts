import { z } from 'zod';

// GSTIN format: 22AAAAA0000A1Z5
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  customerCode: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email format').or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  billingAddress: z.string().optional().or(z.literal('')),
  shippingAddress: z.string().optional().or(z.literal('')),
  paymentTerms: z.string().optional().or(z.literal('')),
  currency: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  gstTreatment: z.string().min(1, 'GST Registration Status is required'),
  gstNumber: z
    .string()
    .toUpperCase()
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .toUpperCase()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
      message: 'Invalid PAN format (e.g. AAAAA0000A)',
    }),
  opening_balance: z.coerce.number().min(0, 'Opening balance cannot be negative').optional(),
}).superRefine((data, ctx) => {
  const isRegistered =
    data.gstTreatment === 'Registered' ||
    data.gstTreatment === 'Composition';

  if (isRegistered) {
    if (!data.gstNumber || data.gstNumber.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GST number is required for registered businesses',
        path: ['gstNumber'],
      });
    } else if (!gstinRegex.test(data.gstNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)',
        path: ['gstNumber'],
      });
    }
  }
});

export const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  type: z.enum(['Product', 'Service']).default('Product'),
  productType: z.enum(['Inventory', 'Non-Inventory']).nullable().optional(),
  sku: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  uom: z.string().optional().or(z.literal('')),
  hsnSacCode: z.string().optional().or(z.literal('')),
  taxPreference: z.string().optional().or(z.literal('')),
  imageUrl: z.string().optional().or(z.literal('')),
  isSellable: z.boolean().optional(),
  sellingPrice: z.coerce.number().min(0, 'Price cannot be negative').optional(),
  salesTaxInclusive: z.boolean().optional(),
  salesTaxRate: z.coerce.number().min(0).optional(),
  incomeAccount: z.string().optional(),
  salesDescription: z.string().optional().or(z.literal('')),
  isPurchasable: z.boolean().optional(),
  costPrice: z.coerce.number().min(0, 'Cost price cannot be negative').optional(),
  purchaseTaxInclusive: z.boolean().optional(),
  purchaseTaxRate: z.coerce.number().min(0).optional(),
  expenseAccount: z.string().optional(),
  preferredVendorId: z.string().optional().nullable(),
  purchaseDescription: z.string().optional().or(z.literal('')),
  inventoryAccount: z.string().optional(),
  openingStock: z.coerce.number().min(0, 'Opening stock cannot be negative').optional(),
  valuationRate: z.coerce.number().min(0, 'Valuation rate cannot be negative').optional(),
  asOfDate: z.string().optional().nullable(),
  reorderPoint: z.coerce.number().min(0).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  description: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.type === 'Product' && data.productType === 'Inventory') {
    if (data.openingStock === undefined || data.openingStock === null || isNaN(Number(data.openingStock))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Opening Stock Quantity is required for inventory products',
        path: ['openingStock'],
      });
    }
  }
});

export const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  vendorCode: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email format').or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gst_number: z.string().optional().or(z.literal('')),
  gst_treatment: z.string().optional().or(z.literal('')),
  pan: z
    .string()
    .toUpperCase()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
      message: 'Invalid PAN format (e.g. AAAAA0000A)',
    }),
  payment_terms: z.string().optional().or(z.literal('')),
  currency: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  bank_name: z.string().optional().or(z.literal('')),
  bank_account_no: z.string().optional().or(z.literal('')),
  bank_ifsc: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  opening_balance: z.coerce.number().min(0, 'Opening balance cannot be negative').optional(),
});

export const billSchema = z.object({
  billNumber: z.string().min(1, 'Bill number is required'),
  vendorId: z.string().min(1, 'Vendor selection is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  date: z.string().min(1, 'Bill date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  referenceNumber: z.string().optional().or(z.literal('')),
  billingAddress: z.string().optional().or(z.literal('')),
  terms: z.string().optional().or(z.literal('')),
  discountType: z.string().optional().or(z.literal('')),
  discountValue: z.coerce.number().optional().or(z.literal('')),
  discountAmount: z.coerce.number().optional().or(z.literal('')),
  adjustment: z.coerce.number().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  termsConditions: z.string().optional().or(z.literal('')),
  taxPercent: z.coerce.number().optional().or(z.literal('')),
  taxAmount: z.coerce.number().optional().or(z.literal('')),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  customerId: z.string().min(1, 'Customer selection is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  date: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  referenceNumber: z.string().optional().or(z.literal('')),
  billingAddress: z.string().optional().or(z.literal('')),
  shippingAddress: z.string().optional().or(z.literal('')),
  terms: z.string().optional().or(z.literal('')),
  discountType: z.string().optional().or(z.literal('')),
  discountValue: z.coerce.number().optional().or(z.literal('')),
  discountAmount: z.coerce.number().optional().or(z.literal('')),
  shippingCharges: z.coerce.number().optional().or(z.literal('')),
  adjustment: z.coerce.number().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  termsConditions: z.string().optional().or(z.literal('')),
  taxPercent: z.coerce.number().optional().or(z.literal('')),
  taxAmount: z.coerce.number().optional().or(z.literal('')),
});

export const creditNoteSchema = z.object({
  creditNoteNumber: z.string().min(1, 'Credit Note number is required'),
  customerId: z.string().min(1, 'Customer selection is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  date: z.string().min(1, 'Credit Note date is required'),
  referenceNumber: z.string().optional().or(z.literal('')),
  referenceInvoiceId: z.string().optional().or(z.literal('')),
  billingAddress: z.string().optional().or(z.literal('')),
  shippingAddress: z.string().optional().or(z.literal('')),
  discountType: z.string().optional().or(z.literal('')),
  discountValue: z.coerce.number().optional().or(z.literal('')),
  discountAmount: z.coerce.number().optional().or(z.literal('')),
  adjustment: z.coerce.number().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  termsConditions: z.string().optional().or(z.literal('')),
  taxPercent: z.coerce.number().optional().or(z.literal('')),
  taxAmount: z.coerce.number().optional().or(z.literal('')),
});

export const estimateSchema = z.object({
  estimateNumber: z.string().min(1, 'Estimate number is required'),
  customerId: z.string().min(1, 'Customer selection is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  date: z.string().min(1, 'Estimate date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  referenceNumber: z.string().optional().or(z.literal('')),
  billingAddress: z.string().optional().or(z.literal('')),
  shippingAddress: z.string().optional().or(z.literal('')),
  terms: z.string().optional().or(z.literal('')),
  discountType: z.string().optional().or(z.literal('')),
  discountValue: z.coerce.number().optional().or(z.literal('')),
  discountAmount: z.coerce.number().optional().or(z.literal('')),
  shippingCharges: z.coerce.number().optional().or(z.literal('')),
  adjustment: z.coerce.number().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  termsConditions: z.string().optional().or(z.literal('')),
  taxPercent: z.coerce.number().optional().or(z.literal('')),
  taxAmount: z.coerce.number().optional().or(z.literal('')),
});

export const expenseSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  date: z.string().min(1, 'Expense date is required'),
  expenseAccount: z.string().min(1, 'Expense account is required'),
  paidThrough: z.string().min(1, 'Payment method is required'),
  vendorId: z.string().optional().or(z.literal('')),
  customerId: z.string().optional().or(z.literal('')),
  referenceNumber: z.string().optional().or(z.literal('')),
  isBillable: z.boolean().optional(),
  attachmentUrl: z.string().optional().or(z.literal('')),
  taxRate: z.coerce.number().optional().or(z.literal('')),
  taxAmount: z.coerce.number().optional().or(z.literal('')),
});

// export const projectSchema = z.object({
//   name: z.string().min(1, 'Project name is required'),
//   customerId: z.string().min(1, 'Customer selection is required'),
//   billingType: z.string().min(1, 'Billing type is required'),
//   rate: z.coerce.number().min(0, 'Rate cannot be negative'),
//   budget: z.coerce.number().min(0, 'Budget cannot be negative').optional(),
// });

export const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  gstin: z.string().optional().or(z.literal('')),
  is_gst_registered: z.boolean().optional(),
  address: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.is_gst_registered) {
    if (!data.gstin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GSTIN is required when registered',
        path: ['gstin'],
      });
    } else if (!gstinRegex.test(data.gstin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)',
        path: ['gstin'],
      });
    }
  }
});

export const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
});

export const timeEntrySchema = z.object({
  projectId: z.string().min(1, 'Project selection is required'),
  date: z.string().min(1, 'Date is required'),
  hours: z.coerce.number().min(0.01, 'Hours must be greater than zero'),
  description: z.string().optional().or(z.literal('')),
});

export const journalSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional().or(z.literal('')),
  items: z.array(z.object({
    account: z.string().min(1, 'Account is required'),
    debits: z.coerce.number().min(0, 'Debits cannot be negative'),
    credits: z.coerce.number().min(0, 'Credits cannot be negative'),
  })).min(2, 'At least 2 journal items are required')
}).superRefine((data, ctx) => {
  const totalDebits = data.items.reduce((sum, item) => sum + (Number(item.debits) || 0), 0);
  const totalCredits = data.items.reduce((sum, item) => sum + (Number(item.credits) || 0), 0);
  if (totalDebits <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Total debits must be greater than zero',
      path: ['items'],
    });
  }
  if (Math.abs(totalDebits - totalCredits) >= 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Journal is unbalanced (Total debits must equal total credits)',
      path: ['items'],
    });
  }
});
