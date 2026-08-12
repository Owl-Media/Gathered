ALTER TABLE "events" ADD COLUMN "deposit_amount_minor" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "total_amount_minor" integer;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "deposit_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "paid_in_full_at" timestamp with time zone;