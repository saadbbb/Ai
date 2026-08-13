import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Order, OrderItem } from "@/db/schema";
import type { OrderListItem } from "../repository/order.repository";

vi.mock("../repository/order.repository", () => ({
  orderRepository: { findStalePending: vi.fn(), markFollowupNotified: vi.fn() },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: { create: vi.fn() },
}));

vi.mock("@/lib/email", () => ({
  emailService: { sendNotificationEmail: vi.fn() },
}));

const { orderRepository } = await import("../repository/order.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { emailService } = await import("@/lib/email");
const { orderFollowupService } = await import("./order-followup.service");

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    workspaceId: "workspace-1",
    contactId: "contact-1",
    conversationId: null,
    status: "pending",
    discountAmount: "0",
    taxAmount: "0",
    deliveryFee: "0",
    paymentMethod: null,
    deliveryMethod: null,
    deliveryAddress: null,
    notes: null,
    shippingCarrier: null,
    trackingNumber: null,
    trackingUrl: null,
    followupNotifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    workspaceId: "workspace-1",
    fullName: "Ahmed",
    phone: null,
    whatsappId: null,
    instagramId: null,
    email: null,
    language: "en",
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
    marketingOptOut: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: "item-1",
    orderId: "order-1",
    productId: null,
    variantId: null,
    variantName: null,
    name: "Widget",
    unitPrice: "19.99",
    quantity: 2,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeListItem(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return { order: makeOrder(), contact: makeContact(), items: [makeItem()], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("orderFollowupService.runDailyCheck", () => {
  it("emails the contact when an address is on file, notifies in-app with the grand total, and marks it notified", async () => {
    vi.mocked(orderRepository.findStalePending).mockResolvedValue([
      makeListItem({ contact: makeContact({ email: "ahmed@example.com" }) }),
    ]);

    const result = await orderFollowupService.runDailyCheck();

    expect(result.notified).toBe(1);
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ahmed@example.com" }),
    );
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        type: "order_followup",
        message: expect.stringContaining("39.98"),
        link: "/dashboard/orders/order-1",
      }),
    );
    expect(orderRepository.markFollowupNotified).toHaveBeenCalledWith("order-1");
  });

  it("skips the email but still notifies in-app when the contact has no email on file", async () => {
    vi.mocked(orderRepository.findStalePending).mockResolvedValue([makeListItem({ contact: makeContact({ email: null }) })]);

    const result = await orderFollowupService.runDailyCheck();

    expect(result.notified).toBe(1);
    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    expect(notificationRepository.create).toHaveBeenCalled();
    expect(orderRepository.markFollowupNotified).toHaveBeenCalledWith("order-1");
  });

  it("continues past a single order's failure without throwing", async () => {
    vi.mocked(orderRepository.findStalePending).mockResolvedValue([
      makeListItem({ order: makeOrder({ id: "order-1" }) }),
      makeListItem({ order: makeOrder({ id: "order-2" }), contact: makeContact({ id: "contact-2", fullName: "Sara" }) }),
    ]);
    vi.mocked(notificationRepository.create)
      .mockRejectedValueOnce(new Error("db down"))
      // @ts-expect-error only the call succeeding matters for this test, not the return shape
      .mockResolvedValueOnce(undefined);

    const result = await orderFollowupService.runDailyCheck();

    expect(result.notified).toBe(1);
    expect(orderRepository.markFollowupNotified).toHaveBeenCalledTimes(1);
    expect(orderRepository.markFollowupNotified).toHaveBeenCalledWith("order-2");
  });

  it("returns zero notified when nothing is stale", async () => {
    vi.mocked(orderRepository.findStalePending).mockResolvedValue([]);

    const result = await orderFollowupService.runDailyCheck();

    expect(result.notified).toBe(0);
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});
