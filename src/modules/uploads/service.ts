import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import path from "node:path";
import type { z } from "zod";
import { env } from "../../config/env";
import { ApiError } from "../../lib/api-error";
import type {
  directUploadResponseSchema,
  presignUploadBodySchema,
  presignUploadResponseSchema,
} from "./contracts";

type PresignUploadBody = z.infer<typeof presignUploadBodySchema>;
type PresignUploadResponse = z.infer<typeof presignUploadResponseSchema>;
type DirectUploadResponse = z.infer<typeof directUploadResponseSchema>;

type UploadTokenPayload = {
  purpose: "kyc_document" | "avatar_image";
  userId: string;
  storedName: string;
  contentType: string;
  sizeBytes: number;
  exp: number;
};

const emptyPayloadHash = createHash("sha256").update("").digest("hex");

const toBase64Url = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");
const fromBase64Url = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const signUploadToken = (payload: string) =>
  createHmac("sha256", env.JWT_SECRET).update(payload).digest("base64url");

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "document";

const buildAbsoluteUrl = (origin: string, pathname: string) =>
  new URL(pathname, origin).toString();

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const parseUploadToken = (token: string): UploadTokenPayload => {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw new ApiError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid");
  }

  const expectedSignature = signUploadToken(encodedPayload);

  if (!safeCompare(signature, expectedSignature)) {
    throw new ApiError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid");
  }

  const parsedPayload = JSON.parse(
    fromBase64Url(encodedPayload),
  ) as UploadTokenPayload;

  if (parsedPayload.exp < Date.now()) {
    throw new ApiError(410, "UPLOAD_TOKEN_EXPIRED", "Upload token has expired");
  }

  return parsedPayload;
};

const sha256Hex = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

const hmac = (key: string | Uint8Array, value: string) =>
  createHmac("sha256", key).update(value).digest();

const getSigningKey = (dateStamp: string) => {
  const kDate = hmac(`AWS4${env.S3_SECRET_KEY}`, dateStamp);
  const kRegion = hmac(kDate, env.S3_REGION);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
};

const encodeUriPath = (input: string) =>
  input
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const buildS3ObjectKey = (
  purpose: UploadTokenPayload["purpose"],
  storedName: string,
) => `${purpose}/${storedName}`;

const buildS3Url = (objectKey: string) => {
  const baseUrl = new URL(env.S3_ENDPOINT);
  baseUrl.pathname = `/${env.S3_BUCKET}/${encodeUriPath(objectKey)}`;
  return baseUrl;
};

const buildAuthorizationHeaders = ({
  method,
  url,
  payloadHash,
  contentType,
}: {
  method: "GET" | "PUT";
  url: URL;
  payloadHash: string;
  contentType?: string;
}) => {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const host = url.host;

  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ];
  const signedHeaderNames = ["host", "x-amz-content-sha256", "x-amz-date"];

  if (contentType) {
    canonicalHeaders.push(`content-type:${contentType}`);
    signedHeaderNames.push("content-type");
  }

  const canonicalRequest = [
    method,
    url.pathname,
    "",
    `${canonicalHeaders.sort().join("\n")}\n`,
    signedHeaderNames.sort().join(";"),
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${env.S3_REGION}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = createHmac("sha256", getSigningKey(dateStamp))
    .update(stringToSign)
    .digest("hex");

  const headers: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: [
      "AWS4-HMAC-SHA256 Credential=",
      `${env.S3_ACCESS_KEY}/${credentialScope}, `,
      `SignedHeaders=${signedHeaderNames.sort().join(";")}, `,
      `Signature=${signature}`,
    ].join(""),
  };

  if (contentType) {
    headers["content-type"] = contentType;
  }

  return headers;
};

async function putObjectToS3(
  objectKey: string,
  body: Uint8Array,
  contentType: string,
) {
  const url = buildS3Url(objectKey);
  const payloadHash = sha256Hex(body);
  const headers = buildAuthorizationHeaders({
    method: "PUT",
    url,
    payloadHash,
    contentType,
  });

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: Buffer.from(body),
  });

  if (!response.ok) {
    throw new ApiError(
      502,
      "STORAGE_UPLOAD_FAILED",
      "Failed to upload file to S3 storage",
    );
  }
}

async function getObjectFromS3(objectKey: string) {
  const url = buildS3Url(objectKey);
  const headers = buildAuthorizationHeaders({
    method: "GET",
    url,
    payloadHash: emptyPayloadHash,
  });

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (response.status === 404) {
    throw new ApiError(404, "FILE_NOT_FOUND", "Uploaded file not found");
  }

  if (!response.ok) {
    throw new ApiError(
      502,
      "STORAGE_FETCH_FAILED",
      "Failed to fetch file from S3 storage",
    );
  }

  return response;
}

export class UploadsService {
  async presign(
    origin: string,
    userId: string,
    input: PresignUploadBody,
  ): Promise<PresignUploadResponse> {
    const storedName = `${randomBytes(8).toString("hex")}-${sanitizeFileName(
      input.file_name,
    )}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const payload: UploadTokenPayload = {
      purpose: input.purpose,
      userId,
      storedName,
      contentType: input.content_type,
      sizeBytes: input.size_bytes,
      exp: expiresAt.getTime(),
    };

    const encodedPayload = toBase64Url(JSON.stringify(payload));
    const token = `${encodedPayload}.${signUploadToken(encodedPayload)}`;

    return {
      upload_url: buildAbsoluteUrl(
        origin,
        `/api/v1/uploads/direct?token=${token}`,
      ),
      file_url: buildAbsoluteUrl(
        origin,
        `/api/v1/uploads/files/${input.purpose}/${storedName}`,
      ),
      upload_method: "PUT",
      expires_at: expiresAt.toISOString(),
    };
  }

  async upload(
    token: string,
    origin: string,
    request: Request,
  ): Promise<DirectUploadResponse> {
    const payload = parseUploadToken(token);
    const contentType = request.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim();

    if (contentType && contentType !== payload.contentType) {
      throw new ApiError(
        400,
        "UPLOAD_CONTENT_TYPE_MISMATCH",
        "Upload content type does not match the presigned request",
      );
    }

    const body = new Uint8Array(await request.arrayBuffer());

    if (body.byteLength === 0) {
      throw new ApiError(400, "EMPTY_UPLOAD", "Uploaded file is empty");
    }

    if (body.byteLength > payload.sizeBytes) {
      throw new ApiError(
        413,
        "UPLOAD_TOO_LARGE",
        "Uploaded file exceeds the declared size",
      );
    }

    const objectKey = buildS3ObjectKey(payload.purpose, payload.storedName);
    await putObjectToS3(objectKey, body, payload.contentType);

    const contentHash = `sha256:${sha256Hex(body)}`;

    return {
      success: true,
      file_url: buildAbsoluteUrl(
        origin,
        `/api/v1/uploads/files/${payload.purpose}/${payload.storedName}`,
      ),
      content_hash: contentHash,
    };
  }

  async resolveFile(purpose: UploadTokenPayload["purpose"], name: string) {
    const normalizedName = path.basename(name);
    const objectKey = buildS3ObjectKey(purpose, normalizedName);
    const response = await getObjectFromS3(objectKey);
    const body = new Uint8Array(await response.arrayBuffer());

    return new Response(body, {
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/octet-stream",
        "cache-control": "private, max-age=300",
      },
    });
  }
}

export const uploadsService = new UploadsService();
