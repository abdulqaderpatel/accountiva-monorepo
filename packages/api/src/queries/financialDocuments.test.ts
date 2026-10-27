import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "../client";
import {
  bulkUpdateInvoiceStatus,
  createInvoice,
  fetchNextInvoiceNumber,
  updateInvoice,
  updateInvoiceStatus,
} from "./invoices";
import {
  createEstimate,
  fetchNextEstimateNumber,
  sendEstimate,
  updateEstimate,
  updateEstimateStatus,
} from "./estimates";
import {
  applyCreditNote,
  createCreditNote,
  fetchCreditNote,
  fetchNextCreditNoteNumber,
  updateCreditNote,
  updateCreditNoteStatus,
} from "./creditNotes";
import type { CreditNotePayload, EstimatePayload, InvoicePayload } from "@accountiva/shared";

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const mockedPatch = vi.mocked(api.patch);
const mockedPut = vi.mocked(api.put);

const item = {
  itemId: "item-1",
  itemName: "Consulting",
  quantity: 1,
  rate: 100,
  amount: 100,
};

const invoice: InvoicePayload = {
  invoiceNumber: "INV-0001",
  customerId: "customer-1",
  date: "2026-10-22",
  dueDate: "2026-11-21",
  amount: 100,
  status: "Draft",
  items: [item],
};

const estimate: EstimatePayload = {
  estimateNumber: "EST-0001",
  customerId: "customer-1",
  date: "2026-10-22",
  expiryDate: "2026-11-21",
  amount: 100,
  status: "Draft",
  items: [item],
};

const creditNote: CreditNotePayload = {
  creditNoteNumber: "CN-0001",
  customerId: "customer-1",
  date: "2026-10-22",
  amount: 100,
  status: "Draft",
  items: [item],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("next document numbers", () => {
  it.each([
    ["invoice", fetchNextInvoiceNumber, "/invoices/next-number", "INV-0002"],
    ["estimate", fetchNextEstimateNumber, "/estimates/next-number", "EST-0002"],
    ["credit note", fetchNextCreditNoteNumber, "/credit-notes/next-number", "CN-0002"],
  ] as const)("fetches and normalizes the next %s number", async (_label, fetchNumber, url, number) => {
    mockedGet.mockResolvedValueOnce({ data: { nextNumber: ` ${number} ` } } as never);

    await expect(fetchNumber()).resolves.toBe(number);
    expect(mockedGet).toHaveBeenCalledWith(url);
  });

  it.each([
    [fetchNextInvoiceNumber, { nextNumber: "" }],
    [fetchNextEstimateNumber, { number: "EST-0002" }],
    [fetchNextCreditNoteNumber, null],
  ] as const)("rejects a malformed next-number response", async (fetchNumber, data) => {
    mockedGet.mockResolvedValueOnce({ data } as never);
    await expect(fetchNumber()).rejects.toThrow(/next/i);
  });
});

describe("invoice requests", () => {
  it("uses POST for create and PATCH for full update", async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: "invoice-1" } } as never);
    mockedPatch.mockResolvedValueOnce({ data: { id: "invoice-1" } } as never);

    await createInvoice(invoice);
    await updateInvoice("invoice-1", invoice);

    expect(mockedPost).toHaveBeenCalledWith("/invoices", invoice);
    expect(mockedPatch).toHaveBeenCalledWith("/invoices/invoice-1", invoice);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it("uses dedicated single and bulk status endpoints", async () => {
    mockedPatch.mockResolvedValue({ data: { ok: true } } as never);

    await updateInvoiceStatus("invoice-1", "Outstanding");
    await bulkUpdateInvoiceStatus(["invoice-1", "invoice-2"], "Paid");

    expect(mockedPatch).toHaveBeenNthCalledWith(
      1,
      "/invoices/invoice-1/status",
      { status: "Outstanding" },
    );
    expect(mockedPatch).toHaveBeenNthCalledWith(
      2,
      "/invoices/bulk-status",
      { ids: ["invoice-1", "invoice-2"], status: "Paid" },
    );
  });

  it("propagates a duplicate conflict and only fetches a replacement number when asked", async () => {
    const completeFormPayload: InvoicePayload = {
      ...invoice,
      referenceNumber: "PO-2026-17",
      billingAddress: "1 Market Road",
      shippingAddress: "2 Delivery Lane",
      terms: "Net 30",
      discountType: "percentage",
      discountValue: 5,
      discountAmount: 5,
      shippingCharges: 10,
      adjustment: 0,
      notes: "Thank you for your business.",
      termsConditions: "Payment is due within 30 days.",
      taxPercent: 18,
      taxAmount: 18,
      customFields: { purchaseOrder: "PO-2026-17" },
    };
    const conflict = { response: { status: 409, data: { error: "Number already exists" } } };
    mockedPost.mockRejectedValueOnce(conflict);
    mockedGet.mockResolvedValueOnce({ data: { nextNumber: "INV-0002" } } as never);

    await expect(createInvoice(completeFormPayload)).rejects.toBe(conflict);
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedGet).not.toHaveBeenCalled();

    await expect(fetchNextInvoiceNumber()).resolves.toBe("INV-0002");
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });
});

