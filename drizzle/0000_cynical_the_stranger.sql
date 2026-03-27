CREATE TYPE "public"."asset_document_type" AS ENUM('ownership_doc', 'right_to_income_doc', 'technical_passport', 'photo', 'meter_info', 'financial_model', 'revenue_report', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('draft', 'pending_review', 'verified', 'active_sale', 'funded', 'frozen', 'closed');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."energy_type" AS ENUM('solar', 'wind', 'hydro', 'ev_charging', 'other');--> statement-breakpoint
CREATE TYPE "public"."investment_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_execution_status" AS ENUM('running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('investment_confirmed', 'revenue_posted', 'claim_available', 'sale_opened', 'sale_completed', 'asset_frozen', 'system');--> statement-breakpoint
CREATE TYPE "public"."revenue_deposit_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."revenue_source_type" AS ENUM('manual_report', 'meter_export', 'operator_statement');--> statement-breakpoint
CREATE TYPE "public"."revenue_status" AS ENUM('draft', 'posted', 'settled', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('draft', 'scheduled', 'live', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."share_mint_status" AS ENUM('draft', 'prepared', 'minted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('arweave', 'ipfs', 's3');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('investor', 'issuer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."verification_decision_outcome" AS ENUM('approved', 'rejected', 'needs_changes');--> statement-breakpoint
CREATE TYPE "public"."verification_request_status" AS ENUM('pending', 'in_review', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."verification_request_type" AS ENUM('asset_review', 'document_review', 'issuer_review', 'revenue_review');--> statement-breakpoint
CREATE TYPE "public"."wallet_binding_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_status" AS ENUM('pending', 'processing', 'processed', 'failed', 'dead_letter');--> statement-breakpoint
CREATE TABLE "asset_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"type" "asset_document_type" NOT NULL,
	"title" text NOT NULL,
	"storage_provider" "storage_provider" NOT NULL,
	"storage_uri" text NOT NULL,
	"content_hash" text NOT NULL,
	"mime_type" text,
	"uploaded_by_user_id" uuid NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_sale_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"valuation_usdc" numeric(20, 6) NOT NULL,
	"total_shares" bigint NOT NULL,
	"price_per_share_usdc" numeric(20, 6) NOT NULL,
	"minimum_buy_amount_usdc" numeric(20, 6) NOT NULL,
	"target_raise_usdc" numeric(20, 6) NOT NULL,
	"sale_start_at" timestamp with time zone,
	"sale_end_at" timestamp with time zone,
	"sale_status" "sale_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"old_status" "asset_status",
	"new_status" "asset_status" NOT NULL,
	"changed_by_user_id" uuid,
	"reason" text,
	"transaction_signature" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"short_description" text NOT NULL,
	"full_description" text NOT NULL,
	"energy_type" "energy_type" NOT NULL,
	"issuer_user_id" uuid NOT NULL,
	"location_country" text NOT NULL,
	"location_region" text,
	"location_city" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"capacity_kw" numeric(14, 3) NOT NULL,
	"commissioning_date" date,
	"expected_annual_yield_percent" numeric(7, 4),
	"currency" text DEFAULT 'USDC' NOT NULL,
	"status" "asset_status" DEFAULT 'draft' NOT NULL,
	"cover_image_url" text,
	"asset_metadata_uri" text,
	"onchain_asset_pubkey" text,
	"share_mint_pubkey" text,
	"vault_pubkey" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"payload_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"revenue_epoch_id" uuid NOT NULL,
	"claim_amount_usdc" numeric(20, 6) NOT NULL,
	"transaction_signature" text,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holdings_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"shares_amount" numeric(30, 12) NOT NULL,
	"shares_percentage" numeric(9, 6) NOT NULL,
	"last_synced_slot" bigint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "idempotency_keys_pk" PRIMARY KEY("scope","key")
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"amount_usdc" numeric(20, 6) NOT NULL,
	"shares_received" numeric(30, 12) NOT NULL,
	"transaction_signature" text,
	"status" "investment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_name" text NOT NULL,
	"job_name" text NOT NULL,
	"job_id" text,
	"status" "job_execution_status" DEFAULT 'running' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"payload_json" jsonb,
	"result_json" jsonb,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" DEFAULT 'system' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revenue_epoch_id" uuid NOT NULL,
	"deposited_by_user_id" uuid NOT NULL,
	"amount_usdc" numeric(20, 6) NOT NULL,
	"source_reference" text,
	"transaction_signature" text,
	"status" "revenue_deposit_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_epochs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"epoch_number" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"gross_revenue_usdc" numeric(20, 6) NOT NULL,
	"net_revenue_usdc" numeric(20, 6) NOT NULL,
	"distributable_revenue_usdc" numeric(20, 6) NOT NULL,
	"report_uri" text,
	"report_hash" text,
	"source_type" "revenue_source_type" NOT NULL,
	"posted_by_user_id" uuid NOT NULL,
	"onchain_revenue_pubkey" text,
	"transaction_signature" text,
	"status" "revenue_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_mints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"mint_address" text NOT NULL,
	"decimals" integer DEFAULT 0 NOT NULL,
	"token_program" text NOT NULL,
	"vault_address" text,
	"transaction_signature" text,
	"status" "share_mint_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfers_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"from_wallet" text NOT NULL,
	"to_wallet" text NOT NULL,
	"shares_amount" numeric(30, 12) NOT NULL,
	"transaction_signature" text NOT NULL,
	"block_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text,
	"telegram_user_id" text,
	"telegram_username" text,
	"display_name" text,
	"role" "user_role" DEFAULT 'investor' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verification_request_id" uuid NOT NULL,
	"decided_by_user_id" uuid NOT NULL,
	"outcome" "verification_decision_outcome" NOT NULL,
	"reason" text,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid,
	"requested_by_user_id" uuid NOT NULL,
	"request_type" "verification_request_type" NOT NULL,
	"status" "verification_request_status" DEFAULT 'pending' NOT NULL,
	"payload_json" jsonb,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"chain" text DEFAULT 'solana' NOT NULL,
	"label" text,
	"status" "wallet_binding_status" DEFAULT 'pending' NOT NULL,
	"verification_message" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"event_type" text NOT NULL,
	"external_event_id" text,
	"payload_json" jsonb NOT NULL,
	"status" "webhook_event_status" DEFAULT 'pending' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_sale_terms" ADD CONSTRAINT "asset_sale_terms_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_issuer_user_id_users_id_fk" FOREIGN KEY ("issuer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_revenue_epoch_id_revenue_epochs_id_fk" FOREIGN KEY ("revenue_epoch_id") REFERENCES "public"."revenue_epochs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings_snapshots" ADD CONSTRAINT "holdings_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings_snapshots" ADD CONSTRAINT "holdings_snapshots_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_deposits" ADD CONSTRAINT "revenue_deposits_revenue_epoch_id_revenue_epochs_id_fk" FOREIGN KEY ("revenue_epoch_id") REFERENCES "public"."revenue_epochs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_deposits" ADD CONSTRAINT "revenue_deposits_deposited_by_user_id_users_id_fk" FOREIGN KEY ("deposited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_epochs" ADD CONSTRAINT "revenue_epochs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_epochs" ADD CONSTRAINT "revenue_epochs_posted_by_user_id_users_id_fk" FOREIGN KEY ("posted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_mints" ADD CONSTRAINT "share_mints_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers_index" ADD CONSTRAINT "transfers_index_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_decisions" ADD CONSTRAINT "verification_decisions_verification_request_id_verification_requests_id_fk" FOREIGN KEY ("verification_request_id") REFERENCES "public"."verification_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_decisions" ADD CONSTRAINT "verification_decisions_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_bindings" ADD CONSTRAINT "wallet_bindings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_documents_asset_id_idx" ON "asset_documents" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_documents_type_idx" ON "asset_documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "asset_documents_uploaded_by_user_id_idx" ON "asset_documents" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_sale_terms_asset_id_unique" ON "asset_sale_terms" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_sale_terms_sale_status_idx" ON "asset_sale_terms" USING btree ("sale_status");--> statement-breakpoint
CREATE INDEX "asset_status_history_asset_id_idx" ON "asset_status_history" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_status_history_changed_by_user_id_idx" ON "asset_status_history" USING btree ("changed_by_user_id");--> statement-breakpoint
CREATE INDEX "asset_status_history_new_status_idx" ON "asset_status_history" USING btree ("new_status");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_slug_unique" ON "assets" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_onchain_asset_pubkey_unique" ON "assets" USING btree ("onchain_asset_pubkey");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_share_mint_pubkey_unique" ON "assets" USING btree ("share_mint_pubkey");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_vault_pubkey_unique" ON "assets" USING btree ("vault_pubkey");--> statement-breakpoint
CREATE INDEX "assets_issuer_user_id_idx" ON "assets" USING btree ("issuer_user_id");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_energy_type_idx" ON "assets" USING btree ("energy_type");--> statement-breakpoint
CREATE INDEX "assets_created_at_idx" ON "assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "claims_user_id_idx" ON "claims" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "claims_asset_id_idx" ON "claims" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "claims_revenue_epoch_id_idx" ON "claims" USING btree ("revenue_epoch_id");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "holdings_snapshots_user_asset_unique" ON "holdings_snapshots" USING btree ("user_id","asset_id");--> statement-breakpoint
CREATE INDEX "holdings_snapshots_asset_id_idx" ON "holdings_snapshots" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "investments_user_id_idx" ON "investments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "investments_asset_id_idx" ON "investments" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "investments_status_idx" ON "investments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "investments_transaction_signature_idx" ON "investments" USING btree ("transaction_signature");--> statement-breakpoint
CREATE INDEX "job_execution_logs_queue_name_idx" ON "job_execution_logs" USING btree ("queue_name");--> statement-breakpoint
CREATE INDEX "job_execution_logs_job_name_idx" ON "job_execution_logs" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "job_execution_logs_status_idx" ON "job_execution_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_execution_logs_job_id_idx" ON "job_execution_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "revenue_deposits_revenue_epoch_id_idx" ON "revenue_deposits" USING btree ("revenue_epoch_id");--> statement-breakpoint
CREATE INDEX "revenue_deposits_deposited_by_user_id_idx" ON "revenue_deposits" USING btree ("deposited_by_user_id");--> statement-breakpoint
CREATE INDEX "revenue_deposits_status_idx" ON "revenue_deposits" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_epochs_asset_epoch_unique" ON "revenue_epochs" USING btree ("asset_id","epoch_number");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_epochs_onchain_revenue_pubkey_unique" ON "revenue_epochs" USING btree ("onchain_revenue_pubkey");--> statement-breakpoint
CREATE INDEX "revenue_epochs_status_idx" ON "revenue_epochs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "revenue_epochs_posted_by_user_id_idx" ON "revenue_epochs" USING btree ("posted_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "share_mints_asset_id_unique" ON "share_mints" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "share_mints_mint_address_unique" ON "share_mints" USING btree ("mint_address");--> statement-breakpoint
CREATE UNIQUE INDEX "share_mints_vault_address_unique" ON "share_mints" USING btree ("vault_address");--> statement-breakpoint
CREATE INDEX "share_mints_status_idx" ON "share_mints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transfers_index_asset_id_idx" ON "transfers_index" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "transfers_index_transaction_signature_idx" ON "transfers_index" USING btree ("transaction_signature");--> statement-breakpoint
CREATE INDEX "transfers_index_block_time_idx" ON "transfers_index" USING btree ("block_time");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_session_token_hash_unique" ON "user_sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_wallet_address_unique" ON "users" USING btree ("wallet_address");--> statement-breakpoint
CREATE UNIQUE INDEX "users_telegram_user_id_unique" ON "users" USING btree ("telegram_user_id");--> statement-breakpoint
CREATE INDEX "users_wallet_address_idx" ON "users" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "users_telegram_user_id_idx" ON "users" USING btree ("telegram_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_decisions_request_unique" ON "verification_decisions" USING btree ("verification_request_id");--> statement-breakpoint
CREATE INDEX "verification_decisions_decided_by_user_id_idx" ON "verification_decisions" USING btree ("decided_by_user_id");--> statement-breakpoint
CREATE INDEX "verification_decisions_outcome_idx" ON "verification_decisions" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "verification_requests_asset_id_idx" ON "verification_requests" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "verification_requests_requested_by_user_id_idx" ON "verification_requests" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "verification_requests_status_idx" ON "verification_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_bindings_wallet_address_unique" ON "wallet_bindings" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "wallet_bindings_user_id_idx" ON "wallet_bindings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallet_bindings_status_idx" ON "wallet_bindings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_source_external_event_id_unique" ON "webhook_events" USING btree ("source","external_event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_status_idx" ON "webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events" USING btree ("event_type");