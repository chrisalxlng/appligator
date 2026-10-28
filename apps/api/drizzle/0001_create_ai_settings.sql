CREATE TYPE "public"."ai_language" AS ENUM('de', 'en');--> statement-breakpoint
CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'anthropic', 'google', 'mistral');--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"language" "ai_language" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"access_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
