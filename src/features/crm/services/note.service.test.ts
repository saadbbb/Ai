import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/db/schema";

vi.mock("../repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("../repository/note.repository", () => ({
  noteRepository: { create: vi.fn(), delete: vi.fn(), findByContactId: vi.fn() },
}));

const { activityRepository } = await import("../repository/activity.repository");
const { noteRepository } = await import("../repository/note.repository");
const { noteService } = await import("./note.service");

const WORKSPACE_ID = "workspace-1";
const CONTACT_ID = "contact-1";
const USER_ID = "user-1";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    workspaceId: WORKSPACE_ID,
    contactId: CONTACT_ID,
    content: "Prefers morning calls.",
    authorUserId: USER_ID,
    pinned: false,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("noteService.createNote", () => {
  it("creates a note attributed to its author and logs it to the timeline", async () => {
    vi.mocked(noteRepository.create).mockResolvedValue(makeNote());

    const note = await noteService.createNote(WORKSPACE_ID, USER_ID, {
      contactId: CONTACT_ID,
      content: "Prefers morning calls.",
      pinned: false,
    });

    expect(note.content).toBe("Prefers morning calls.");
    expect(noteRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: CONTACT_ID, authorUserId: USER_ID }),
    );
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: CONTACT_ID, type: "note_added", actor: { type: "human", userId: USER_ID } }),
    );
  });
});

describe("noteService.deleteNote", () => {
  it("delegates straight to the repository, scoped to the workspace", async () => {
    await noteService.deleteNote(WORKSPACE_ID, "note-1");

    expect(noteRepository.delete).toHaveBeenCalledWith("note-1", WORKSPACE_ID);
  });
});
