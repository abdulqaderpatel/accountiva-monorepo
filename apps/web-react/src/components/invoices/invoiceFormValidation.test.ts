import { calculateDocumentTotals } from "@accountiva/shared";
import { describe, expect, it } from "vitest";
import {
  getAmountOnlyInvoiceEditState,
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

  it("preserves the total and manual round-off when reopening an amount-only invoice", () => {
    const persistedInvoice = {
      amount: 1186,
      discountType: "fixed",
      discountValue: 50,
      discountAmount: 50,
      taxPercent: 18,
      taxAmount: 171,
      shippingCharges: 40,
      packagingCharges: 20,
      adjustment: 5,
    };

    const editState = getAmountOnlyInvoiceEditState(persistedInvoice);
    const recalculated = calculateDocumentTotals({
      manualAmount: editState.manualAmount,
      discountType: persistedInvoice.discountType,
      discountValue: persistedInvoice.discountValue,
      taxPercent: persistedInvoice.taxPercent,
      shippingCharges: persistedInvoice.shippingCharges,
      packagingCharges: persistedInvoice.packagingCharges,
      roundOff: editState.roundOff,
      autoRoundOff: editState.autoRoundOff,
    });

    expect(editState).toEqual({ manualAmount: 1000, roundOff: 5, autoRoundOff: false });
    expect(recalculated.total).toBe(1186);
    expect(recalculated.roundOff).toBe(5);
  });
});
