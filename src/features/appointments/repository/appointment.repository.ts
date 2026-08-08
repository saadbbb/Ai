import { and, asc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type Appointment,
  type AppointmentStatus,
  appointments,
  type Contact,
  contacts,
  type NewAppointment,
} from "@/db/schema";

const REMINDABLE_STATUSES: AppointmentStatus[] = ["scheduled", "confirmed"];

export interface AppointmentListItem {
  appointment: Appointment;
  contact: Contact;
}

const listSelection = { appointment: appointments, contact: contacts };

export const appointmentRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<AppointmentListItem[]> {
    return db
      .select(listSelection)
      .from(appointments)
      .innerJoin(contacts, eq(appointments.contactId, contacts.id))
      .where(eq(appointments.workspaceId, workspaceId))
      .orderBy(asc(appointments.scheduledAt));
  },

  async findByContactId(contactId: string, workspaceId: string): Promise<AppointmentListItem[]> {
    return db
      .select(listSelection)
      .from(appointments)
      .innerJoin(contacts, eq(appointments.contactId, contacts.id))
      .where(and(eq(appointments.contactId, contactId), eq(appointments.workspaceId, workspaceId)))
      .orderBy(asc(appointments.scheduledAt));
  },

  async findById(id: string, workspaceId: string): Promise<AppointmentListItem | null> {
    const [row] = await db
      .select(listSelection)
      .from(appointments)
      .innerJoin(contacts, eq(appointments.contactId, contacts.id))
      .where(and(eq(appointments.id, id), eq(appointments.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values(data).returning();
    return appointment;
  },

  async updateStatus(id: string, workspaceId: string, status: AppointmentStatus): Promise<Appointment | null> {
    const [appointment] = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.workspaceId, workspaceId)))
      .returning();
    return appointment ?? null;
  },

  /** Used for lead scoring (see lead-score.ts) — one query instead of an appointment check per lead. */
  async findContactIdsWithAppointments(workspaceId: string, contactIds: string[]): Promise<Set<string>> {
    if (contactIds.length === 0) return new Set();
    const rows = await db
      .selectDistinct({ contactId: appointments.contactId })
      .from(appointments)
      .where(and(eq(appointments.workspaceId, workspaceId), inArray(appointments.contactId, contactIds)));
    return new Set(rows.map((row) => row.contactId));
  },

  /**
   * Cross-tenant by design (cron-only, same pattern as
   * leadRepository.findStaleOpenLeads) — finds every not-yet-reminded
   * scheduled/confirmed appointment whose time falls inside the given
   * window, regardless of workspace.
   */
  async findDueForReminder(from: Date, to: Date): Promise<AppointmentListItem[]> {
    return db
      .select(listSelection)
      .from(appointments)
      .innerJoin(contacts, eq(appointments.contactId, contacts.id))
      .where(
        and(
          inArray(appointments.status, REMINDABLE_STATUSES),
          isNull(appointments.reminderSentAt),
          gte(appointments.scheduledAt, from),
          lte(appointments.scheduledAt, to),
        ),
      );
  },

  async markReminderSent(id: string): Promise<void> {
    await db.update(appointments).set({ reminderSentAt: new Date() }).where(eq(appointments.id, id));
  },
};
