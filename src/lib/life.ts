/**
 * Shared helpers for Evolve Life routes. The suite is single-owner today (like
 * the mailbox), so profiles resolve to the owner email by default; passing
 * ?email= (or a body email) supports multiple people when Codex opens it up.
 */

import { db } from '@/db';
import { lifeProfiles, lifePreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { mailboxAddress } from '@/lib/mailbox';

export function ownerEmail(email?: string | null): string {
  return (email && email.trim()) || process.env.LIFE_OWNER_EMAIL || mailboxAddress();
}

export async function getOrCreateProfile(email?: string | null) {
  const e = ownerEmail(email);
  const existing = await db.select().from(lifeProfiles).where(eq(lifeProfiles.email, e)).limit(1);
  if (existing[0]) return existing[0];
  const now = new Date().toISOString();
  const inserted = await db
    .insert(lifeProfiles)
    .values({
      email: e,
      timezone: process.env.BIRTHDAY_TZ || 'America/New_York',
      reminderChannel: 'email',
      onboarded: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return inserted[0];
}

export async function preferencesGrouped(profileId: number): Promise<Record<string, string[]>> {
  const rows = await db.select().from(lifePreferences).where(eq(lifePreferences.profileId, profileId));
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.category] ||= []).push(r.value);
  return out;
}
