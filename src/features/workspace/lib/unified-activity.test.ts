import { describe, expect, it } from "vitest";
import type { Activity, WorkspaceAuditLog } from "@/db/schema";
import { buildUnifiedActivityFeed } from "./unified-activity";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "activity-1",
    workspaceId: "workspace-1",
    contactId: "contact-1",
    type: "lead_created",
    actorType: "ai",
    actorUserId: null,
    summary: "AI created a lead.",
    link: null,
    createdAt: new Date("2026-01-01T10:00:00Z"),
    ...overrides,
  };
}

function makeAuditLog(overrides: Partial<WorkspaceAuditLog> = {}): WorkspaceAuditLog {
  return {
    id: "audit-1",
    workspaceId: "workspace-1",
    actorUserId: "user-1",
    actorEmail: "owner@example.com",
    action: "login",
    targetType: "session",
    targetId: null,
    summary: "owner@example.com logged in.",
    metadata: null,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    ...overrides,
  };
}

describe("buildUnifiedActivityFeed", () => {
  it("merges CRM activities and admin audit logs into one chronological feed, newest first", () => {
    const feed = buildUnifiedActivityFeed([makeActivity()], [makeAuditLog()]);

    expect(feed.map((item) => item.id)).toEqual(["admin-audit-1", "crm-activity-1"]);
  });

  it("tags each item with its source and preserves the admin actor email", () => {
    const feed = buildUnifiedActivityFeed([makeActivity()], [makeAuditLog()]);

    expect(feed[0]).toMatchObject({ source: "admin", actorLabel: "owner@example.com", link: null });
    expect(feed[1]).toMatchObject({ source: "crm", actorLabel: null, link: "/dashboard/contacts/contact-1" });
  });

  it("prefers the activity's own link over the contact fallback when one is set", () => {
    const feed = buildUnifiedActivityFeed([makeActivity({ link: "/dashboard/orders/order-1" })], []);

    expect(feed[0].link).toBe("/dashboard/orders/order-1");
  });

  it("returns an empty feed when both sources are empty", () => {
    expect(buildUnifiedActivityFeed([], [])).toEqual([]);
  });
});
