import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type Appointment,
  type AppointmentStatus,
  appointments,
  type Contact,
  contacts,
  type NewAppointment,
} from "@/db/schema";

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
};
