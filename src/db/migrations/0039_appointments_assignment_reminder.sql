ALTER TYPE "public"."notification_type" ADD VALUE 'appointment_reminder';--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "assigned_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_assigned_to_user_id_idx" ON "appointments" USING btree ("assigned_to_user_id");