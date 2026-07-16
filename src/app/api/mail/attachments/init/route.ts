import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mailAttachments } from '@/db/schema';
import { generateDataKey, encryptionConfigured } from '@/lib/crypto';
import {
  storageConfigured,
  createUpload,
  makeStorageKey,
  MAX_OBJECT_SIZE,
} from '@/lib/storage';

/**
 * POST /api/mail/attachments/init
 * Body: { filename, mimeType, sizeBytes, threadId? }
 *
 * Registers an attachment and returns a presigned upload ticket (single PUT or
 * multipart). The client uploads the bytes DIRECTLY to storage using the
 * ticket — they never touch this server, which is why arbitrarily large files
 * (full-length video) work. On completion the client calls
 * /api/mail/attachments/[id]/complete.
 */
export async function POST(request: NextRequest) {
  try {
    if (!storageConfigured()) {
      return NextResponse.json(
        {
          error: 'Object storage not configured',
          code: 'NO_STORAGE',
          hint: 'Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (+ S3_ENDPOINT for R2/B2/MinIO).',
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
    const mimeType = typeof body.mimeType === 'string' && body.mimeType ? body.mimeType : 'application/octet-stream';
    const sizeBytes = Number(body.sizeBytes);

    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json({ error: 'sizeBytes must be a positive number' }, { status: 400 });
    }
    if (sizeBytes > MAX_OBJECT_SIZE) {
      return NextResponse.json(
        { error: `File exceeds the ${MAX_OBJECT_SIZE} byte per-object limit` },
        { status: 413 },
      );
    }

    const key = makeStorageKey(filename);
    const ticket = await createUpload(key, sizeBytes, mimeType);

    // Per-file envelope key (optional client-side E2E). Only the wrapped form is stored.
    const dataKey = encryptionConfigured() ? generateDataKey() : null;

    const inserted = await db
      .insert(mailAttachments)
      .values({
        threadId: body.threadId || null,
        filename,
        mimeType,
        sizeBytes,
        storageProvider: 's3',
        storageKey: key,
        uploadId: ticket.mode === 'multipart' ? ticket.uploadId : null,
        status: 'pending',
        wrappedKey: dataKey?.wrappedKey || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(
      {
        attachmentId: inserted[0].id,
        ...ticket,
        // Returned once, never stored in plaintext — for optional client-side encryption.
        dataKey: dataKey?.plaintextKey,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /mail/attachments/init error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}
