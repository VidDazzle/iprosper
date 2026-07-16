import crypto from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  UploadPartCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Object storage for large email attachments (documents, full-length video).
 *
 * The bytes never pass through the app server. Instead the client uploads
 * directly to S3-compatible storage via presigned URLs — a single PUT for
 * small files, or a presigned multipart upload for large ones (each ~100 MB
 * part uploaded in parallel, resumable). This is what lets attachments be
 * arbitrarily large: the ceiling is the storage provider's (5 TB per object on
 * S3), not the serverless request-body limit.
 *
 * Works with AWS S3, Cloudflare R2, Backblaze B2, MinIO — anything S3-API
 * compatible. Encryption at rest is provided by the bucket's default
 * encryption; per-file envelope keys (see crypto.ts) support optional
 * client-side E2E encryption on top.
 *
 * Configure via env: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 * S3_REGION (default us-east-1), S3_ENDPOINT (for R2/B2/MinIO),
 * S3_FORCE_PATH_STYLE (true for MinIO/some R2 setups).
 */

// Files at or below this size use a single presigned PUT; above it, multipart.
export const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB
export const PART_SIZE = 100 * 1024 * 1024; // 100 MB per part
export const MAX_OBJECT_SIZE = 5 * 1024 * 1024 * 1024 * 1024; // 5 TB (S3 hard limit)
const URL_TTL = 3600; // presigned URL lifetime (seconds)

export function storageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
  );
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

function bucket(): string {
  return process.env.S3_BUCKET!;
}

/** Build a collision-proof, path-safe storage key for a file. */
export function makeStorageKey(filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';
  return `attachments/${crypto.randomUUID()}/${safe}`;
}

export interface SinglePartTicket {
  mode: 'single';
  key: string;
  url: string;
  expiresIn: number;
}

export interface MultipartTicket {
  mode: 'multipart';
  key: string;
  uploadId: string;
  partSize: number;
  parts: { partNumber: number; url: string }[];
  expiresIn: number;
}

export type UploadTicket = SinglePartTicket | MultipartTicket;

/** Create an upload ticket sized to the file: single PUT or multipart. */
export async function createUpload(
  key: string,
  sizeBytes: number,
  mimeType: string,
): Promise<UploadTicket> {
  const s3 = getClient();

  if (sizeBytes <= MULTIPART_THRESHOLD) {
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: mimeType }),
      { expiresIn: URL_TTL },
    );
    return { mode: 'single', key, url, expiresIn: URL_TTL };
  }

  const created = await s3.send(
    new CreateMultipartUploadCommand({ Bucket: bucket(), Key: key, ContentType: mimeType }),
  );
  const uploadId = created.UploadId!;
  const partCount = Math.ceil(sizeBytes / PART_SIZE);
  const parts: { partNumber: number; url: string }[] = [];
  for (let partNumber = 1; partNumber <= partCount; partNumber++) {
    const url = await getSignedUrl(
      s3,
      new UploadPartCommand({ Bucket: bucket(), Key: key, UploadId: uploadId, PartNumber: partNumber }),
      { expiresIn: URL_TTL },
    );
    parts.push({ partNumber, url });
  }
  return { mode: 'multipart', key, uploadId, partSize: PART_SIZE, parts, expiresIn: URL_TTL };
}

/** Finalize a multipart upload with the ETags returned from each part PUT. */
export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
): Promise<void> {
  await getClient().send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    }),
  );
}

/** Cancel an in-flight multipart upload so incomplete parts aren't billed. */
export async function abortMultipart(key: string, uploadId: string): Promise<void> {
  await getClient().send(
    new AbortMultipartUploadCommand({ Bucket: bucket(), Key: key, UploadId: uploadId }),
  );
}

/** Time-limited download URL; forces a browser download with the real name. */
export async function getDownloadUrl(key: string, filename: string): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, '')}"`,
    }),
    { expiresIn: URL_TTL },
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export function humanSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
