DROP INDEX "applications_user_id_created_at_index";--> statement-breakpoint
DROP INDEX "jobs_user_id_created_at_index";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "locations" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "locations" SET DEFAULT '{}';--> statement-breakpoint
CREATE INDEX "applications_user_id_pinned_created_at_id_index" ON "applications" USING btree ("user_id","pinned" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_user_id_pinned_created_at_id_index" ON "jobs" USING btree ("user_id","pinned" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST);