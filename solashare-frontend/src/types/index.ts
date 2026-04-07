// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = "investor" | "issuer" | "admin";
export type KycStatus = "not_started" | "pending" | "approved" | "rejected" | "needs_changes";
export type KycDocumentType = "passport" | "national_id";

export type AssetStatus =
  | "draft"
  | "pending_review"
  | "verified"
  | "active_sale"
  | "funded"
  | "frozen"
  | "closed";

export type EnergyType = "solar" | "wind" | "hydro" | "ev_charging" | "other";

export type DocumentType =
  | "ownership_doc"
  | "right_to_income_doc"
  | "technical_passport"
  | "photo"
  | "meter_info"
  | "financial_model"
  | "revenue_report"
  | "other";

export type StorageProvider = "arweave" | "ipfs" | "s3";

export type RevenueStatus = "draft" | "posted" | "settled" | "flagged";

export type VerificationOutcome = "approved" | "rejected" | "needs_changes";

export type TransactionKind = "investment" | "claim" | "revenue_post" | "wallet_link";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string | null;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  kyc_status?: KycStatus;
  wallet_address?: string;
  auth_providers: string[];
}

export interface WalletChallengeResponse {
  challenge: string;
  nonce: string;
  expires_at: string;
}

export interface WalletVerifyResponse {
  success: boolean;
  verified: boolean;
  error?: string;
}

export interface KycOverview {
  kyc_status: KycStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  decision_notes: string | null;
  can_submit: boolean;
  current_request: {
    verification_request_id: string;
    request_status: "pending" | "in_review" | "approved" | "rejected" | "cancelled";
    document_type: KycDocumentType;
    document_name: string;
    mime_type: string;
    document_uri: string;
    document_hash: string;
    notes: string | null;
    created_at: string;
  } | null;
}

export interface PresignedUpload {
  upload_url: string;
  file_url: string;
  upload_method: "PUT";
  expires_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: AuthUser;
}

export interface TelegramAuthPreview {
  suggested_action: "login" | "register";
  telegram_user: {
    telegram_user_id: string;
    telegram_username: string | null;
    display_name: string;
    photo_url: string | null;
  };
  existing_account: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    role: UserRole;
    auth_providers: Array<"password" | "google" | "telegram">;
  } | null;
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface AssetListItem {
  id: string;
  title: string;
  energy_type: EnergyType;
  capacity_kw: number;
  status: AssetStatus;
  price_per_share_usdc: number;
  expected_annual_yield_percent: number;
  cover_image_url: string | null;
}

export interface AssetLocation {
  country: string;
  region?: string | null;
  city: string | null;
}

export interface AssetIssuer {
  id: string;
  display_name: string;
}

export interface SaleTerms {
  valuation_usdc: string;
  total_shares: number;
  price_per_share_usdc: string;
  minimum_buy_amount_usdc: string;
  target_raise_usdc: string;
  sale_status: "draft" | "scheduled" | "live" | "completed" | "cancelled";
}

export interface AssetDocument {
  id: string;
  type: DocumentType;
  title: string;
  storage_provider: StorageProvider;
  storage_uri: string;
  content_hash: string;
  mime_type?: string | null;
  is_public: boolean;
  created_at?: string;
}

export interface RevenueSummary {
  total_epochs: number;
  last_posted_epoch: number | null;
}

export interface OnchainRefs {
  onchain_asset_pubkey: string | null;
  share_mint_pubkey: string | null;
  vault_pubkey: string | null;
}

export interface AssetDetail {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  energy_type: EnergyType;
  status: AssetStatus;
  location: AssetLocation;
  capacity_kw: number;
  currency: string;
  expected_annual_yield_percent: number | null;
  cover_image_url: string | null;
  issuer: AssetIssuer;
  sale_terms: SaleTerms;
  public_documents: AssetDocument[];
  revenue_summary: RevenueSummary;
  onchain_refs: OnchainRefs;
}

export interface IssuerAssetReviewIssue {
  field: string;
  label?: string;
  note: string;
  expected_value?: string;
  actual_value?: string;
  document_type?: DocumentType;
}

export interface IssuerAssetReviewFeedback {
  outcome: "rejected" | "needs_changes";
  reason: string | null;
  created_at: string;
  issues: IssuerAssetReviewIssue[];
}

