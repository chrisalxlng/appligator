ALTER TABLE "jobs" ADD COLUMN "viewed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "jobs" SET "viewed_at" = "created_at";