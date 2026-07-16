import crypto from 'node:crypto';
import { db } from '@/db';
import { deliverables } from '@/db/schema';
import { eq } from 'drizzle-orm';

/** Unguessable public id used in the client-facing review link. */
export function makeDeliverablePublicId(): string {
  return `dlv_${crypto.randomBytes(9).toString('base64url')}`;
}

/** Resolve a deliverable by numeric id or public id. */
export async function findDeliverable(idOrPublic: string) {
  const asId = parseInt(idOrPublic, 10);
  if (!isNaN(asId) && String(asId) === idOrPublic) {
    const byId = await db.select().from(deliverables).where(eq(deliverables.id, asId)).limit(1);
    if (byId[0]) return byId[0];
  }
  const byPublic = await db.select().from(deliverables).where(eq(deliverables.publicId, idOrPublic)).limit(1);
  return byPublic[0] || null;
}

export const PROJECT_TYPES = ['voice_ai_agent', 'website', 'document', 'video', 'design', 'other'];
export const ITEM_KINDS = ['file', 'link', 'voice_agent', 'video', 'image', 'document'];

/** Body for the client delivery email. */
export function renderDeliveryEmail(
  title: string,
  clientName: string | null,
  message: string | null,
  items: { title: string; kind: string }[],
  reviewUrl: string,
): string {
  const hi = clientName ? `Hi ${clientName.split(' ')[0]},` : 'Hi,';
  const list = items.map((i) => `• ${i.title} (${i.kind.replace(/_/g, ' ')})`).join('\n');
  return (
    `${hi}\n\n` +
    `Your project "${title}" is ready to review.\n\n` +
    (message ? `${message}\n\n` : '') +
    `What's included:\n${list}\n\n` +
    `Review everything and approve — or request a revision with your specific notes — here:\n${reviewUrl}\n\n` +
    `— The Evolve crew`
  );
}
