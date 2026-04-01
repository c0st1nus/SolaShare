import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();
const moneyAmount = (name: string) => numeric(name, { precision: 20, scale: 6 });
const shareAmount = (name: string) => numeric(name, { precision: 30, scale: 12 });

export const userRoleEnum = pgEnum("user_role", ["investor", "issuer", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "blocked"]);
export const authProviderEnum = pgEnum("auth_provider", ["password", "google", "telegram"]);
export const kycStatusEnum = pgEnum("kyc_status", [
  "not_started",
  "pending",
  "approved",
  "rejected",
  "needs_changes",
]);

export const energyTypeEnum = pgEnum("energy_type", [
  "solar",
  "wind",
  "hydro",
  "ev_charging",
  "other",
]);
export const assetStatusEnum = pgEnum("asset_status", [
  "draft",
  "pending_review",
  "verified",
  "active_sale",
  "funded",
  "frozen",
  "closed",
]);

export const assetDocumentTypeEnum = pgEnum("asset_document_type", [
  "ownership_doc",
  "right_to_income_doc",
  "technical_passport",
  "photo",
  "meter_info",
  "financial_model",
  "revenue_report",
  "other",
]);
export const storageProviderEnum = pgEnum("storage_provider", ["arweave", "ipfs", "s3"]);

export const verificationRequestTypeEnum = pgEnum("verification_request_type", [
  "asset_review",
  "document_review",
  "issuer_review",
  "revenue_review",
  "kyc_review",
]);
export const verificationRequestStatusEnum = pgEnum("verification_request_status", [
  "pending",
  "in_review",
  "approved",
  "rejected",
  "cancelled",
]);
export const verificationDecisionOutcomeEnum = pgEnum("verification_decision_outcome", [
  "approved",
  "rejected",
  "needs_changes",
]);

export const saleStatusEnum = pgEnum("sale_status", [
  "draft",
  "scheduled",
  "live",
  "completed",
  "cancelled",
]);
export const shareMintStatusEnum = pgEnum("share_mint_status", [
  "draft",
  "prepared",
  "minted",
  "failed",
]);

export const investmentStatusEnum = pgEnum("investment_status", ["pending", "confirmed", "failed"]);

export const revenueSourceTypeEnum = pgEnum("revenue_source_type", [
  "manual_report",
  "meter_export",
  "operator_statement",
]);
export const revenueStatusEnum = pgEnum("revenue_status", [
  "draft",
  "posted",
  "settled",
  "flagged",
]);
export const revenueDepositStatusEnum = pgEnum("revenue_deposit_status", [
  "pending",
  "confirmed",
  "failed",
]);
export const claimStatusEnum = pgEnum("claim_status", ["pending", "confirmed", "failed"]);

export const walletBindingStatusEnum = pgEnum("wallet_binding_status", [
  "pending",
  "active",
  "revoked",
]);
export const webhookEventStatusEnum = pgEnum("webhook_event_status", [
  "pending",
  "processing",
  "processed",
  "failed",
  "dead_letter",
]);
export const jobExecutionStatusEnum = pgEnum("job_execution_status", [
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "investment_confirmed",
  "revenue_posted",
  "claim_available",
  "sale_opened",
  "sale_completed",
  "asset_frozen",
  "system",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletAddress: text("wallet_address"),
    telegramUserId: text("telegram_user_id"),
    telegramUsername: text("telegram_username"),
    displayName: text("display_name"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").default("investor").notNull(),
    status: userStatusEnum("status").default("active").notNull(),
    kycStatus: kycStatusEnum("kyc_status").default("not_started").notNull(),
    kycSubmittedAt: timestamp("kyc_submitted_at", { withTimezone: true }),
    kycReviewedAt: timestamp("kyc_reviewed_at", { withTimezone: true }),
    kycDecisionNotes: text("kyc_decision_notes"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("users_wallet_address_unique").on(table.walletAddress),
    uniqueIndex("users_telegram_user_id_unique").on(table.telegramUserId),
    index("users_wallet_address_idx").on(table.walletAddress),
    index("users_telegram_user_id_idx").on(table.telegramUserId),
    index("users_kyc_status_idx").on(table.kycStatus),
  ],
);

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: authProviderEnum("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    email: text("email"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    profileJson: jsonb("profile_json"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("auth_identities_provider_user_id_unique").on(table.provider, table.providerUserId),
    index("auth_identities_user_id_idx").on(table.userId),
    index("auth_identities_provider_idx").on(table.provider),
    index("auth_identities_email_idx").on(table.email),
  ],
);

export const passwordCredentials = pgTable(
  "password_credentials",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index("password_credentials_user_id_idx").on(table.userId)],
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    uniqueIndex("user_sessions_session_token_hash_unique").on(table.sessionTokenHash),
    index("user_sessions_user_id_idx").on(table.userId),
    index("user_sessions_expires_at_idx").on(table.expiresAt),
    index("user_sessions_revoked_at_idx").on(table.revokedAt),
  ],
);

