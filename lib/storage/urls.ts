import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET, ENDPOINT } from "./client";

/**
 * Generate a presigned URL for direct upload (client → Spaces)
 */
export async function getUploadUrl(key: string, expiresIn = 7200) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ACL: "public-read",
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for secure download
 */
export async function getDownloadUrl(key: string, expiresIn = 36000) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `inline; filename="${key.split('/').pop()}"`,
    ResponseContentType: "application/pdf",
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get a public URL (works only if ACL is public-read)
 */
export function getPublicUrl(key: string) {
  return `${ENDPOINT}/${key}`;
}
