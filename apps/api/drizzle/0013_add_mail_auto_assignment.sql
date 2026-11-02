ALTER TYPE "public"."mail_message_status" ADD VALUE 'autoAssigned' BEFORE 'assigned';--> statement-breakpoint
CREATE TABLE "mail_assignments" (
	"user_id" text NOT NULL,
	"message_id_hash" text NOT NULL,
	"sender" text NOT NULL,
	"application_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_assignments_user_id_message_id_hash_pk" PRIMARY KEY("user_id","message_id_hash")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "automatic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "ai_assignment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD COLUMN "activity_id" uuid;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD COLUMN "referenced_hashes" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD COLUMN "suggestion" jsonb;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD COLUMN "classified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mail_assignments" ADD CONSTRAINT "mail_assignments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_assignments_user_id_sender_index" ON "mail_assignments" USING btree ("user_id","sender");--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "mail_messages" SET "classified_at" = now();