export const walletBindings = pgTable(
  "wallet_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    walletAddress: text("wallet_address").notNull(),
    chain: text("chain").default("solana").notNull(),
    label: text("label"),
    status: walletBindingStatusEnum("status").default("pending").notNull(),
    verificationMessage: text("verification_message"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("wallet_bindings_wallet_address_unique").on(table.walletAddress),
    index("wallet_bindings_user_id_idx").on(table.userId),
    index("wallet_bindings_status_idx").on(table.status),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    shortDescription: text("short_description").notNull(),
    fullDescription: text("full_description").notNull(),
    energyType: energyTypeEnum("energy_type").notNull(),
    issuerUserId: uuid("issuer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    locationCountry: text("location_country").notNull(),
    locationRegion: text("location_region"),
    locationCity: text("location_city"),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    capacityKw: numeric("capacity_kw", { precision: 14, scale: 3 }).notNull(),
    commissioningDate: date("commissioning_date"),
    expectedAnnualYieldPercent: numeric("expected_annual_yield_percent", {
      precision: 7,
      scale: 4,
    }),
    currency: text("currency").default("USDC").notNull(),
    status: assetStatusEnum("status").default("draft").notNull(),
    coverImageUrl: text("cover_image_url"),
    assetMetadataUri: text("asset_metadata_uri"),
    onchainAssetPubkey: text("onchain_asset_pubkey"),
    shareMintPubkey: text("share_mint_pubkey"),
    vaultPubkey: text("vault_pubkey"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("assets_slug_unique").on(table.slug),
    uniqueIndex("assets_onchain_asset_pubkey_unique").on(table.onchainAssetPubkey),
    uniqueIndex("assets_share_mint_pubkey_unique").on(table.shareMintPubkey),
    uniqueIndex("assets_vault_pubkey_unique").on(table.vaultPubkey),
    index("assets_issuer_user_id_idx").on(table.issuerUserId),
    index("assets_status_idx").on(table.status),
    index("assets_energy_type_idx").on(table.energyType),
    index("assets_created_at_idx").on(table.createdAt),
  ],
);

export const assetDocuments = pgTable(
  "asset_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    type: assetDocumentTypeEnum("type").notNull(),
    title: text("title").notNull(),
    storageProvider: storageProviderEnum("storage_provider").notNull(),
    storageUri: text("storage_uri").notNull(),
    contentHash: text("content_hash").notNull(),
    mimeType: text("mime_type"),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    isPublic: boolean("is_public").default(false).notNull(),
    createdAt,
  },
  (table) => [
    index("asset_documents_asset_id_idx").on(table.assetId),
    index("asset_documents_type_idx").on(table.type),
    index("asset_documents_uploaded_by_user_id_idx").on(table.uploadedByUserId),
  ],
);

export const verificationRequests = pgTable(
  "verification_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "cascade",
    }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    requestType: verificationRequestTypeEnum("request_type").notNull(),
    status: verificationRequestStatusEnum("status").default("pending").notNull(),
    payloadJson: jsonb("payload_json"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("verification_requests_asset_id_idx").on(table.assetId),
    index("verification_requests_requested_by_user_id_idx").on(table.requestedByUserId),
    index("verification_requests_status_idx").on(table.status),
  ],
);

export const verificationDecisions = pgTable(
  "verification_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    verificationRequestId: uuid("verification_request_id")
      .notNull()
      .references(() => verificationRequests.id, { onDelete: "cascade" }),
    decidedByUserId: uuid("decided_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    outcome: verificationDecisionOutcomeEnum("outcome").notNull(),
    reason: text("reason"),
    metadataJson: jsonb("metadata_json"),
    createdAt,
  },
  (table) => [
    uniqueIndex("verification_decisions_request_unique").on(table.verificationRequestId),
    index("verification_decisions_decided_by_user_id_idx").on(table.decidedByUserId),
    index("verification_decisions_outcome_idx").on(table.outcome),
  ],
);

