ALTER TABLE "applications" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;