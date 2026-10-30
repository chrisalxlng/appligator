ALTER TABLE "jobs" ADD COLUMN "bonuses" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "benefits" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "home_office_percentage" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "working_hours" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "commute_distance" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "commute_duration" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "vacation_days" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "contract_term" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "probation_months" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "notice_period" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "notes" text DEFAULT '' NOT NULL;