CREATE TYPE "public"."activity_type" AS ENUM('applicationSubmitted', 'receiptConfirmed', 'interviewScheduled', 'interviewHeld', 'taskReceived', 'taskSubmitted', 'documentsRequested', 'documentsSubmitted', 'statusInquired', 'offerReceived', 'counterOfferSubmitted', 'offerAccepted', 'offerDeclined', 'rejectionReceived', 'applicationWithdrawn', 'applicationPaused', 'other');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"terms" jsonb,
	"appointment_at" timestamp with time zone,
	"due_date" date,
	"response_deadline" date,
	"notes" text DEFAULT '' NOT NULL,
	"attachments" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_application_id_occurred_at_index" ON "activities" USING btree ("application_id","occurred_at");--> statement-breakpoint
INSERT INTO "activities" ("application_id", "type", "occurred_at")
SELECT "id", 'applicationSubmitted', "applied_at"::timestamp AT TIME ZONE 'Europe/Berlin' FROM "applications";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "applied_at";