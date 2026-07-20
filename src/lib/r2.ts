import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const endpoint =
  process.env.R2_ENDPOINT ??
  (accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : undefined);

if (!accountId) {
  throw new Error("Missing R2_ACCOUNT_ID environment variable.");
}

if (!accessKeyId) {
  throw new Error("Missing R2_ACCESS_KEY_ID environment variable.");
}

if (!secretAccessKey) {
  throw new Error("Missing R2_SECRET_ACCESS_KEY environment variable.");
}

if (!bucketName) {
  throw new Error("Missing R2_BUCKET_NAME environment variable.");
}

if (!endpoint) {
  throw new Error("Missing R2_ENDPOINT environment variable.");
}

export const r2BucketName = bucketName;

export const r2Client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});