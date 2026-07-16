import crypto from 'node:crypto';
import { encrypt, tryDecrypt, makePreview } from '@/lib/crypto';

/** The address this mailbox owns. Configure via MAILBOX_ADDRESS. */
export function mailboxAddress(): string {
  return process.env.MAILBOX_ADDRESS || 'owner@iprosper.ai';
}

export interface StoredMessageRow {
  id: number;
  threadId: string;
  direction: string;
  fromEmail: string;
  toEmails: string;
  ccEmails: string | null;
  subjectEncrypted: string;
  bodyEncrypted: string;
  preview: string | null;
  status: string;
  starred: boolean;
  priority: string;
  category: string | null;
  source: string;
  createdAt: string;
}

/** Row shape returned to clients: decrypted, with recipients split to arrays. */
export function toClientMessage(row: StoredMessageRow, includeBody = true) {
  return {
    id: row.id,
    threadId: row.threadId,
    direction: row.direction,
    from: row.fromEmail,
    to: row.toEmails ? row.toEmails.split(',').filter(Boolean) : [],
    cc: row.ccEmails ? row.ccEmails.split(',').filter(Boolean) : [],
    subject: tryDecrypt(row.subjectEncrypted, '[encrypted]'),
    body: includeBody ? tryDecrypt(row.bodyEncrypted, '[encrypted]') : undefined,
    preview: row.preview,
    status: row.status,
    starred: row.starred,
    priority: row.priority,
    category: row.category,
    source: row.source,
    createdAt: row.createdAt,
  };
}

/** Build the encrypted column values for a new message. */
export function buildEncryptedFields(subject: string, body: string) {
  return {
    subjectEncrypted: encrypt(subject || '(no subject)'),
    bodyEncrypted: encrypt(body || ''),
    preview: makePreview(body || subject || ''),
  };
}

export function newThreadId(): string {
  return crypto.randomUUID();
}
