import { describe, expect, it } from "vitest";

import {
  CREDIT_NOTE_STATUSES,
  ESTIMATE_STATUSES,
  INVOICE_STATUSES,
  buildInvoiceFromEstimate,
  isDuplicateDocumentNumberError,
  validateFinancialDocumentDates,
  validateFinancialLineItems,
  type EstimateConversionSource,
  type FinancialLineItemInput,
} from "./financialDocuments";

const validItems: FinancialLineItemInput[] = [
  {
    id: "estimate-line-1",
    itemId: "item-1",
    itemName: "Consulting",
    description: "Architecture workshop",
    quantity: 2,
    rate: 125,
    amount: 250,
  },
];

describe("financial document statuses", () => {
  it("matches the backend status contracts exactly", () => {
    expect(INVOICE_STATUSES).toEqual(["Draft", "Outstanding", "Paid"]);
    expect(ESTIMATE_STATUSES).toEqual([
      "Draft",
      "Sent",
      "Accepted",
      "Declined",
      "Invoiced",
    ]);
    expect(CREDIT_NOTE_STATUSES).toEqual(["Draft", "Open", "Closed", "Void"]);
  });
});

describe("validateFinancialLineItems", () => {
  it("accepts valid line items", () => {
    expect(validateFinancialLineItems(validItems)).toBeNull();
  });

  it.each([
    ["empty items", []],
    ["blank item name", [{ ...validItems[0], itemName: "   " }]],
    ["zero quantity", [{ ...validItems[0], quantity: 0 }]],
    ["negative rate", [{ ...validItems[0], rate: -1 }]],
    ["non-finite rate", [{ ...validItems[0], rate: Number.NaN }]],
  ])("rejects %s", (_label, items) => {
    expect(validateFinancialLineItems(items as FinancialLineItemInput[])).toEqual(
      expect.any(String),
    );
  });
});

describe("validateFinancialDocumentDates", () => {
  it("accepts ordered ISO dates", () => {
    expect(validateFinancialDocumentDates("2026-10-22", "2026-11-22", "Due date")).toBeNull();
  });

  it("rejects an invalid issue date", () => {
    expect(validateFinancialDocumentDates("not-a-date", "2026-11-22", "Due date")).toMatch(
      /date/i,
    );
  });

  it("rejects an invalid end date", () => {
    expect(validateFinancialDocumentDates("2026-10-22", "not-a-date", "Expiry date")).toMatch(
      /expiry date/i,
    );
  });

  it("rejects an end date before the issue date", () => {
    expect(validateFinancialDocumentDates("2026-10-22", "2026-10-21", "Due date")).toMatch(
      /due date/i,
    );
  });
});

describe("buildInvoiceFromEstimate", () => {
  const estimate: EstimateConversionSource = {
    estimateNumber: "EST-0042",
    customerId: "customer-1",
    amount: 270,
    items: validItems,
    referenceNumber: "PO-12",
    billingAddress: "1 Market Road",
    shippingAddress: "2 Delivery Lane",
    terms: "Net 30",
    discountType: "percentage",
    discountValue: 10,
    discountAmount: 25,
    shippingCharges: 10,
    adjustment: 5,
    notes: "Customer requested morning delivery.",
    termsConditions: "Payment due within 30 days.",
    taxPercent: 12,
    taxAmount: 30,
    customFields: { purchaseOrder: "PO-12" },
  };

  it("builds a complete draft invoice while preserving financial data", () => {
    const result = buildInvoiceFromEstimate(estimate, {
      invoiceNumber: "INV-0101",
      date: "2026-10-22",
      dueDate: "2026-11-21",
    });

    expect(result).toEqual({
      invoiceNumber: "INV-0101",
      customerId: "customer-1",
      date: "2026-10-22",
      dueDate: "2026-11-21",
      amount: 270,
      status: "Draft",
      items: validItems,
      referenceNumber: "PO-12",
      billingAddress: "1 Market Road",
      shippingAddress: "2 Delivery Lane",
      terms: "Net 30",
      discountType: "percentage",
      discountValue: 10,
      discountAmount: 25,
      shippingCharges: 10,
      adjustment: 5,
      notes:
        "Converted from Estimate EST-0042.\n\nCustomer requested morning delivery.",
      termsConditions: "Payment due within 30 days.",
      taxPercent: 12,
      taxAmount: 30,
      customFields: { purchaseOrder: "PO-12" },
    });
    expect(result.items[0]).not.toBe(validItems[0]);
  });

  it("rejects an estimate without a customer", () => {
    expect(() =>
      buildInvoiceFromEstimate(
        { ...estimate, customerId: "" },
        { invoiceNumber: "INV-0101", date: "2026-10-22", dueDate: "2026-11-21" },
      ),
    ).toThrow(/customer/i);
  });

  it("rejects reversed invoice dates during conversion", () => {
    expect(() =>
      buildInvoiceFromEstimate(estimate, {
        invoiceNumber: "INV-0101",
        date: "2026-11-21",
        dueDate: "2026-10-22",
      }),
    ).toThrow(/due date/i);
  });

  it("rejects invalid estimate line items during conversion", () => {
    expect(() =>
      buildInvoiceFromEstimate(
        { ...estimate, items: [{ ...validItems[0], quantity: 0 }] },
        { invoiceNumber: "INV-0101", date: "2026-10-22", dueDate: "2026-11-21" },
      ),
    ).toThrow(/quantity/i);
  });
});

describe("isDuplicateDocumentNumberError", () => {
  it("recognizes a 409 response", () => {
    expect(isDuplicateDocumentNumberError({ response: { status: 409 } })).toBe(true);
  });

  it("does not treat other responses as number conflicts", () => {
    expect(isDuplicateDocumentNumberError({ response: { status: 400 } })).toBe(false);
    expect(isDuplicateDocumentNumberError(new Error("network unavailable"))).toBe(false);
  });
});
