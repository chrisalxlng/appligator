CREATE TYPE "public"."currency" AS ENUM('EUR', 'USD', 'CHF', 'GBP');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('fullTime', 'partTime', 'workingStudent', 'internship', 'freelance');--> statement-breakpoint
CREATE TYPE "public"."salary_period" AS ENUM('year', 'month', 'hour');--> statement-breakpoint
CREATE TYPE "public"."work_model" AS ENUM('onSite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"link" text,
	"description" text NOT NULL,
	"summary" text NOT NULL,
	"company" text NOT NULL,
	"position" text NOT NULL,
	"salary_currency" "currency",
	"salary_period" "salary_period",
	"salary_min" integer,
	"salary_max" integer,
	"locations" text[] NOT NULL,
	"work_model" "work_model",
	"employment_type" "employment_type",
	"application_deadline" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "jobs_user_id_created_at_index" ON "jobs" USING btree ("user_id","created_at");