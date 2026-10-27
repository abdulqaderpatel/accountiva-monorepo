import { describe, expect, it } from "vitest";

import {
  CREDIT_NOTE_STATUSES,
  ESTIMATE_STATUSES,
  INVOICE_STATUSES,
  buildInvoiceFromEstimate,
  calculateDocumentTotals,
  calculateFinancialDocumentSubtotal,
  calculateInvoiceOutstandingAmount,
  getDocumentSummaryDetails,
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

describe("calculateFinancialDocumentSubtotal", () => {
  it("uses persisted line amounts instead of inferring a subtotal from the total", () => {
    expect(
      calculateFinancialDocumentSubtotal([
        { quantity: 1, rate: 1000, amount: 1000 },
        { quantity: 2, rate: 125, amount: 250 },
      ]),
    ).toBe(1250);
  });

  it("falls back to quantity times rate when a persisted line amount is unavailable", () => {
    expect(calculateFinancialDocumentSubtotal([{ quantity: 3, rate: 20 }])).toBe(60);
  });
});

describe("calculateInvoiceOutstandingAmount", () => {
  it("subtracts camel-case and backend snake-case credit applications", () => {
    expect(
      calculateInvoiceOutstandingAmount({
        amount: 1180,
        credit_note_applications: [
          { amount_applied: 75 },
          { amountApplied: 25 },
        ],
      }),
    ).toBe(1080);
  });

  it("prefers an explicit server balance and never returns a negative amount", () => {
    expect(calculateInvoiceOutstandingAmount({ amount: 1180, balanceDue: 400 })).toBe(400);
    expect(
      calculateInvoiceOutstandingAmount({
        amount: 100,
        creditNoteApplications: [{ amountApplied: 125 }],
      }),
    ).toBe(0);
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

describe("calculateDocumentTotals", () => {
  it("calculates subtotal, percentage discount, GST, shipping, adjustment, and total per standard accounting principles", () => {
    const result = calculateDocumentTotals({
      items: [
        { itemName: "ProBake Commercial Convection Oven", quantity: 1, rate: 119000, amount: 119000 },
        { itemName: "Classic Bakeware set (6 pc)", quantity: 1, rate: 6000, amount: 6000 },
      ],
      discountType: "percentage",
      discountValue: 10,
      taxPercent: 18,
      shippingCharges: 1500,
      adjustment: -250,
    });

    // Subtotal = 119,000 + 6,000 = 125,000
    expect(result.subtotal).toBe(125000);
    // Discount = 10% of 125,000 = 12,500
    expect(result.discountAmount).toBe(12500);
    // Taxable = 125,000 - 12,500 = 112,500
    expect(result.taxableAmount).toBe(112500);
    // GST (18%) = 112,500 * 0.18 = 20,250
    expect(result.taxAmount).toBe(20250);
    expect(result.shippingCharges).toBe(1500);
    expect(result.adjustment).toBe(-250);
    // Total = 112,500 + 20,250 + 1,500 - 250 = 134,000
    expect(result.total).toBe(134000);
  });

  it("calculates fixed discount capped at subtotal", () => {
    const result = calculateDocumentTotals({
      items: [{ quantity: 2, rate: 500, amount: 1000 }],
      discountType: "fixed",
      discountValue: 200,
      taxPercent: 18,
      shippingCharges: 50,
    });

    expect(result.subtotal).toBe(1000);
    expect(result.discountAmount).toBe(200);
    expect(result.taxableAmount).toBe(800);
    expect(result.taxAmount).toBe(144);
    expect(result.total).toBe(994);
  });

  it("caps fixed discount to subtotal if discount exceeds subtotal", () => {
    const result = calculateDocumentTotals({
      items: [{ quantity: 1, rate: 100, amount: 100 }],
      discountType: "fixed",
      discountValue: 250,
      taxPercent: 18,
    });

    expect(result.subtotal).toBe(100);
    expect(result.discountAmount).toBe(100);
    expect(result.taxableAmount).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it("handles documents without line items using manualAmount", () => {
    const result = calculateDocumentTotals({
      items: [],
      manualAmount: 5000,
      discountType: "fixed",
      discountValue: 500,
      taxPercent: 18,
      shippingCharges: 100,
    });

    expect(result.subtotal).toBe(5000);
    expect(result.discountAmount).toBe(500);
    expect(result.taxableAmount).toBe(4500);
    expect(result.taxAmount).toBe(810);
    expect(result.total).toBe(5410);
  });
});

describe("getDocumentSummaryDetails", () => {
  it("normalizes both snake_case and camelCase fields from backend", () => {
    const doc = {
      estimate_items: [
        { name: "Item A", quantity: "2", rate: "1000", amount: "2000" },
      ],
      discount_type: "percentage",
      discount_value: "5",
      tax_percent: "18",
      shipping_charges: "120",
      adjustment: "-10",
    };

    const summary = getDocumentSummaryDetails(doc);
    expect(summary.subtotal).toBe(2000);
    expect(summary.discountAmount).toBe(100);
    expect(summary.taxableAmount).toBe(1900);
    expect(summary.taxAmount).toBe(342);
    expect(summary.shippingCharges).toBe(120);
    expect(summary.adjustment).toBe(-10);
    expect(summary.total).toBe(2352);
  });
});
