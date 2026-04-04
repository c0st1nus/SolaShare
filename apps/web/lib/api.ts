import type {
  AssetDetail,
  AssetDocumentsResponse,
  AssetListResponse,
  AssetRevenueResponse,
  AuthLoginRequest,
  AuthMeResponse,
  AuthRefreshRequest,
  AuthRegisterRequest,
  AuthSessionResponse,
  AuthTelegramRequest,
  ClaimsResponse,
  GoogleAuthRequest,
  GoogleAuthUrlResponse,
  IssuerAssetCreateRequest,
  IssuerAssetCreateResponse,
  IssuerDocumentRequest,
  IssuerDocumentResponse,
  IssuerSaleTermsRequest,
  IssuerSaleTermsResponse,
  IssuerSubmitResponse,
  PortfolioResponse,
  TelegramLoginRequest,
  TransactionConfirmRequest,
  TransactionConfirmResponse,
  WalletLinkRequest,
  WalletLinkResponse,
} from "@/lib/types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  token?: string;
  next?: {
    revalidate?: number;
  };
  cache?: RequestCache;
};

type ErrorPayload = {
  message?: string;
  error?: string;
  details?: unknown;
};

const serverApiBaseUrl =
  process.env.SOLASHARE_API_URL ?? process.env.NEXT_PUBLIC_SOLASHARE_API_URL ?? null;
const browserApiBaseUrl = process.env.NEXT_PUBLIC_SOLASHARE_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function getApiBaseUrl() {
  const baseUrl = typeof window === "undefined" ? serverApiBaseUrl : browserApiBaseUrl;

  if (typeof window === "undefined" && !baseUrl) {
    throw new Error("SolaShare API URL is not configured for the frontend.");
  }

  return (baseUrl ?? "").replace(/\/$/, "");
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    ...(typeof window === "undefined" ? { next: options.next, cache: options.cache } : {}),
  });

  if (!response.ok) {
    let payload: ErrorPayload | null = null;

    try {
      payload = (await response.json()) as ErrorPayload;
    } catch {
      payload = null;
    }

    const fallbackMessage = response.statusText || "Request failed";
    throw new ApiError(
      payload?.message ?? payload?.error ?? fallbackMessage,
      response.status,
      payload,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getGoogleRedirectUri() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/auth/oauth/google/callback`;
}

export function getAssetCatalog() {
  return requestJson<AssetListResponse>("/assets", {
    next: { revalidate: 60 },
  });
}

export function getAssetDetail(assetId: string) {
  return requestJson<AssetDetail>(`/assets/${assetId}`, {
    next: { revalidate: 60 },
  });
}

export function getAssetRevenue(assetId: string) {
  return requestJson<AssetRevenueResponse>(`/assets/${assetId}/revenue`, {
    next: { revalidate: 60 },
  });
}

export function getAssetDocuments(assetId: string) {
  return requestJson<AssetDocumentsResponse>(`/assets/${assetId}/documents`, {
    next: { revalidate: 60 },
  });
}

export function registerWithPassword(body: AuthRegisterRequest) {
  return requestJson<AuthSessionResponse>("/auth/register", {
    method: "POST",
    body,
  });
}

export function loginWithPassword(body: AuthLoginRequest) {
  return requestJson<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body,
  });
}

export function refreshSessionToken(body: AuthRefreshRequest) {
  return requestJson<AuthSessionResponse>("/auth/refresh", {
    method: "POST",
    body,
  });
}

export function logoutSession(body: AuthRefreshRequest) {
  return requestJson<{ success?: boolean }>("/auth/logout", {
    method: "POST",
    body,
  });
}

export function getAuthMe(token: string) {
  return requestJson<AuthMeResponse>("/auth/me", {
    token,
    cache: "no-store",
  });
}

export function getGoogleAuthorizationUrl(params?: { redirect_uri?: string; state?: string }) {
  const search = new URLSearchParams();

  if (params?.redirect_uri) {
    search.set("redirect_uri", params.redirect_uri);
  }

  if (params?.state) {
    search.set("state", params.state);
  }

  const suffix = search.size ? `?${search.toString()}` : "";
  return requestJson<GoogleAuthUrlResponse>(`/auth/google/url${suffix}`, {
    cache: "no-store",
  });
}

export function exchangeGoogleCode(body: GoogleAuthRequest) {
  return requestJson<AuthSessionResponse>("/auth/google", {
    method: "POST",
    body,
  });
}

export function authenticateTelegramMiniApp(body: AuthTelegramRequest) {
  return requestJson<AuthSessionResponse>("/auth/telegram", {
    method: "POST",
    body,
  });
}

export function authenticateTelegramLogin(body: TelegramLoginRequest) {
  return requestJson<AuthSessionResponse>("/auth/telegram/login", {
    method: "POST",
    body,
  });
}

export function getPortfolio(token: string) {
  return requestJson<PortfolioResponse>("/me/portfolio", {
    token,
    cache: "no-store",
  });
}

export function getClaims(token: string) {
  return requestJson<ClaimsResponse>("/me/claims", {
    token,
    cache: "no-store",
  });
}

export function linkWallet(token: string, body: WalletLinkRequest) {
  return requestJson<WalletLinkResponse>("/auth/wallet/link", {
    method: "POST",
    token,
    body,
  });
}

export function confirmTransaction(token: string, body: TransactionConfirmRequest) {
  return requestJson<TransactionConfirmResponse>("/transactions/confirm", {
    method: "POST",
    token,
    body,
  });
}

export function createIssuerAsset(token: string, body: IssuerAssetCreateRequest) {
  return requestJson<IssuerAssetCreateResponse>("/issuer/assets", {
    method: "POST",
    token,
    body,
  });
}

export function registerIssuerAssetDocument(
  token: string,
  assetId: string,
  body: IssuerDocumentRequest,
) {
  return requestJson<IssuerDocumentResponse>(`/issuer/assets/${assetId}/documents`, {
    method: "POST",
    token,
    body,
  });
}

export function saveIssuerSaleTerms(token: string, assetId: string, body: IssuerSaleTermsRequest) {
  return requestJson<IssuerSaleTermsResponse>(`/issuer/assets/${assetId}/sale-terms`, {
    method: "POST",
    token,
    body,
  });
}

export function submitIssuerAsset(token: string, assetId: string) {
  return requestJson<IssuerSubmitResponse>(`/issuer/assets/${assetId}/submit`, {
    method: "POST",
    token,
  });
}
