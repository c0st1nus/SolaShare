import { clearSession, getStoredSession, storeSession } from "@/lib/session";
import type {
  AdminAssetItem,
  AdminUserItem,
  AssetDetail,
  AssetDocument,
  AssetFilters,
  AssetListItem,
  AuditLog,
  AuthResponse,
  Claim,
  HoldersSummary,
  InvestmentQuote,
  IssuerAssetDetail,
  IssuerAssetListItem,
  IssuerAssetReviewIssue,
  KycDocumentType,
  KycOverview,
  KycRequestItem,
  Pagination,
  Portfolio,
  PreparedTransactionResponse,
  PresignedUpload,
  RevenueEpoch,
  TelegramAuthPreview,
  TransactionKind,
  VerificationOutcome,
  WalletChallengeResponse,
  WalletVerifyResponse,
} from "@/types";

export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const V1 = `${BASE}/api/v1`;

function getToken(): string | null {
  return getStoredSession()?.accessToken ?? null;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredSession()?.refreshToken;

  if (!refreshToken) {
    clearSession();
    return null;
  }

  const res = await fetch(`${V1}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    return null;
  }

  const session = (await res.json()) as AuthResponse;
  storeSession(session);

  return session.access_token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false,
  retryOnUnauthorized = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${V1}${path}`, { ...options, headers });
  if (!res.ok) {
    if (auth && res.status === 401 && retryOnUnauthorized) {
      const nextToken = await refreshAccessToken();

      if (nextToken) {
        return request<T>(path, options, auth, false);
      }
    }

    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string, display_name: string): Promise<AuthResponse> =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    }),

  login: (email: string, password: string): Promise<AuthResponse> =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  refresh: (refresh_token: string): Promise<AuthResponse> =>
    request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }),

  logout: (refresh_token: string): Promise<{ success: boolean }> =>
    request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }),

  me: (): Promise<{ user: AuthResponse["user"] }> => request("/auth/me", {}, true),

  googleUrl: (redirect_uri?: string, state?: string) => {
    const params = new URLSearchParams();
    if (redirect_uri) params.set("redirect_uri", redirect_uri);
    if (state) params.set("state", state);
    const qs = params.toString();
    return request<{ authorization_url: string }>(`/auth/google/url${qs ? `?${qs}` : ""}`);
  },

  google: (code: string, redirect_uri: string): Promise<AuthResponse> =>
    request("/auth/google", {
      method: "POST",
      body: JSON.stringify({ code, redirect_uri }),
    }),

  telegramLogin: (data: {
    id: string;
    first_name: string;
    username?: string;
    auth_date: string;
    hash: string;
  }): Promise<AuthResponse> =>
    request("/auth/telegram/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  telegramPreview: (telegram_init_data: string): Promise<TelegramAuthPreview> =>
    request("/auth/telegram/preview", {
      method: "POST",
      body: JSON.stringify({ telegram_init_data }),
    }),

  telegram: (telegram_init_data: string): Promise<AuthResponse> =>
    request("/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ telegram_init_data }),
    }),

  linkPassword: (email: string, password: string) =>
    request<{ success: true; user: AuthResponse["user"] }>(
      "/auth/password/link",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      true,
    ),

  linkWallet: (wallet_address: string, signed_message: string) =>
    request<{ success: boolean }>(
      "/auth/wallet/link",
      {
        method: "POST",
        body: JSON.stringify({ wallet_address, signed_message }),
      },
      true,
    ),

  walletChallenge: (wallet_address: string): Promise<WalletChallengeResponse> =>
    request(
      "/auth/wallet/challenge",
      {
        method: "POST",
        body: JSON.stringify({ wallet_address }),
      },
      true,
    ),

  walletVerify: (
    wallet_address: string,
    challenge: string,
    signature: string,
  ): Promise<WalletVerifyResponse> =>
    request(
      "/auth/wallet/verify",
      {
        method: "POST",
        body: JSON.stringify({ wallet_address, challenge, signature }),
      },
      true,
    ),

  unlinkWallet: (): Promise<{ success: boolean; message: string }> =>
    request(
      "/auth/wallet/unlink",
      {
        method: "POST",
      },
      true,
    ),
};