export const assetSaleTerms = pgTable(
  "asset_sale_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    valuationUsdc: moneyAmount("valuation_usdc").notNull(),
    totalShares: bigint("total_shares", { mode: "number" }).notNull(),
    pricePerShareUsdc: moneyAmount("price_per_share_usdc").notNull(),
    minimumBuyAmountUsdc: moneyAmount("minimum_buy_amount_usdc").notNull(),
    targetRaiseUsdc: moneyAmount("target_raise_usdc").notNull(),
    saleStartAt: timestamp("sale_start_at", { withTimezone: true }),
    saleEndAt: timestamp("sale_end_at", { withTimezone: true }),
    saleStatus: saleStatusEnum("sale_status").default("draft").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("asset_sale_terms_asset_id_unique").on(table.assetId),
    index("asset_sale_terms_sale_status_idx").on(table.saleStatus),
  ],
);

export const shareMints = pgTable(
  "share_mints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    mintAddress: text("mint_address").notNull(),
    decimals: integer("decimals").default(0).notNull(),
    tokenProgram: text("token_program").notNull(),
    vaultAddress: text("vault_address"),
    transactionSignature: text("transaction_signature"),
    status: shareMintStatusEnum("status").default("draft").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("share_mints_asset_id_unique").on(table.assetId),
    uniqueIndex("share_mints_mint_address_unique").on(table.mintAddress),
    uniqueIndex("share_mints_vault_address_unique").on(table.vaultAddress),
    index("share_mints_status_idx").on(table.status),
  ],
);

export const investments = pgTable(
  "investments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    amountUsdc: moneyAmount("amount_usdc").notNull(),
    sharesReceived: shareAmount("shares_received").notNull(),
    transactionSignature: text("transaction_signature"),
    status: investmentStatusEnum("status").default("pending").notNull(),
    createdAt,
  },
  (table) => [
    index("investments_user_id_idx").on(table.userId),
    index("investments_asset_id_idx").on(table.assetId),
    index("investments_status_idx").on(table.status),
    index("investments_transaction_signature_idx").on(table.transactionSignature),
  ],
);

export const holdingsSnapshots = pgTable(
  "holdings_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    sharesAmount: shareAmount("shares_amount").notNull(),
    sharesPercentage: numeric("shares_percentage", {
      precision: 9,
      scale: 6,
    }).notNull(),
    lastSyncedSlot: bigint("last_synced_slot", { mode: "number" }),
    updatedAt,
  },
  (table) => [
    uniqueIndex("holdings_snapshots_user_asset_unique").on(table.userId, table.assetId),
    index("holdings_snapshots_asset_id_idx").on(table.assetId),
  ],
);

export const revenueEpochs = pgTable(
  "revenue_epochs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    epochNumber: integer("epoch_number").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    grossRevenueUsdc: moneyAmount("gross_revenue_usdc").notNull(),
    netRevenueUsdc: moneyAmount("net_revenue_usdc").notNull(),
    distributableRevenueUsdc: moneyAmount("distributable_revenue_usdc").notNull(),
    reportUri: text("report_uri"),
    reportHash: text("report_hash"),
    sourceType: revenueSourceTypeEnum("source_type").notNull(),
    postedByUserId: uuid("posted_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    onchainRevenuePubkey: text("onchain_revenue_pubkey"),
    transactionSignature: text("transaction_signature"),
    status: revenueStatusEnum("status").default("draft").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("revenue_epochs_asset_epoch_unique").on(table.assetId, table.epochNumber),
    uniqueIndex("revenue_epochs_onchain_revenue_pubkey_unique").on(table.onchainRevenuePubkey),
    index("revenue_epochs_status_idx").on(table.status),
    index("revenue_epochs_posted_by_user_id_idx").on(table.postedByUserId),
  ],
);

export const revenueDeposits = pgTable(
  "revenue_deposits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revenueEpochId: uuid("revenue_epoch_id")
      .notNull()
      .references(() => revenueEpochs.id, { onDelete: "cascade" }),
    depositedByUserId: uuid("deposited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amountUsdc: moneyAmount("amount_usdc").notNull(),
    sourceReference: text("source_reference"),
    transactionSignature: text("transaction_signature"),
    status: revenueDepositStatusEnum("status").default("pending").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("revenue_deposits_revenue_epoch_id_idx").on(table.revenueEpochId),
    index("revenue_deposits_deposited_by_user_id_idx").on(table.depositedByUserId),
    index("revenue_deposits_status_idx").on(table.status),
  ],
);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    revenueEpochId: uuid("revenue_epoch_id")
      .notNull()
      .references(() => revenueEpochs.id, { onDelete: "restrict" }),
    claimAmountUsdc: moneyAmount("claim_amount_usdc").notNull(),
    transactionSignature: text("transaction_signature"),
    status: claimStatusEnum("status").default("pending").notNull(),
    createdAt,
  },
  (table) => [
    index("claims_user_id_idx").on(table.userId),
    index("claims_asset_id_idx").on(table.assetId),
    index("claims_revenue_epoch_id_idx").on(table.revenueEpochId),
    index("claims_status_idx").on(table.status),
  ],
);

