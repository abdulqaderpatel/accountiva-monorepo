import { describe, expect, it } from "vitest";
import {
  buildMobileCreditNotePayload,
  buildMobileEstimatePayload,
  buildMobileInvoicePayload,
  type MobileCreditNoteFormValues,
  type MobileEstimateFormValues,
  type MobileInvoiceFormValues,
} from "./payloads";

const values: MobileInvoiceFormValues = {
  invoiceNumber: "INV-0042",
  customerId: "customer-1",
  date: "2026-10-22",
  dueDate: "2026-11-21",
  status: "Draft",
  items: [
    {
      id: "line-1",
      itemId: "item-1",
      name: "Consulting",
      description: "Implementation support",
      quantity: 2,
      rate: 125,
    },
  ],
  discountType: "percentage",
  discountValue: "10",
  shippingCharges: "15",
  adjustment: "-5",
  taxPercent: 18,
  notes: "Thank you",
  termsConditions: "Net 30",
  customFields: { salesOrder: "SO-42" },
};

describe("buildMobileInvoicePayload", () => {
  it("retains native item references, descriptions, custom fields, and numeric totals", () => {
    expect(buildMobileInvoicePayload(values)).toEqual({
      invoiceNumber: "INV-0042",
      customerId: "customer-1",
      date: "2026-10-22",
      dueDate: "2026-11-21",
      status: "Draft",
      items: [
        {
          id: "line-1",
          itemId: "item-1",
          itemName: "Consulting",
          description: "Implementation support",
          quantity: 2,
          rate: 125,
          amount: 250,
        },
      ],
      amount: 275.5,
      discountType: "percentage",
      discountValue: 10,
      discountAmount: 25,
      shippingCharges: 15,
      adjustment: -5,
      taxPercent: 18,
      taxAmount: 40.5,
      notes: "Thank you",
      termsConditions: "Net 30",
      customFields: { salesOrder: "SO-42" },
    });
  });

  it("rejects a due date before the invoice date", () => {
    expect(() =>
      buildMobileInvoicePayload({ ...values, dueDate: "2026-10-21" }),
    ).toThrow(/due date/i);
  });

  it("rejects invalid native line items", () => {
    expect(() =>
      buildMobileInvoicePayload({
        ...values,
        items: [{ ...values.items[0], quantity: 0 }],
      }),
    ).toThrow(/quantity/i);
  });
});

describe("buildMobileEstimatePayload", () => {
  const estimateValues: MobileEstimateFormValues = {
    estimateNumber: "EST-0042",
    customerId: "customer-1",
    date: "2026-10-22",
    expiryDate: "2026-11-21",
    status: "Sent",
    items: [
      {
        id: "estimate-line-1",
        itemId: "item-1",
        name: "Mobile implementation",
        description: "Two implementation sessions",
        quantity: 2,
        rate: 100,
      },
    ],
    discountType: "fixed",
    discountValue: "10",
    shippingCharges: "5",
    adjustment: "-1",
    taxPercent: 18,
    notes: "Valid for 30 days",
    customFields: { opportunity: "OPP-42" },
  };

  it("maps estimate dates, items, totals, status, notes, and custom fields", () => {
    expect(buildMobileEstimatePayload(estimateValues)).toMatchObject({
      estimateNumber: "EST-0042",
      customerId: "customer-1",
      date: "2026-10-22",
      expiryDate: "2026-11-21",
      status: "Sent",
      amount: 228.2,
      discountAmount: 10,
      taxAmount: 34.2,
      notes: "Valid for 30 days",
      customFields: { opportunity: "OPP-42" },
      items: [
        {
          id: "estimate-line-1",
          itemId: "item-1",
          itemName: "Mobile implementation",
          description: "Two implementation sessions",
          quantity: 2,
          rate: 100,
          amount: 200,
        },
      ],
    });
  });

  it("rejects invalid estimate dates and items", () => {
    expect(() =>
      buildMobileEstimatePayload({ ...estimateValues, expiryDate: "2026-10-21" }),
    ).toThrow(/expiry date/i);
    expect(() =>
      buildMobileEstimatePayload({ ...estimateValues, items: [] }),
    ).toThrow(/line item/i);
  });
});

describe("buildMobileCreditNotePayload", () => {
  const creditNoteValues: MobileCreditNoteFormValues = {
    creditNoteNumber: "CN-0042",
    customerId: "customer-1",
    date: "2026-10-22",
    status: "Open",
    items: [
      {
        id: "credit-line-1",
        itemId: "item-1",
        name: "Returned implementation",
        description: "Unused implementation session",
        quantity: 2,
        rate: 100,
      },
    ],
    referenceInvoiceId: "invoice-1",
    discountType: "fixed",
    discountValue: "10",
    adjustment: "-1",
    taxPercent: 18,
    notes: "Customer requested credit",
    customFields: { returnAuthorization: "RA-42" },
  };

  it("maps a dated native credit note with valid lines, totals, references, and metadata", () => {
    expect(buildMobileCreditNotePayload(creditNoteValues)).toEqual({
      creditNoteNumber: "CN-0042",
      customerId: "customer-1",
      date: "2026-10-22",
      status: "Open",
      items: [
        {
          id: "credit-line-1",
          itemId: "item-1",
          itemName: "Returned implementation",
          description: "Unused implementation session",
          quantity: 2,
          rate: 100,
          amount: 200,
        },
      ],
      amount: 223.2,
      subtotal: 200,
      referenceInvoiceId: "invoice-1",
      discountType: "fixed",
      discountValue: 10,
      discountAmount: 10,
      adjustment: -1,
      taxPercent: 18,
      taxAmount: 34.2,
      notes: "Customer requested credit",
      customFields: { returnAuthorization: "RA-42" },
    });
  });

  it("rejects invalid dates and line items", () => {
    expect(() =>
      buildMobileCreditNotePayload({ ...creditNoteValues, date: "not-a-date" }),
    ).toThrow(/date/i);
    expect(() =>
      buildMobileCreditNotePayload({ ...creditNoteValues, items: [] }),
    ).toThrow(/line item/i);
  });
});