// ─── Assets ───────────────────────────────────────────────────────────────────

export const assetsApi = {
  list: (
    filters: AssetFilters = {},
  ): Promise<{ items: AssetListItem[]; pagination: Pagination }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
    const qs = params.toString();
    return request(`/assets${qs ? `?${qs}` : ""}`);
  },

  get: (id: string): Promise<AssetDetail> => request(`/assets/${id}`),

  revenue: (id: string): Promise<{ items: RevenueEpoch[] }> => request(`/assets/${id}/revenue`),

  documents: (id: string): Promise<{ items: AssetDocument[] }> =>
    request(`/assets/${id}/documents`),

  holdersSummary: (id: string): Promise<HoldersSummary> => request(`/assets/${id}/holders-summary`),
};

// ─── Issuer ───────────────────────────────────────────────────────────────────

export const issuerApi = {
  createAsset: (data: {
    title: string;
    short_description: string;
    full_description: string;
    energy_type: string;
    cover_image_url?: string;
    location_country: string;
    location_city: string;
    capacity_kw: number;
  }): Promise<{ asset_id: string; status: string }> =>
    request("/issuer/assets", { method: "POST", body: JSON.stringify(data) }, true),

  listAssets: (params: { status?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([key, value]) => [key, String(value)]),
    ).toString();

    return request<{ items: IssuerAssetListItem[]; pagination: Pagination }>(
      `/issuer/assets${qs ? `?${qs}` : ""}`,
      {},
      true,
    );
  },

  getAsset: (id: string) => request<IssuerAssetDetail>(`/issuer/assets/${id}`, {}, true),

  updateAsset: (id: string, data: Record<string, unknown>) =>
    request<{ asset_id: string; status: string }>(
      `/issuer/assets/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      true,
    ),

  updateVisibility: (id: string, is_publicly_visible: boolean) =>
    request<{ success: boolean; asset_id: string; is_publicly_visible: boolean }>(
      `/issuer/assets/${id}/visibility`,
      { method: "POST", body: JSON.stringify({ is_publicly_visible }) },
      true,
    ),

  deleteAsset: (id: string) =>
    request<{ success: boolean; asset_id: string }>(
      `/issuer/assets/${id}`,
      { method: "DELETE" },
      true,
    ),

  uploadDocument: (
    id: string,
    data: {
      type: string;
      title: string;
      storage_provider: string;
      storage_uri: string;
      content_hash: string;
      mime_type?: string;
      is_public?: boolean;
    },
  ) =>
    request<{ document_id: string; success: boolean }>(
      `/issuer/assets/${id}/documents`,
      { method: "POST", body: JSON.stringify(data) },
      true,
    ),

  updateDocument: (
    id: string,
    documentId: string,
    data: {
      type?: string;
      title?: string;
      storage_provider?: string;
      storage_uri?: string;
      content_hash?: string;
      mime_type?: string | null;
      is_public?: boolean;
    },
  ) =>
    request<{ document_id: string; success: boolean }>(
      `/issuer/assets/${id}/documents/${documentId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      true,
    ),

  deleteDocument: (id: string, documentId: string) =>
    request<{ document_id: string; success: boolean }>(
      `/issuer/assets/${id}/documents/${documentId}`,
      { method: "DELETE" },
      true,
    ),

  setSaleTerms: (
    id: string,
    data: {
      valuation_usdc: number;
      minimum_buy_amount_usdc: number;
      total_shares?: number;
      price_per_share_usdc?: number;
      target_raise_usdc?: number;
    },
  ) =>
    request<{ success: boolean; asset_id: string }>(
      `/issuer/assets/${id}/sale-terms`,
      { method: "POST", body: JSON.stringify(data) },
      true,
    ),

  submit: (id: string) =>
    request<{ success: boolean; message: string; next_status: string }>(
      `/issuer/assets/${id}/submit`,
      { method: "POST" },
      true,
    ),

  prepareOnchainSetup: (id: string, data: { metadata_uri?: string }) =>
    request<PreparedTransactionResponse>(
      `/issuer/assets/${id}/onchain/setup`,
      { method: "POST", body: JSON.stringify(data) },
      true,
    ),

  confirmOnchainSetup: (id: string, signature: string) =>
    request<{ success: boolean; asset_id: string }>(
      `/issuer/assets/${id}/onchain/confirm`,
      { method: "POST", body: JSON.stringify({ transaction_signature: signature }) },
      true,
    ),

  createRevenueEpoch: (
    id: string,
    data: {
      epoch_number: number;
      period_start: string;
      period_end: string;
      gross_revenue_usdc: number;
      net_revenue_usdc: number;
      distributable_revenue_usdc: number;
      report_uri: string;
      report_hash: string;
      source_type: string;
    },
  ) =>
    request<{ success: boolean; revenue_epoch_id: string }>(
      `/issuer/assets/${id}/revenue-epochs`,
      { method: "POST", body: JSON.stringify(data) },
      true,
    ),

  postRevenue: (assetId: string, epochId: string) =>
    request<{
      success: boolean;
      operation_id: string;
      transaction_payload: unknown;
      message: string;
    }>(`/issuer/assets/${assetId}/revenue-epochs/${epochId}/post`, { method: "POST" }, true),

  onchainSetup: (assetId: string, metadata_uri?: string) =>
    request<{
      success: boolean;
      operation_id: string;
      serialized_tx: string;
      metadata: {
        kind: "onchain_setup";
        asset_id: string;
        title: string;
      };
      expires_at: number;
    }>(
      `/issuer/assets/${assetId}/onchain/setup`,
      {
        method: "POST",
        body: JSON.stringify(metadata_uri ? { metadata_uri } : {}),
      },
      true,
    ),

  onchainConfirm: (assetId: string, transaction_signature: string) =>
    request<{
      success: boolean;
      asset_id: string;
      resulting_status: string;
      sale_status: string;
      onchain_refs: {
        onchain_asset_pubkey: string;
        share_mint_pubkey: string;
        vault_pubkey: string;
      };
    }>(
      `/issuer/assets/${assetId}/onchain/confirm`,
      {
        method: "POST",
        body: JSON.stringify({ transaction_signature }),
      },
      true,
    ),
};

