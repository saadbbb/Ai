import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Note } from "@/db/schema";

vi.mock("../repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("../repository/note.repository", () => ({
  noteRepository: { create: vi.fn(), delete: vi.fn(), findByContactId: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findById: vi.fn() },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: { create: vi.fn() },
}));

vi.mock("@/features/workspace/repository/membership.repository", () => ({
  membershipRepository: { findMembersByWorkspaceId: vi.fn() },
}));

const { activityRepository } = await import("../repository/activity.repository");
const { noteRepository } = await import("../repository/note.repository");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { membershipRepository } = await import("@/features/workspace/repository/membership.repository");
const { noteService } = await import("./note.service");

const WORKSPACE_ID = "workspace-1";
const CONTACT_ID = "contact-1";
const USER_ID = "user-1";

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
    marketingOptOut: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    workspaceId: WORKSPACE_ID,
    contactId: CONTACT_ID,
    content: "Prefers morning calls.",
    authorUserId: USER_ID,
    type: "team",
    pinned: false,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([]);
});

describe("noteService.createNote", () => {
  it("creates a note attributed to its author and logs it to the timeline", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(makeContact());
    vi.mocked(noteRepository.create).mockResolvedValue(makeNote());

    const note = await noteService.createNote(WORKSPACE_ID, USER_ID, {
      contactId: CONTACT_ID,
      content: "Prefers morning calls.",
      pinned: false,
      type: "team",
    });

    expect(note.content).toBe("Prefers morning calls.");
    expect(contactRepository.findById).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID);
    expect(noteRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: CONTACT_ID, authorUserId: USER_ID }),
    );
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: CONTACT_ID, type: "note_added", actor: { type: "human", userId: USER_ID } }),
    );
  });

  it("rejects a contactId that doesn't belong to this workspace (cross-tenant IDOR guard)", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(null);

    await expect(
      noteService.createNote(WORKSPACE_ID, USER_ID, {
        contactId: "someone-elses-contact",
        content: "Prefers morning calls.",
        pinned: false,
        type: "team",
      }),
    ).rejects.toThrow("Contact not found.");
    expect(noteRepository.create).not.toHaveBeenCalled();
    expect(activityRepository.log).not.toHaveBeenCalled();
  });
});

describe("noteService.createNote — @mentions", () => {
  it("notifies a workspace member whose email local-part matches an @mention in the note", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(makeContact());
    vi.mocked(noteRepository.create).mockResolvedValue(makeNote({ content: "cc @sara please follow up" }));
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([
      { member: {} as never, user: { id: "user-2", email: "sara@example.com" } as never, role: {} as never },
      { member: {} as never, user: { id: "user-3", email: "ahmed@example.com" } as never, role: {} as never },
    ]);

    await noteService.createNote(WORKSPACE_ID, USER_ID, {
      contactId: CONTACT_ID,
      content: "cc @sara please follow up",
      pinned: false,
      type: "team",
    });

    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, type: "mention", message: expect.stringContaining("sara@example.com") }),
    );
  });

  it("does not notify anyone when the note has no @mentions", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(makeContact());
    vi.mocked(noteRepository.create).mockResolvedValue(makeNote({ content: "Just a regular note." }));

    await noteService.createNote(WORKSPACE_ID, USER_ID, {
      contactId: CONTACT_ID,
      content: "Just a regular note.",
      pinned: false,
      type: "team",
    });

    expect(membershipRepository.findMembersByWorkspaceId).not.toHaveBeenCalled();
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});

describe("noteService.listNotesForContact", () => {
  it("passes the viewer's userId through so private notes are filtered at the repository layer", async () => {
    vi.mocked(noteRepository.findByContactId).mockResolvedValue([makeNote()]);

    const notes = await noteService.listNotesForContact(WORKSPACE_ID, CONTACT_ID, USER_ID);

    expect(notes).toHaveLength(1);
    expect(noteRepository.findByContactId).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, USER_ID);
  });
});

describe("noteService.deleteNote", () => {
  it("delegates straight to the repository, scoped to the workspace", async () => {
    await noteService.deleteNote(WORKSPACE_ID, "note-1");

    expect(noteRepository.delete).toHaveBeenCalledWith("note-1", WORKSPACE_ID);
  });
});
