DELETE FROM "mail_messages" WHERE "content" IS NULL;--> statement-breakpoint
ALTER TABLE "mail_messages" ALTER COLUMN "content" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD COLUMN "application_id" uuid;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;