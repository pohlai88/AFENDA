/**
 * S3 service — presigned URL generation for MinIO / S3.
 *
 * Used by the evidence routes to let clients upload files directly
 * to object storage without proxying bytes through the API.
 */

import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      endpoint: process.env["S3_ENDPOINT"],
      region: process.env["S3_REGION"] ?? "auto",
      credentials: {
        accessKeyId: process.env["S3_ACCESS_KEY_ID"]!,
        secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"]!,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }
  return _client;
}

/**
 * Generate a presigned PUT URL for direct-to-S3 uploads.
 *
 * @returns Presigned URL string (valid for `expiresIn` seconds, default 300).
 */
export async function generatePresignedUploadUrl(params: {
  bucket: string;
  objectKey: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.objectKey,
    ContentType: params.contentType,
  });

  return getSignedUrl(client, command, {
    expiresIn: params.expiresIn ?? 300,
  });
}
