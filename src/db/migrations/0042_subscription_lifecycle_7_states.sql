ALTER TYPE "public"."subscription_status" ADD VALUE 'past_due' BEFORE 'suspended';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'grace' BEFORE 'suspended';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'expired';