// ─── Investor ─────────────────────────────────────────────────────────────────

export const investorApi = {
  profile: (): Promise<{ user: AuthResponse["user"] }> => request("/me/profile", {}, true),

  kycOverview: (): Promise<KycOverview> => request("/me/kyc", {}, true),

  updateProfile: (data: {
    display_name?: string;
    bio?: string | null;
    avatar_url?: string | null;
  }): Promise<{ user: AuthResponse["user"] }> =>
    request(
      "/me/profile",
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      true,
    ),

  submitKyc: (
    document_type: KycDocumentType,
    document_name: string,
    mime_type: string,
    document_uri: string,
    document_hash: string,
    notes?: string,
  ) =>
    request<{
      success: boolean;
      kyc_status: "pending";
      verification_request_id: string;
    }>(
      "/me/kyc/submit",
      {
        method: "POST",
        body: JSON.stringify({
          document_type,
          document_name,
          mime_type,
          document_uri,
          document_hash,
          notes,
        }),
      },
      true,
    ),

  cancelKyc: () =>
    request<{
      success: boolean;
      kyc_status: "not_started";
      verification_request_id: string;
    }>("/me/kyc/cancel", { method: "POST" }, true),

  portfolio: (): Promise<Portfolio> => request("/me/portfolio", {}, true),

  claims: (): Promise<{ items: Claim[] }> => request("/me/claims", {}, true),

  quote: (asset_id: string, amount_usdc: number): Promise<InvestmentQuote> =>
    request(
      "/investments/quote",
      { method: "POST", body: JSON.stringify({ asset_id, amount_usdc }) },
      true,
    ),

  prepare: (asset_id: string, amount_usdc: number) =>
    request<PreparedTransactionResponse>(
      "/investments/prepare",
      { method: "POST", body: JSON.stringify({ asset_id, amount_usdc }) },
      true,
    ),

  prepareClaim: (asset_id: string, revenue_epoch_id: string) =>
    request<PreparedTransactionResponse>(
      "/claims/prepare",
      { method: "POST", body: JSON.stringify({ asset_id, revenue_epoch_id }) },
      true,
    ),

  confirmTransaction: (
    transaction_signature: string,
    kind: TransactionKind,
    operation_id?: string,
  ) =>
    request<{ success: boolean; sync_status: string }>(
      "/transactions/confirm",
      {
        method: "POST",
        body: JSON.stringify({ transaction_signature, kind, operation_id }),
      },
      true,
    ),
};

