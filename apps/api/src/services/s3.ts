/**
 * S3 service — presigned URL generation for MinIO / S3.
 *
 * Used by the evidence routes to let clients upload files directly
 * to object storage without proxying bytes through the API.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function resolveStorageProvider(): "r2" | "s3" {
  const provider = (process.env["STORAGE_PROVIDER"] ?? "r2").toLowerCase();
  return provider === "s3" ? "s3" : "r2";
}

export function resolveStorageProviderName(): "r2" | "s3" {
  return resolveStorageProvider();
}

function resolveR2Endpoint(): string | undefined {
  const configured = process.env["R2_ENDPOINT"] ?? process.env["S3_ENDPOINT"];
  if (configured) return configured;

  const accountId = process.env["R2_ACCOUNT_ID"]?.trim();
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined;
}

function resolveStorageConfig() {
  const provider = resolveStorageProvider();

  const endpoint = provider === "r2" ? resolveR2Endpoint() : process.env["S3_ENDPOINT"];

  const region =
    provider === "r2"
      ? (process.env["R2_REGION"] ?? process.env["S3_REGION"] ?? "auto")
      : (process.env["S3_REGION"] ?? "auto");

  const accessKeyId =
    provider === "r2"
      ? (process.env["R2_ACCESS_KEY_ID"] ?? process.env["S3_ACCESS_KEY_ID"])
      : process.env["S3_ACCESS_KEY_ID"];

  const secretAccessKey =
    provider === "r2"
      ? (process.env["R2_SECRET_ACCESS_KEY"] ?? process.env["S3_SECRET_ACCESS_KEY"])
      : process.env["S3_SECRET_ACCESS_KEY"];

  const bucket =
    provider === "r2"
      ? (process.env["R2_BUCKET_NAME"] ?? process.env["S3_BUCKET"] ?? "axis-attachments")
      : (process.env["S3_BUCKET"] ?? "afenda-dev");

  const forcePathStyleEnv = process.env["S3_FORCE_PATH_STYLE"];
  const forcePathStyle =
    forcePathStyleEnv != null ? forcePathStyleEnv.toLowerCase() === "true" : provider === "s3";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing storage credentials for configured provider");
  }

  if (!endpoint) {
    throw new Error("Missing storage endpoint for configured provider");
  }

  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    bucket,
  };
}

function getS3Client(): S3Client {
  if (!_client) {
    const config = resolveStorageConfig();
    _client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
    });
  }
  return _client;
}

export function resolveStorageBucket(): string {
  return resolveStorageConfig().bucket;
}

/**
 * Generate a presigned PUT URL for direct-to-S3 uploads.
 *
 * @returns Presigned URL string (valid for `expiresIn` seconds, default 300).
 */
export async function generatePresignedUploadUrl(params: {
  bucket?: string;
  objectKey: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const client = getS3Client();
  const bucket = params.bucket ?? resolveStorageBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.objectKey,
    ContentType: params.contentType,
  });

  return getSignedUrl(client, command, {
    expiresIn: params.expiresIn ?? 300,
  });
}
