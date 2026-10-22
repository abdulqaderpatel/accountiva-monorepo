import { describe, expect, it } from "vitest";
import { buildMobileInvoicePayload, type MobileInvoiceFormValues } from "./payloads";

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
