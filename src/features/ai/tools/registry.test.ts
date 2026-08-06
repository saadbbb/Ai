import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product, Service } from "@/db/schema";
import type { OrderListItem } from "@/features/orders/repository/order.repository";

vi.mock("../repository/tool-execution.repository", () => ({
  toolExecutionRepository: { create: vi.fn() },
}));

vi.mock("@/features/automation/services/automation.service", () => ({
  automationService: { dispatch: vi.fn() },
}));

vi.mock("@/features/crm/repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("@/features/crm/services/crm.service", () => ({
  crmService: { createLeadFromConversation: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { addTag: vi.fn(), update: vi.fn() },
}));

vi.mock("@/features/appointments/services/appointment.service", () => ({
  appointmentService: { createAppointment: vi.fn() },
}));

vi.mock("@/features/knowledge-base/repository/service.repository", () => ({
  serviceRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/knowledge-base/repository/product.repository", () => ({
  productRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/orders/services/order.service", () => ({
  orderService: { createOrder: vi.fn() },
}));

const { toolExecutionRepository } = await import("../repository/tool-execution.repository");
const { automationService } = await import("@/features/automation/services/automation.service");
const { crmService } = await import("@/features/crm/services/crm.service");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { appointmentService } = await import("@/features/appointments/services/appointment.service");
const { serviceRepository } = await import("@/features/knowledge-base/repository/service.repository");
const { productRepository } = await import("@/features/knowledge-base/repository/product.repository");
const { orderService } = await import("@/features/orders/services/order.service");
const { createToolDispatcher } = await import("./registry");

const BASE = { workspaceId: "workspace-1", contactId: "contact-1", conversationId: "conversation-1" };

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    workspaceId: BASE.workspaceId,
    name: "Widget",
    description: null,
    price: "19.99",
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: "service-1",
    workspaceId: BASE.workspaceId,
    name: "Haircut",
    description: null,
    price: "25.00",
    durationMinutes: 45,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createToolDispatcher", () => {
  it("returns an error result for an unknown tool without touching any repository", async () => {
    const { executeTool } = createToolDispatcher(BASE);
    const result = await executeTool("delete_everything", {});

    expect(result.isError).toBe(true);
    expect(toolExecutionRepository.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input before calling the tool's execute function", async () => {
    const { executeTool } = createToolDispatcher(BASE);
    const result = await executeTool("add_tag", {});

    expect(result.isError).toBe(true);
    expect(contactRepository.addTag).not.toHaveBeenCalled();
    expect(toolExecutionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "add_tag", success: false }),
    );
  });

  it("runs add_tag and logs a successful execution", async () => {
    const { executeTool } = createToolDispatcher(BASE);
    const result = await executeTool("add_tag", { tag: "VIP" });

    expect(result.isError).toBe(false);
    expect(contactRepository.addTag).toHaveBeenCalledWith("contact-1", "workspace-1", "VIP");
    expect(automationService.dispatch).toHaveBeenCalledWith("workspace-1", {
      type: "tag_added",
      contactId: "contact-1",
      tag: "VIP",
    });
    expect(toolExecutionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "add_tag", success: true }),
    );
  });

  it("creates a lead scoped to the conversation in context, never a client-supplied id", async () => {
    const { executeTool } = createToolDispatcher(BASE);
    await executeTool("create_lead", {});

    expect(crmService.createLeadFromConversation).toHaveBeenCalledWith("workspace-1", "conversation-1", { type: "ai" });
  });

  it("sets the handover signal without touching aiStatus directly", async () => {
    const { executeTool, signals } = createToolDispatcher(BASE);
    const result = await executeTool("request_human_handover", { reason: "Refund request" });

    expect(result.isError).toBe(false);
    expect(signals.handoverRequested).toBe(true);
    expect(signals.handoverReason).toBe("Refund request");
  });

  it("book_appointment matches a listed service by name (case-insensitive)", async () => {
    vi.mocked(serviceRepository.findByWorkspaceId).mockResolvedValue([makeService()]);
    vi.mocked(appointmentService.createAppointment).mockResolvedValue({
      id: "appt-1",
      serviceName: "Haircut",
      scheduledAt: new Date("2099-01-01T10:00:00Z"),
    } as never);

    const { executeTool } = createToolDispatcher(BASE);
    const result = await executeTool("book_appointment", {
      serviceName: "haircut",
      scheduledAt: "2099-01-01T10:00:00Z",
    });

    expect(result.isError).toBe(false);
    expect(appointmentService.createAppointment).toHaveBeenCalledWith(
      "workspace-1",
      expect.objectContaining({ serviceId: "service-1", durationMinutes: 45 }),
      { type: "ai" },
    );
  });

  it("book_appointment rejects a time in the past", async () => {
    vi.mocked(serviceRepository.findByWorkspaceId).mockResolvedValue([]);

    const { executeTool } = createToolDispatcher(BASE);
    const result = await executeTool("book_appointment", { scheduledAt: "2020-01-01T10:00:00Z" });

    expect(result.isError).toBe(true);
    expect(appointmentService.createAppointment).not.toHaveBeenCalled();
  });

  it("create_order rejects a product that isn't in the catalog rather than inventing a price", async () => {
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([]);

    const { executeTool } = createToolDispatcher(BASE);
    const result = await executeTool("create_order", { items: [{ productName: "Ghost Product", quantity: 1 }] });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("Ghost Product");
    expect(orderService.createOrder).not.toHaveBeenCalled();
  });

  it("create_order rejects a matched product that has no price set", async () => {
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([makeProduct({ price: null })]);

    const { executeTool } = createToolDispatcher(BASE);
    const result = await executeTool("create_order", { items: [{ productName: "Widget", quantity: 1 }] });

    expect(result.isError).toBe(true);
    expect(orderService.createOrder).not.toHaveBeenCalled();
  });

  it("create_order matches catalog products and passes their real price through, never the model's guess", async () => {
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([makeProduct()]);
    vi.mocked(orderService.createOrder).mockResolvedValue({
      order: { id: "order-1" },
      contact: { id: "contact-1" },
      items: [{ unitPrice: "19.99", quantity: 2 }],
    } as unknown as OrderListItem);

    const { executeTool } = createToolDispatcher(BASE);
    const result = await executeTool("create_order", { items: [{ productName: "widget", quantity: 2 }] });

    expect(result.isError).toBe(false);
    expect(orderService.createOrder).toHaveBeenCalledWith(
      "workspace-1",
      expect.objectContaining({
        contactId: "contact-1",
        items: [{ productId: "product-1", name: "Widget", unitPrice: "19.99", quantity: 2 }],
      }),
      { type: "ai" },
    );
  });
});