export interface IssuerAssetListItem {
  id: string;
  slug: string;
  title: string;
  energy_type: EnergyType;
  capacity_kw: number;
  status: AssetStatus;
  location_city: string | null;
  location_country: string;
  price_per_share_usdc: number | null;
  valuation_usdc: number | null;
  total_shares: number | null;
  is_publicly_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface IssuerAssetDetail {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  energy_type: EnergyType;
  status: AssetStatus;
  location: AssetLocation;
  capacity_kw: number;
  currency: string;
  expected_annual_yield_percent: number | null;
  is_publicly_visible: boolean;
  cover_image_url: string | null;
  issuer: AssetIssuer;
  revenue_summary: RevenueSummary;
  onchain_refs: OnchainRefs;
  sale_terms: SaleTerms | null;
  documents: AssetDocument[];
  review_feedback: IssuerAssetReviewFeedback | null;
}

export interface AdminAssetItem {
  id: string;
  title: string;
  slug: string;
  energy_type: EnergyType;
  capacity_kw: number;
  status: AssetStatus;
  issuer_display_name: string;
  location_country: string;
  location_city: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Revenue ──────────────────────────────────────────────────────────────────

export interface RevenueEpoch {
  id: string;
  epoch_number: number;
  period_start: string;
  period_end: string;
  gross_revenue_usdc: number;
  net_revenue_usdc: number;
  distributable_revenue_usdc: number;
  report_uri: string;
  posting_status: RevenueStatus;
}

// ─── Holders ──────────────────────────────────────────────────────────────────

export interface HoldersSummary {
  total_investors: number;
  funded_percent: number;
  total_distributed_usdc: number;
  total_claimed_usdc: number;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export interface PortfolioPosition {
  asset_id: string;
  title: string;
  shares_amount: number;
  shares_percentage: number;
  unclaimed_usdc: number;
}

export interface Portfolio {
  total_invested_usdc: number;
  total_claimed_usdc: number;
  total_unclaimed_usdc: number;
  positions: PortfolioPosition[];
}

// ─── Claims ───────────────────────────────────────────────────────────────────

export interface Claim {
  claim_id: string;
  asset_id: string;
  revenue_epoch_id: string;
  claim_amount_usdc: number;
  status: "pending" | "confirmed" | "failed";
  transaction_signature: string | null;
}

// ─── Investment ───────────────────────────────────────────────────────────────

export interface InvestmentQuote {
  shares_to_receive: number;
  price_per_share_usdc: number;
  fees_usdc: number;
}

export interface PreparedTransactionMetadataBase {
  kind: TransactionKind;
  asset_id: string;
}

export interface InvestmentPreparedTransactionMetadata extends PreparedTransactionMetadataBase {
  kind: "investment";
  amount_usdc: number;
  shares_to_receive: number;
}

export interface ClaimPreparedTransactionMetadata extends PreparedTransactionMetadataBase {
  kind: "claim";
  revenue_epoch_id: string;
  epoch_number: number;
  claim_amount_usdc: number;
}

export interface RevenuePostPreparedTransactionMetadata extends PreparedTransactionMetadataBase {
  kind: "revenue_post";
  revenue_epoch_id: string;
  epoch_number: number;
  amount_usdc: number;
}

export type PreparedTransactionMetadata =
  | InvestmentPreparedTransactionMetadata
  | ClaimPreparedTransactionMetadata
  | RevenuePostPreparedTransactionMetadata;

export interface PreparedTransactionResponse {
  success: true;
  operation_id: string;
  serialized_tx: string;
  metadata: PreparedTransactionMetadata;
  expires_at: number;
  network: "devnet" | "mainnet" | "localnet";
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actor_user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
}

export interface KycRequestItem {
  verification_request_id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  kyc_status: KycStatus;
  document_type: KycDocumentType;
  document_name: string;
  mime_type: string;
  document_uri: string;
  document_hash: string;
  notes: string | null;
  created_at: string;
}

export interface AdminUserItem {
  id: string;
  display_name: string;
  email: string | null;
  role: UserRole;
  status: "active" | "blocked";
  kyc_status: KycStatus;
  auth_providers: Array<"password" | "google" | "telegram">;
  created_at: string;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface AssetFilters {
  status?: AssetStatus;
  energy_type?: EnergyType;
  page?: number;
  limit?: number;
  sort?: "newest" | "yield_desc" | "price_asc";
}