export const transfersIndex = pgTable(
  "transfers_index",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    fromWallet: text("from_wallet").notNull(),
    toWallet: text("to_wallet").notNull(),
    sharesAmount: shareAmount("shares_amount").notNull(),
    transactionSignature: text("transaction_signature").notNull(),
    blockTime: timestamp("block_time", { withTimezone: true }).notNull(),
    createdAt,
  },
  (table) => [
    index("transfers_index_asset_id_idx").on(table.assetId),
    index("transfers_index_transaction_signature_idx").on(table.transactionSignature),
    index("transfers_index_block_time_idx").on(table.blockTime),
  ],
);

export const assetStatusHistory = pgTable(
  "asset_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    oldStatus: assetStatusEnum("old_status"),
    newStatus: assetStatusEnum("new_status").notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    transactionSignature: text("transaction_signature"),
    createdAt,
  },
  (table) => [
    index("asset_status_history_asset_id_idx").on(table.assetId),
    index("asset_status_history_changed_by_user_id_idx").on(table.changedByUserId),
    index("asset_status_history_new_status_idx").on(table.newStatus),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").default("system").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    metadataJson: jsonb("metadata_json"),
    createdAt,
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_is_read_idx").on(table.isRead),
    index("notifications_type_idx").on(table.type),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: text("source").notNull(),
    eventType: text("event_type").notNull(),
    externalEventId: text("external_event_id"),
    payloadJson: jsonb("payload_json").notNull(),
    status: webhookEventStatusEnum("status").default("pending").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("webhook_events_source_external_event_id_unique").on(
      table.source,
      table.externalEventId,
    ),
    index("webhook_events_status_idx").on(table.status),
    index("webhook_events_received_at_idx").on(table.receivedAt),
    index("webhook_events_event_type_idx").on(table.eventType),
  ],
);

export const jobExecutionLogs = pgTable(
  "job_execution_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    queueName: text("queue_name").notNull(),
    jobName: text("job_name").notNull(),
    jobId: text("job_id"),
    status: jobExecutionStatusEnum("status").default("running").notNull(),
    attempt: integer("attempt").default(1).notNull(),
    payloadJson: jsonb("payload_json"),
    resultJson: jsonb("result_json"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("job_execution_logs_queue_name_idx").on(table.queueName),
    index("job_execution_logs_job_name_idx").on(table.jobName),
    index("job_execution_logs_status_idx").on(table.status),
    index("job_execution_logs_job_id_idx").on(table.jobId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    payloadJson: jsonb("payload_json"),
    createdAt,
  },
  (table) => [
    index("audit_logs_entity_type_entity_id_idx").on(table.entityType, table.entityId),
    index("audit_logs_actor_user_id_idx").on(table.actorUserId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseJson: jsonb("response_json"),
    createdAt,
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({
      columns: [table.scope, table.key],
      name: "idempotency_keys_pk",
    }),
    index("idempotency_keys_expires_at_idx").on(table.expiresAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetSaleTerms = typeof assetSaleTerms.$inferSelect;
export type NewAssetSaleTerms = typeof assetSaleTerms.$inferInsert;
export type AssetDocument = typeof assetDocuments.$inferSelect;
export type NewAssetDocument = typeof assetDocuments.$inferInsert;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type NewVerificationRequest = typeof verificationRequests.$inferInsert;
export type VerificationDecision = typeof verificationDecisions.$inferSelect;
export type NewVerificationDecision = typeof verificationDecisions.$inferInsert;
export type ShareMint = typeof shareMints.$inferSelect;
export type NewShareMint = typeof shareMints.$inferInsert;
export type Investment = typeof investments.$inferSelect;
export type NewInvestment = typeof investments.$inferInsert;
export type HoldingsSnapshot = typeof holdingsSnapshots.$inferSelect;
export type NewHoldingsSnapshot = typeof holdingsSnapshots.$inferInsert;
export type RevenueEpoch = typeof revenueEpochs.$inferSelect;
export type NewRevenueEpoch = typeof revenueEpochs.$inferInsert;
export type RevenueDeposit = typeof revenueDeposits.$inferSelect;
export type NewRevenueDeposit = typeof revenueDeposits.$inferInsert;
export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;
export type WalletBinding = typeof walletBindings.$inferSelect;
export type NewWalletBinding = typeof walletBindings.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
export type JobExecutionLog = typeof jobExecutionLogs.$inferSelect;
export type NewJobExecutionLog = typeof jobExecutionLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
