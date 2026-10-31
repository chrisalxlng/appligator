ALTER TABLE "applications" ADD COLUMN "favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "favorite" boolean DEFAULT false NOT NULL;