export const uploadsApi = {
  presign: (
    purpose: "kyc_document" | "avatar_image" | "asset_document",
    file_name: string,
    content_type: string,
    size_bytes: number,
  ): Promise<PresignedUpload> =>
    request(
      "/uploads/presign",
      {
        method: "POST",
        body: JSON.stringify({
          purpose,
          file_name,
          content_type,
          size_bytes,
        }),
      },
      true,
    ),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  assets: (params: { status?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([key, value]) => [key, String(value)]),
    ).toString();

    return request<{ items: AdminAssetItem[]; pagination: Pagination }>(
      `/admin/assets${qs ? `?${qs}` : ""}`,
      {},
      true,
    );
  },

  getAsset: (id: string) => request<IssuerAssetDetail>(`/admin/assets/${id}`, {}, true),

  kycRequests: (
    params: {
      status?: "pending" | "in_review" | "approved" | "rejected" | "cancelled";
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();

    return request<{ items: KycRequestItem[]; pagination: Pagination }>(
      `/admin/kyc-requests${qs ? `?${qs}` : ""}`,
      {},
      true,
    );
  },

  verify: (
    id: string,
    outcome: VerificationOutcome,
    reason?: string,
    issues?: IssuerAssetReviewIssue[],
  ) =>
    request<{ success: boolean; asset_id: string; resulting_status: string }>(
      `/admin/assets/${id}/verify`,
      { method: "POST", body: JSON.stringify({ outcome, reason, issues }) },
      true,
    ),

  reviewKyc: (id: string, outcome: VerificationOutcome, reason?: string) =>
    request<{
      success: boolean;
      user_id: string;
      verification_request_id: string;
      kyc_status: string;
    }>(
      `/admin/users/${id}/kyc-review`,
      { method: "POST", body: JSON.stringify({ outcome, reason }) },
      true,
    ),

  freeze: (id: string) =>
    request<{ success: boolean; asset_id: string; resulting_status: string }>(
      `/admin/assets/${id}/freeze`,
      { method: "POST" },
      true,
    ),

  close: (id: string) =>
    request<{ success: boolean; asset_id: string; resulting_status: string }>(
      `/admin/assets/${id}/close`,
      { method: "POST" },
      true,
    ),

  auditLogs: (
    params: { entity_type?: string; entity_id?: string; page?: number; limit?: number } = {},
  ) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ items: AuditLog[]; pagination: Pagination }>(
      `/admin/audit-logs${qs ? `?${qs}` : ""}`,
      {},
      true,
    );
  },

  users: (
    params: {
      role?: "investor" | "issuer" | "admin";
      status?: "active" | "blocked";
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ).toString();

    return request<{ items: AdminUserItem[]; pagination: Pagination }>(
      `/admin/users${qs ? `?${qs}` : ""}`,
      {},
      true,
    );
  },

  createUser: (data: {
    email: string;
    password: string;
    display_name: string;
    role: "investor" | "issuer" | "admin";
  }) =>
    request<{ success: boolean; user_id: string; role: string }>(
      "/admin/users",
      { method: "POST", body: JSON.stringify(data) },
      true,
    ),

  updateUserRole: (id: string, role: "investor" | "issuer" | "admin", reason: string) =>
    request<{ success: boolean; user_id: string; role: string }>(
      `/admin/users/${id}/role`,
      { method: "POST", body: JSON.stringify({ role, reason }) },
      true,
    ),

  deleteUser: (id: string) =>
    request<{ success: boolean; user_id: string }>(
      `/admin/users/${id}`,
      { method: "DELETE" },
      true,
    ),
};
