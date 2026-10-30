CREATE TYPE "public"."application_status" AS ENUM('applied');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"status" "application_status" NOT NULL,
	"applied_at" date NOT NULL,
	"company" text NOT NULL,
	"position" text NOT NULL,
	"company_type" "company_type",
	"employee_count" integer,
	"salary_currency" "currency",
	"salary_period" "salary_period",
	"salary_min" integer,
	"salary_max" integer,
	"bonuses" text[] DEFAULT '{}' NOT NULL,
	"benefits" text[] DEFAULT '{}' NOT NULL,
	"employment_type" "employment_type",
	"work_model" "work_model",
	"home_office_percentage" integer,
	"working_hours" jsonb,
	"locations" text[] NOT NULL,
	"commute_distance" integer,
	"commute_duration" integer,
	"vacation_days" numeric(4, 1),
	"start_date" date,
	"contract_term" jsonb,
	"probation_months" integer,
	"notice_period" jsonb,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_jobId_unique" UNIQUE("job_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_user_id_created_at_index" ON "applications" USING btree ("user_id","created_at");