CREATE TYPE "public"."kyc_status" AS ENUM('not_started', 'pending', 'approved', 'rejected', 'needs_changes');--> statement-breakpoint
ALTER TYPE "public"."verification_request_type" ADD VALUE 'kyc_review';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_status" "kyc_status" DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_decision_notes" text;--> statement-breakpoint
CREATE INDEX "users_kyc_status_idx" ON "users" USING btree ("kyc_status");
