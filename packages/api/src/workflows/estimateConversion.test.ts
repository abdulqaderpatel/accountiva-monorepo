import { describe, expect, it, vi } from "vitest";

import { convertEstimateToInvoice, type EstimateConversionDependencies } from "./estimateConversion";

const validCatalogItemId = "c0000000-0000-0000-0000-000000000001";
const validCustomerId = "d0000000-0000-0000-0000-000000000001";

const input = {
  estimateId: "estimate-1",
  estimate: {
    estimateNumber: "EST-0001",
    customerId: validCustomerId,
    amount: 100,
    items: [
      {
        itemId: validCatalogItemId,
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
          customerId: validCustomerId,
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
        customers: { id: validCustomerId, name: "Mobile Customer" },
        amount: 236,
        taxPercent: 18,
        taxAmount: 36,
        notes: "Created on mobile",
        items: [
          {
            id: "line-mobile",
            itemId: validCatalogItemId,
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
      customerId: validCustomerId,
      date: "2026-10-22",
      dueDate: "2026-11-21",
      amount: 236,
      status: "Draft",
      taxAmount: 36,
      items: [
        expect.objectContaining({
          id: "line-mobile",
          itemId: validCatalogItemId,
          itemName: "Mobile service",
          description: "Native line description",
          quantity: 2,
          rate: 100,
          amount: 200,
        }),
      ],
    }));
  });

  it("sanitizes ad-hoc non-UUID item IDs so backend does not reject them", async () => {
    const deps = dependencies();
    const customItemInput = {
      estimateId: "estimate-custom",
      estimate: {
        number: "EST-CUSTOM-1",
        customerId: validCustomerId,
        amount: 150,
        items: [
          {
            id: "custom-1729000000000",
            itemId: "custom-1729000000000", // Non-UUID custom id
            name: "Custom Service Item",
            quantity: 1,
            rate: 150,
            amount: 150,
          },
        ],
      },
      invoiceDate: "2026-10-22",
      dueDate: "2026-11-21",
    };

    await convertEstimateToInvoice(customItemInput, deps);

    expect(deps.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      items: [
        expect.objectContaining({
          itemId: undefined,
          itemName: "Custom Service Item",
          quantity: 1,
          rate: 150,
          amount: 150,
        }),
      ],
    }));
  });

  it("falls back to fetching full estimate from API if customerId is missing from input", async () => {
    const fetchEstimate = vi.fn().mockResolvedValue({
      id: "estimate-remote",
      estimateNumber: "EST-REMOTE-1",
      customerId: validCustomerId,
      amount: 500,
      items: [
        {
          id: "item-remote",
          itemId: validCatalogItemId,
          itemName: "Remote Line Item",
          quantity: 1,
          rate: 500,
          amount: 500,
        },
      ],
    });

    const deps = dependencies({ fetchEstimate });
    const missingCustomerInput = {
      estimateId: "estimate-remote",
      estimate: {
        number: "EST-REMOTE-1",
        // customerId intentionally missing
        amount: 500,
        items: [],
      },
      invoiceDate: "2026-10-22",
      dueDate: "2026-11-21",
    };

    const result = await convertEstimateToInvoice(missingCustomerInput, deps);

    expect(fetchEstimate).toHaveBeenCalledWith("estimate-remote");
    expect(deps.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      customerId: validCustomerId,
      amount: 500,
    }));
    expect(result.status).toBe("complete");
  });
});
