import { describe, expect, it, vi } from "vitest";

import { convertEstimateToInvoice, type EstimateConversionDependencies } from "./estimateConversion";

const input = {
  estimateId: "estimate-1",
  estimate: {
    estimateNumber: "EST-0001",
    customerId: "customer-1",
    amount: 100,
    items: [
      {
        itemId: "item-1",
        itemName: "Consulting",
        quantity: 1,
        rate: 100,
        amount: 100,
      },
    ],
  },
  invoiceDate: "2026-10-22",
  dueDate: "2026-11-21",
};

function dependencies(overrides: Partial<EstimateConversionDependencies> = {}) {
  return {
    fetchNextInvoiceNumber: vi.fn().mockResolvedValue("INV-0008"),
    createInvoice: vi.fn().mockResolvedValue({ id: "invoice-8", invoiceNumber: "INV-0008" }),
    updateEstimateStatus: vi.fn().mockResolvedValue({ id: "estimate-1", status: "Invoiced" }),
    ...overrides,
  } satisfies EstimateConversionDependencies;
}

describe("convertEstimateToInvoice", () => {
  it("fetches a number, creates the invoice, then marks the estimate invoiced", async () => {
    const order: string[] = [];
    const deps = dependencies({
      fetchNextInvoiceNumber: vi.fn(async () => {
        order.push("number");
        return "INV-0008";
      }),
      createInvoice: vi.fn(async (payload) => {
        order.push("create");
        expect(payload).toMatchObject({
          invoiceNumber: "INV-0008",
          customerId: "customer-1",
          status: "Draft",
        });
        return { id: "invoice-8", invoiceNumber: "INV-0008" };
      }),
      updateEstimateStatus: vi.fn(async (id, status) => {
        order.push("status");
        expect([id, status]).toEqual(["estimate-1", "Invoiced"]);
        return { id, status };
      }),
    });

    await expect(convertEstimateToInvoice(input, deps)).resolves.toEqual({
      status: "complete",
      invoiceNumber: "INV-0008",
      invoice: { id: "invoice-8", invoiceNumber: "INV-0008" },
    });
    expect(order).toEqual(["number", "create", "status"]);
  });

  it("does not update estimate status when invoice creation fails", async () => {
    const creationError = new Error("creation failed");
    const deps = dependencies({ createInvoice: vi.fn().mockRejectedValue(creationError) });

    await expect(convertEstimateToInvoice(input, deps)).rejects.toBe(creationError);
    expect(deps.updateEstimateStatus).not.toHaveBeenCalled();
  });

  it("returns a truthful partial result when the status update fails", async () => {
    const statusError = new Error("status failed");
    const deps = dependencies({ updateEstimateStatus: vi.fn().mockRejectedValue(statusError) });

    await expect(convertEstimateToInvoice(input, deps)).resolves.toEqual({
      status: "invoice-created-status-pending",
      invoiceNumber: "INV-0008",
      invoice: { id: "invoice-8", invoiceNumber: "INV-0008" },
      error: statusError,
    });
  });

  it("normalizes a mobile-shaped estimate before creating the invoice", async () => {
    const deps = dependencies();
    const mobileInput = {
      estimateId: "estimate-mobile",
      estimate: {
        number: "EST-MOBILE-1",
        customers: { id: "customer-mobile", name: "Mobile Customer" },
        amount: 236,
        taxPercent: 18,
        taxAmount: 36,
        notes: "Created on mobile",
        items: [
          {
            id: "line-mobile",
            itemId: "item-mobile",
            name: "Mobile service",
            description: "Native line description",
            quantity: 2,
            rate: 100,
            amount: 200,
          },
        ],
      },
      invoiceDate: "2026-10-22",
      dueDate: "2026-11-21",
    };

    await convertEstimateToInvoice(mobileInput, deps);

    expect(deps.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      invoiceNumber: "INV-0008",
      customerId: "customer-mobile",
      date: "2026-10-22",
      dueDate: "2026-11-21",
      amount: 236,
      status: "Draft",
      taxAmount: 36,
      items: [
        expect.objectContaining({
          id: "line-mobile",
          itemId: "item-mobile",
          itemName: "Mobile service",
          description: "Native line description",
          quantity: 2,
          rate: 100,
          amount: 200,
        }),
      ],
    }));
  });
});
