ALTER TYPE "public"."application_status" RENAME TO "application_status_old";--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('applied', 'interviewing', 'offer', 'accepted', 'declined', 'rejected', 'withdrawn', 'paused');--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" TYPE "public"."application_status" USING "status"::text::"public"."application_status";--> statement-breakpoint
DROP TYPE "public"."application_status_old";--> statement-breakpoint
UPDATE "applications" SET "status" = coalesce((
  SELECT CASE "activities"."type"
    WHEN 'interviewScheduled' THEN 'interviewing'
    WHEN 'interviewHeld' THEN 'interviewing'
    WHEN 'taskReceived' THEN 'interviewing'
    WHEN 'taskSubmitted' THEN 'interviewing'
    WHEN 'offerReceived' THEN 'offer'
    WHEN 'counterOfferSubmitted' THEN 'offer'
    WHEN 'offerAccepted' THEN 'accepted'
    WHEN 'offerDeclined' THEN 'declined'
    WHEN 'rejectionReceived' THEN 'rejected'
    WHEN 'applicationWithdrawn' THEN 'withdrawn'
    WHEN 'applicationPaused' THEN 'paused'
    ELSE 'applied'
  END
  FROM "activities"
  WHERE "activities"."application_id" = "applications"."id"
    AND "activities"."type" NOT IN ('other', 'documentsRequested', 'documentsSubmitted', 'statusInquired')
  ORDER BY "activities"."occurred_at" DESC, "activities"."created_at" DESC
  LIMIT 1
), 'applied')::"public"."application_status";
