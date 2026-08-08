import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Order } from "@/db/schema";
import type { OrderListItem } from "../repository/order.repository";

vi.mock("@/features/crm/repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("@/features/crm/services/crm.service", () => ({
  crmService: { advanceLifecycleStage: vi.fn() },
}));

vi.mock("@/features/automation/services/automation.service", () => ({
  automationService: { dispatch: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findById: vi.fn() },
}));

vi.mock("../repository/order.repository", () => ({
  orderRepository: {
    findByWorkspaceId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock("@/features/notifications/services/notify-owner.service", () => ({
  notifyWorkspaceOwner: vi.fn(),
}));

const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { crmService } = await import("@/features/crm/services/crm.service");
const { automationService } = await import("@/features/automation/services/automation.service");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { orderRepository } = await import("../repository/order.repository");
const { notifyWorkspaceOwner } = await import("@/features/notifications/services/notify-owner.service");
const { orderService } = await import("./order.service");

const WORKSPACE_ID = "workspace-1";
const CONTACT_ID = "contact-1";
const ACTOR = { type: "human" as const, userId: "user-1" };
const ZERO_ADJUSTMENTS = { discountAmount: "0", taxAmount: "0", deliveryFee: "0" };

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    workspaceId: WORKSPACE_ID,
    fullName: "Jane Customer",
    phone: null,
    whatsappId: null,
    instagramId: null,
    email: null,
    language: null,
    tags: [],
    notes: null,
    aiSummary: null,
    avatarUrl: null,
    country: null,
    city: null,
    source: null,
    lifecycleStage: "lead",
    assignedAgentId: null,
    lastContactAt: null,
    address: null,
    budget: null,
    preferredContactMethod: null,
    preferredProducts: [],
    birthDate: null,
    gender: null,
    timezone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    workspaceId: WORKSPACE_ID,
    contactId: CONTACT_ID,
    conversationId: null,
    status: "pending",
    discountAmount: "0",
    taxAmount: "0",
    deliveryFee: "0",
    paymentMethod: null,
    deliveryMethod: null,
    deliveryAddress: null,
    notes: null,
    followupNotifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeOrderListItem(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    order: makeOrder(),
    contact: makeContact(),
    items: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("orderService.createOrder", () => {
  it("creates an order once the contact is confirmed to belong to this workspace", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(makeContact());
    vi.mocked(orderRepository.create).mockResolvedValue(makeOrderListItem());

    const result = await orderService.createOrder(
      WORKSPACE_ID,
      { contactId: CONTACT_ID, items: [{ name: "Widget", unitPrice: "10.00", quantity: 1 }], ...ZERO_ADJUSTMENTS },
      ACTOR,
    );

    expect(result.order.id).toBe("order-1");
    expect(contactRepository.findById).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID);
    expect(orderRepository.create).toHaveBeenCalled();
    expect(automationService.dispatch).toHaveBeenCalledWith(WORKSPACE_ID, {
      type: "order_created",
      contactId: CONTACT_ID,
    });
    expect(activityRepository.log).toHaveBeenCalled();
    expect(notifyWorkspaceOwner).not.toHaveBeenCalled();
  });

  it("notifies the owner when a VIP-tagged customer places an order", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(makeContact({ tags: ["VIP"] }));
    vi.mocked(orderRepository.create).mockResolvedValue(
      makeOrderListItem({
        items: [{ id: "item-1", orderId: "order-1", productId: null, name: "Widget", unitPrice: "10.00", quantity: 1, createdAt: new Date() }],
      }),
    );

    await orderService.createOrder(
      WORKSPACE_ID,
      { contactId: CONTACT_ID, items: [{ name: "Widget", unitPrice: "10.00", quantity: 1 }], ...ZERO_ADJUSTMENTS },
      ACTOR,
    );

    expect(notifyWorkspaceOwner).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, type: "dashboard" }),
    );
  });

  it("passes discount/tax/delivery/payment fields through to the repository", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(makeContact());
    vi.mocked(orderRepository.create).mockResolvedValue(makeOrderListItem());

    await orderService.createOrder(
      WORKSPACE_ID,
      {
        contactId: CONTACT_ID,
        items: [{ name: "Widget", unitPrice: "10.00", quantity: 1 }],
        discountAmount: "5.00",
        taxAmount: "1.00",
        deliveryFee: "2.50",
        paymentMethod: "cash",
        deliveryMethod: "delivery",
      },
      ACTOR,
    );

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        discountAmount: "5.00",
        taxAmount: "1.00",
        deliveryFee: "2.50",
        paymentMethod: "cash",
        deliveryMethod: "delivery",
      }),
      expect.any(Array),
    );
  });

  it("rejects a contactId that doesn't belong to this workspace (cross-tenant IDOR guard)", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(null);

    await expect(
      orderService.createOrder(
        WORKSPACE_ID,
        { contactId: "someone-elses-contact", items: [{ name: "Widget", unitPrice: "10.00", quantity: 1 }], ...ZERO_ADJUSTMENTS },
        ACTOR,
      ),
    ).rejects.toThrow("Contact not found.");

    expect(orderRepository.create).not.toHaveBeenCalled();
    expect(automationService.dispatch).not.toHaveBeenCalled();
    expect(activityRepository.log).not.toHaveBeenCalled();
  });

  it("rejects an order with no items before ever checking the contact", async () => {
    await expect(
      orderService.createOrder(WORKSPACE_ID, { contactId: CONTACT_ID, items: [], ...ZERO_ADJUSTMENTS }, ACTOR),
    ).rejects.toThrow("An order needs at least one item.");

    expect(contactRepository.findById).not.toHaveBeenCalled();
    expect(orderRepository.create).not.toHaveBeenCalled();
  });
});

describe("orderService.updateOrderStatus", () => {
  it("throws NOT_FOUND when the order doesn't exist in this workspace", async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(null);

    await expect(orderService.updateOrderStatus(WORKSPACE_ID, "missing-order", "confirmed", ACTOR)).rejects.toThrow(
      "Order not found.",
    );
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
    expect(crmService.advanceLifecycleStage).not.toHaveBeenCalled();
  });

  it("rejects an illegal status transition (state machine guard)", async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(makeOrderListItem({ order: makeOrder({ status: "pending" }) }));

    await expect(orderService.updateOrderStatus(WORKSPACE_ID, "order-1", "delivered", ACTOR)).rejects.toThrow(
      'An order can\'t move from "pending" to "delivered".',
    );
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("advances the contact's lifecycle stage on a revenue-recognizing status", async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(makeOrderListItem({ order: makeOrder({ status: "ready" }) }));
    vi.mocked(orderRepository.updateStatus).mockResolvedValue(makeOrder({ status: "delivered" }));

    await orderService.updateOrderStatus(WORKSPACE_ID, "order-1", "delivered", ACTOR);

    expect(crmService.advanceLifecycleStage).toHaveBeenCalledWith(WORKSPACE_ID, CONTACT_ID);
  });

  it("does not advance the lifecycle stage on a non-revenue status", async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(makeOrderListItem({ order: makeOrder({ status: "pending" }) }));
    vi.mocked(orderRepository.updateStatus).mockResolvedValue(makeOrder({ status: "cancelled" }));

    await orderService.updateOrderStatus(WORKSPACE_ID, "order-1", "cancelled", ACTOR);

    expect(crmService.advanceLifecycleStage).not.toHaveBeenCalled();
  });
});
