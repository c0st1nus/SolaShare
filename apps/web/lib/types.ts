export type UserRole = "investor" | "issuer" | "admin";

export type AssetStatus =
  | "draft"
  | "pending_review"
  | "verified"
  | "active_sale"
  | "funded"
  | "frozen"
  | "closed";

export type EnergyType = "solar" | "wind" | "hydro" | "ev_charging" | "other";

export type AssetDocumentType =
  | "ownership_doc"
  | "right_to_income_doc"
  | "technical_passport"
  | "photo"
  | "meter_info"
  | "financial_model"
  | "revenue_report"
  | "other";

export type StorageProvider = "arweave" | "ipfs" | "s3";

export type RevenueSourceType = "manual_report" | "meter_export" | "operator_statement";

export type RevenueStatus = "draft" | "posted" | "settled" | "flagged";

export type VerificationOutcome = "approved" | "rejected" | "needs_changes";

export type TransactionKind = "investment" | "claim" | "revenue_post" | "wallet_link";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface AssetListItem {
  id: string;
  title: string;
  energy_type: EnergyType;
  capacity_kw: number;
  status: AssetStatus;
  price_per_share_usdc: number;
  expected_annual_yield_percent: number | null;
  image_url?: string;
  location_label?: string;
  issuer_name?: string;
  funded_percent?: number;
}

export interface AssetListResponse {
  items: AssetListItem[];
  pagination: Pagination;
}

export interface AssetLocation {
  country: string;
  region: string | null;
  city: string | null;
}

export interface AssetIssuer {
  id: string;
  display_name: string;
}

export interface AssetSaleTerms {
  valuation_usdc: string;
  total_shares: number;
  price_per_share_usdc: string;
  minimum_buy_amount_usdc: string;
  target_raise_usdc: string;
  sale_status: string;
}

export interface AssetDocument {
  id: string;
  type: AssetDocumentType;
  title: string;
  storage_provider: StorageProvider;
  storage_uri: string;
  content_hash: string;
  is_public: boolean;
}

export interface AssetRevenueSummary {
  total_epochs: number;
  last_posted_epoch: number;
}

export interface AssetOnchainRefs {
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
  issuer: AssetIssuer;
  sale_terms: AssetSaleTerms;
  public_documents: AssetDocument[];
  revenue_summary: AssetRevenueSummary;
  onchain_refs: AssetOnchainRefs;
  hero_image_url?: string;
  headline_metrics?: Array<{
    label: string;
    value: string;
    tone?: "brand" | "accent" | "neutral";
  }>;
}

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

export interface AssetRevenueResponse {
  items: RevenueEpoch[];
}

export interface AssetDocumentsResponse {
  items: AssetDocument[];
}

export interface PortfolioPosition {
  asset_id: string;
  title: string;
  shares_amount: number;
  shares_percentage: number;
  unclaimed_usdc: number;
}

export interface PortfolioResponse {
  total_invested_usdc: number;
  total_claimed_usdc: number;
  total_unclaimed_usdc: number;
  positions: PortfolioPosition[];
}

export interface ClaimItem {
  claim_id: string;
  asset_id: string;
  revenue_epoch_id: string;
  claim_amount_usdc: number;
  status: string;
  transaction_signature: string | null;
}

export interface ClaimsResponse {
  items: ClaimItem[];
}

export interface AuthTelegramRequest {
  telegram_init_data: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  display_name: string;
  role: UserRole;
  auth_providers: Array<"password" | "google" | "telegram">;
}

export interface AuthSessionResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: AuthUser;
}

export interface AuthTelegramResponse extends AuthSessionResponse {}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRefreshRequest {
  refresh_token: string;
}

export interface AuthLogoutRequest {
  refresh_token: string;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface GoogleAuthUrlResponse {
  authorization_url: string;
}

export interface GoogleAuthRequest {
  code: string;
  redirect_uri?: string;
}

export interface TelegramLoginRequest {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

export interface WalletLinkRequest {
  wallet_address: string;
  signed_message: string;
}

export interface WalletLinkResponse {
  success: boolean;
}

export interface InvestmentQuoteRequest {
  asset_id: string;
  amount_usdc: number;
}

export interface InvestmentQuoteResponse {
  shares_to_receive: number;
  price_per_share_usdc: number;
  fees_usdc: number;
}

export interface InvestmentPrepareResponse {
  success: boolean;
  operation_id: string;
  signing_payload: {
    kind: "investment";
    asset_id: string;
    amount_usdc: number;
  };
  message: string;
}

export interface ClaimPrepareRequest {
  asset_id: string;
  revenue_epoch_id: string;
}

export interface ClaimPrepareResponse {
  success: boolean;
  operation_id: string;
  signing_payload: {
    kind: "claim";
    asset_id: string;
    revenue_epoch_id: string;
  };
  message: string;
}

export interface TransactionConfirmRequest {
  transaction_signature: string;
  kind: TransactionKind;
  operation_id?: string;
}

export interface TransactionConfirmResponse {
  success: boolean;
  sync_status: string;
}

export interface IssuerAssetCreateRequest {
  title: string;
  short_description: string;
  full_description: string;
  energy_type: EnergyType;
  location_country: string;
  location_region?: string;
  location_city: string;
  capacity_kw: number;
}

export interface IssuerAssetCreateResponse {
  asset_id: string;
  status: AssetStatus;
}

export type IssuerAssetUpdateRequest = Partial<IssuerAssetCreateRequest>;

export interface IssuerDocumentRequest {
  type: AssetDocumentType;
  title: string;
  storage_provider: StorageProvider;
  storage_uri: string;
  content_hash: string;
  is_public: boolean;
}

export interface IssuerDocumentResponse {
  document_id: string;
  success: boolean;
}

export interface IssuerSaleTermsRequest {
  valuation_usdc: number;
  total_shares: number;
  price_per_share_usdc: number;
  minimum_buy_amount_usdc: number;
  target_raise_usdc: number;
}

export interface IssuerSaleTermsResponse {
  success: boolean;
  asset_id: string;
}

export interface IssuerSubmitResponse {
  success: boolean;
  message: string;
  next_status: AssetStatus;
}

export interface RevenueEpochCreateRequest {
  epoch_number: number;
  period_start: string;
  period_end: string;
  gross_revenue_usdc: number;
  net_revenue_usdc: number;
  distributable_revenue_usdc: number;
  report_uri: string;
  report_hash: string;
  source_type: RevenueSourceType;
}

export interface RevenueEpochCreateResponse {
  success: boolean;
  revenue_epoch_id: string;
}

export interface RevenuePostResponse {
  success: boolean;
  operation_id: string;
  transaction_payload: {
    kind: "revenue_post";
    asset_id: string;
    revenue_epoch_id: string;
  };
  message: string;
}

export interface AdminVerifyRequest {
  outcome: VerificationOutcome;
  reason: string;
}

export interface AdminAssetStatusResponse {
  success: boolean;
  asset_id: string;
  resulting_status: AssetStatus;
}
