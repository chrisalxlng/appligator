CREATE TYPE "public"."mail_error" AS ENUM('loginRejected', 'connectionFailed');--> statement-breakpoint
CREATE TYPE "public"."mail_folder" AS ENUM('inbox', 'sent');--> statement-breakpoint
CREATE TYPE "public"."mail_message_status" AS ENUM('pending', 'assigned', 'dismissed');--> statement-breakpoint
CREATE TABLE "mail_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"message_id_hash" text NOT NULL,
	"folder" "mail_folder" NOT NULL,
	"status" "mail_message_status" DEFAULT 'pending' NOT NULL,
	"content" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_messages_userId_messageIdHash_unique" UNIQUE("user_id","message_id_hash")
);
--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "cursors" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "next_sync_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "sync_error" "mail_error";--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "sync_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "mail_messages_user_id_status_created_at_index" ON "mail_messages" USING btree ("user_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mail_accounts_next_sync_at_index" ON "mail_accounts" USING btree ("next_sync_at");