import { describe, expect, it } from "vitest";
import {
  getAmountOnlyInvoiceSubtotal,
  validateInvoiceForm,
} from "./invoiceFormValidation";

describe("validateInvoiceForm", () => {
  it("returns field errors for the required invoice values", () => {
    expect(
      validateInvoiceForm({
        invoiceNumber: "",
        customerId: "",
        amount: 0,
        date: "",
        dueDate: "",
      }),
    ).toEqual({
      invoiceNumber: "Invoice number is required",
      customerId: "Customer selection is required",
      amount: "Amount must be greater than zero",
      date: "Invoice date is required",
      dueDate: "Due date is required",
    });
  });

  it("accepts an amount-only invoice without catalog line items", () => {
    expect(
      validateInvoiceForm({
        invoiceNumber: "INV-1001",
        customerId: "2a38c01d-b3d4-4d7c-86c2-b2b339c39db8",
        amount: 1250,
        date: "2026-10-30",
        dueDate: "2026-11-29",
        items: [],
      }),
    ).toEqual({});
  });

  it("validates line items when they are present", () => {
    expect(
      validateInvoiceForm({
        invoiceNumber: "INV-1001",
        customerId: "2a38c01d-b3d4-4d7c-86c2-b2b339c39db8",
        amount: 1250,
        date: "2026-10-30",
        dueDate: "2026-11-29",
        items: [{ itemName: "Consulting", quantity: 0, rate: 1250, amount: 0 }],
      }),
    ).toEqual({ items: "Line item 1 quantity must be greater than zero." });
  });

  it("restores the pre-tax amount when editing an amount-only invoice", () => {
    expect(
      getAmountOnlyInvoiceSubtotal({
        amount: 1195,
        discountAmount: 50,
        taxAmount: 180,
        shippingCharges: 40,
        packagingCharges: 20,
        adjustment: 5,
      }),
    ).toBe(1000);
  });
});