describe("estimate requests", () => {
  it("uses POST, PATCH, and the dedicated status endpoint", async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: "estimate-1" } } as never);
    mockedPatch.mockResolvedValue({ data: { id: "estimate-1" } } as never);

    await createEstimate(estimate);
    await updateEstimate("estimate-1", estimate);
    await updateEstimateStatus("estimate-1", "Invoiced");

    expect(mockedPost).toHaveBeenCalledWith("/estimates", estimate);
    expect(mockedPatch).toHaveBeenNthCalledWith(1, "/estimates/estimate-1", estimate);
    expect(mockedPatch).toHaveBeenNthCalledWith(
      2,
      "/estimates/estimate-1/status",
      { status: "Invoiced" },
    );
  });
});

describe("credit-note requests", () => {
  it("fetches full credit-note details", async () => {
    mockedGet.mockResolvedValueOnce({ data: { id: "credit-note-1", items: [item] } } as never);

    await expect(fetchCreditNote("credit-note-1")).resolves.toMatchObject({
      id: "credit-note-1",
      items: [item],
    });
    expect(mockedGet).toHaveBeenCalledWith("/credit-notes/credit-note-1");
  });

  it("sends dated line-item payloads through POST and PATCH", async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: "credit-note-1" } } as never);
    mockedPatch.mockResolvedValue({ data: { id: "credit-note-1" } } as never);

    await createCreditNote(creditNote);
    await updateCreditNote("credit-note-1", creditNote);

    expect(mockedPost).toHaveBeenCalledWith("/credit-notes", creditNote);
    expect(mockedPatch).toHaveBeenNthCalledWith(1, "/credit-notes/credit-note-1", creditNote);
    expect(creditNote.date).toBe("2026-10-22");
    expect(creditNote.items).toHaveLength(1);
  });

  it("uses the dedicated status endpoint for the direct Open and Void actions", async () => {
    mockedPatch.mockResolvedValue({ data: { id: "credit-note-1" } } as never);

    await updateCreditNoteStatus("credit-note-1", "Open");
    await updateCreditNoteStatus("credit-note-1", "Void");

    expect(mockedPatch).toHaveBeenNthCalledWith(
      1,
      "/credit-notes/credit-note-1/status",
      { status: "Open" },
    );
    expect(mockedPatch).toHaveBeenNthCalledWith(
      2,
      "/credit-notes/credit-note-1/status",
      { status: "Void" },
    );
  });

  it("posts an application to the credit-note apply endpoint", async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } } as never);

    await applyCreditNote("credit-note-1", { invoiceId: "invoice-1", amountApplied: 75 });

    expect(mockedPost).toHaveBeenCalledWith("/credit-notes/credit-note-1/apply", {
      invoiceId: "invoice-1",
      amountApplied: 75,
    });
  });

  it("propagates an application conflict unchanged", async () => {
    const conflict = {
      response: { status: 409, data: { error: "Credit or invoice balance changed" } },
    };
    mockedPost.mockRejectedValueOnce(conflict);

    await expect(
      applyCreditNote("credit-note-1", { invoiceId: "invoice-1", amountApplied: 75 }),
    ).rejects.toBe(conflict);
    expect(conflict.response.status).toBe(409);
  });

  it("keeps validation and network application failures distinct from stale-balance conflicts", async () => {
    const validation = {
      response: { status: 400, data: { error: "Applied amount must be greater than zero" } },
    };
    const network = new Error("Network unavailable");
    mockedPost.mockRejectedValueOnce(validation).mockRejectedValueOnce(network);

    await expect(
      applyCreditNote("credit-note-1", { invoiceId: "invoice-1", amountApplied: 0 }),
    ).rejects.toBe(validation);
    await expect(
      applyCreditNote("credit-note-1", { invoiceId: "invoice-1", amountApplied: 10 }),
    ).rejects.toBe(network);

    expect(validation.response.status).not.toBe(409);
    expect((network as any).response?.status).toBeUndefined();
  });

  it("sends estimate via email with PDF attachment payload", async () => {
    mockedPost.mockResolvedValueOnce({
      data: { message: "Estimate with PDF sent successfully to client@example.com" },
    } as never);

    const result = await sendEstimate("est-1", {
      recipientEmail: "client@example.com",
      subject: "Your Estimate",
      message: "Please find attached the quote.",
    });

    expect(mockedPost).toHaveBeenCalledWith("/estimates/est-1/send", {
      recipientEmail: "client@example.com",
      subject: "Your Estimate",
      message: "Please find attached the quote.",
    });
    expect(result.message).toContain("sent successfully");
  });
});
