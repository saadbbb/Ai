ALTER TABLE "plans" ADD COLUMN "price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "currency" text DEFAULT 'IQD' NOT NULL;