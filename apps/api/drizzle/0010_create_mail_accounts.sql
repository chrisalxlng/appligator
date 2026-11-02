CREATE TABLE "mail_accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"host" text NOT NULL,
	"username" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"access_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
