import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice, Refund } from "@/db/schema";

vi.mock("../repository/invoice.repository", () => ({
  invoiceRepository: { findByIdAny: vi.fn() },
}));

vi.mock("../repository/refund.repository", () => ({
  refundRepository: { findByInvoiceId: vi.fn(), create: vi.fn(), findById: vi.fn(), updateStatus: vi.fn() },
}));

vi.mock("@/features/notifications/services/notify-owner.service", () => ({
  notifyWorkspaceOwner: vi.fn(),
}));

const { invoiceRepository } = await import("../repository/invoice.repository");
const { refundRepository } = await import("../repository/refund.repository");
const { notifyWorkspaceOwner } = await import("@/features/notifications/services/notify-owner.service");
const { refundService } = await import("./refund.service");

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "invoice-1",
    workspaceId: "workspace-1",
    planId: "plan-1",
    planName: "Pro",
    invoiceNumber: "INV-000001",
    amount: "100.00",
    currency: "USD",
    status: "paid",
    periodDays: 30,
    issuedAt: new Date(),
    paidAt: new Date(),
    dueAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeRefund(overrides: Partial<Refund> = {}): Refund {
  return {
    id: "refund-1",
    workspaceId: "workspace-1",
    invoiceId: "invoice-1",
    amount: "50.00",
    currency: "USD",
    reason: "Customer requested",
    status: "requested",
    decidedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refundService.create", () => {
  it("creates a refund for a paid invoice within its remaining balance", async () => {
    vi.mocked(invoiceRepository.findByIdAny).mockResolvedValue(makeInvoice());
    vi.mocked(refundRepository.findByInvoiceId).mockResolvedValue([]);
    vi.mocked(refundRepository.create).mockResolvedValue(makeRefund());

    await refundService.create("invoice-1", "50.00", "Customer requested");

    expect(refundRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", invoiceId: "invoice-1", amount: "50.00", currency: "USD" }),
    );
  });

  it("rejects a refund against an invoice that doesn't exist", async () => {
    vi.mocked(invoiceRepository.findByIdAny).mockResolvedValue(null);

    await expect(refundService.create("missing", "10.00", "reason")).rejects.toThrow("Invoice not found");
  });

  it("rejects a refund against an invoice that hasn't been paid", async () => {
    vi.mocked(invoiceRepository.findByIdAny).mockResolvedValue(makeInvoice({ status: "pending" }));

    await expect(refundService.create("invoice-1", "10.00", "reason")).rejects.toThrow("Only a paid invoice");
  });

  it("rejects a refund that exceeds the invoice's remaining refundable balance", async () => {
    vi.mocked(invoiceRepository.findByIdAny).mockResolvedValue(makeInvoice({ amount: "100.00" }));
    vi.mocked(refundRepository.findByInvoiceId).mockResolvedValue([makeRefund({ amount: "60.00", status: "completed" })]);

    await expect(refundService.create("invoice-1", "50.00", "reason")).rejects.toThrow("remaining refundable balance");
  });

  it("ignores rejected refunds when computing the already-refunded total", async () => {
    vi.mocked(invoiceRepository.findByIdAny).mockResolvedValue(makeInvoice({ amount: "100.00" }));
    vi.mocked(refundRepository.findByInvoiceId).mockResolvedValue([makeRefund({ amount: "90.00", status: "rejected" })]);
    vi.mocked(refundRepository.create).mockResolvedValue(makeRefund());

    await expect(refundService.create("invoice-1", "50.00", "reason")).resolves.toBeDefined();
  });
});

describe("refundService.decide", () => {
  it("moves a requested refund to approved", async () => {
    vi.mocked(refundRepository.findById).mockResolvedValue(makeRefund({ status: "requested" }));
    vi.mocked(refundRepository.updateStatus).mockResolvedValue(makeRefund({ status: "approved" }));

    const result = await refundService.decide("refund-1", "approved");

    expect(result.status).toBe("approved");
    expect(refundRepository.updateStatus).toHaveBeenCalledWith("refund-1", "approved", expect.any(Date));
    expect(notifyWorkspaceOwner).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", type: "billing" }),
    );
  });

  it("rejects an invalid transition (e.g. rejected -> completed)", async () => {
    vi.mocked(refundRepository.findById).mockResolvedValue(makeRefund({ status: "rejected" }));

    await expect(refundService.decide("refund-1", "completed")).rejects.toThrow("Cannot move a refund");
    expect(refundRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("throws when the refund doesn't exist", async () => {
    vi.mocked(refundRepository.findById).mockResolvedValue(null);

    await expect(refundService.decide("missing", "approved")).rejects.toThrow("Refund not found");
  });
});
