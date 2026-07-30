// Pipeline orchestration. Ties ingestion -> classification -> prospect upsert
// -> product match -> draft, enforcing suppression, cooldown, crisis gating,
// and disclosure at every step. Sending is a separate, explicitly-approved
// step (see the outreach send route) — this module only produces review-queue
// drafts.

import { db } from '@/db';
import {
  connectors,
  mentions,
  intentSignals,
  prospects,
  products,
  outreachMessages,
  suppressionList,
  termRules,
  auditLog,
} from '@/db/schema';
import { and, desc, eq, or } from 'drizzle-orm';
import type { Platform, RawMention } from './types';
import { getConnector, credsFromEnv } from './connectors';
import { matchesExpression } from './termMatch';
import { classifyIntent } from './classifier';
import { scoreLead, rollUpProspectScore, matchProducts } from './scoring';
import { draftOutreach } from './messageGenerator';
import { checkOutreachAllowed, PLATFORM_POLICIES } from './compliance';

const now = () => new Date().toISOString();

async function audit(action: string, entityType: string, entityId: number | null, detail: string) {
  await db.insert(auditLog).values({ action, entityType, entityId: entityId ?? undefined, detail, createdAt: now() });
}

/** Is this identity on the suppression list? */
export async function isSuppressed(platform: string, externalId?: string, handle?: string): Promise<boolean> {
  if (!externalId && !handle) return false;
  const conditions = [] as ReturnType<typeof eq>[];
  if (externalId) conditions.push(eq(suppressionList.authorExternalId, externalId));
  if (handle) conditions.push(eq(suppressionList.authorHandle, handle));
  const rows = await db
    .select({ id: suppressionList.id })
    .from(suppressionList)
    .where(and(eq(suppressionList.platform, platform), or(...conditions)))
    .limit(1);
  return rows.length > 0;
}

export interface IngestResult {
  platform: Platform;
  fetched: number;
  newMentions: number;
  errors: string[];
}

/**
 * Run every enabled term rule for a platform against that platform's connector,
 * store new (deduped) mentions. Does not classify — that's a separate step so
 * classification can be retried/rerun independently.
 */
export async function ingestPlatform(platform: Platform, limitPerRule = 25): Promise<IngestResult> {
  const result: IngestResult = { platform, fetched: 0, newMentions: 0, errors: [] };

  const connector = getConnector(platform);
  if (!connector) {
    result.errors.push(`No connector implemented for ${platform}`);
    return result;
  }
  const creds = credsFromEnv(platform);
  if (!connector.isConfigured(creds)) {
    result.errors.push(`Connector for ${platform} is not configured (missing credentials)`);
    return result;
  }

  const [conn] = await db.select().from(connectors).where(eq(connectors.platform, platform)).limit(1);

  const rules = await db
    .select()
    .from(termRules)
    .where(and(eq(termRules.enabled, true), or(eq(termRules.platform, platform), eq(termRules.platform, ''))));
  const activeRules = rules.length
    ? rules
    : await db.select().from(termRules).where(eq(termRules.enabled, true));

  for (const rule of activeRules) {
    if (rule.platform && rule.platform !== platform) continue;
    let fetched: RawMention[] = [];
    try {
      // Use the rule's expression as the platform query; the connector maps it
      // to native search. We re-verify matches locally too.
      fetched = await connector.search({ query: rule.expression, limit: limitPerRule }, creds);
    } catch (e) {
      result.errors.push(`${rule.name}: ${(e as Error).message}`);
      continue;
    }
    result.fetched += fetched.length;

    for (const m of fetched) {
      if (!matchesExpression(rule.expression, m.content)) continue;
      try {
        const inserted = await db
          .insert(mentions)
          .values({
            platform,
            connectorId: conn?.id,
            externalId: m.externalId,
            permalink: m.permalink,
            authorHandle: m.authorHandle,
            authorExternalId: m.authorExternalId,
            content: m.content,
            lang: m.lang,
            postedAt: m.postedAt,
            matchedRuleId: rule.id,
            status: 'new',
            capturedAt: now(),
          })
          .onConflictDoNothing()
          .returning({ id: mentions.id });
        if (inserted.length) result.newMentions += 1;
      } catch (e) {
        result.errors.push(`insert ${m.externalId}: ${(e as Error).message}`);
      }
    }
  }

  if (conn) {
    await db.update(connectors).set({ lastPolledAt: now(), updatedAt: now() }).where(eq(connectors.id, conn.id));
  }
  return result;
}

export interface ClassifyResult {
  processed: number;
  qualified: number;
  suppressed: number;
  crisisSkipped: number;
}

/**
 * Classify all `new` mentions, upsert prospects, and roll up scores. Crisis
 * mentions are recorded but never converted into prospects.
 */
export async function classifyNewMentions(batch = 50): Promise<ClassifyResult> {
  const res: ClassifyResult = { processed: 0, qualified: 0, suppressed: 0, crisisSkipped: 0 };

  const pending = await db
    .select()
    .from(mentions)
    .where(eq(mentions.status, 'new'))
    .limit(batch);

  for (const mention of pending) {
    const intent = await classifyIntent(mention.content);
    await db.insert(intentSignals).values({
      mentionId: mention.id,
      buyingIntent: intent.buyingIntent,
      urgency: intent.urgency,
      painPoint: intent.painPoint,
      sentiment: intent.sentiment,
      crisisFlag: intent.crisisFlag,
      budgetSignal: intent.budgetSignal,
      model: intent.model,
      rationale: intent.rationale,
      createdAt: now(),
    });

    res.processed += 1;

    if (intent.crisisFlag) {
      await db.update(mentions).set({ status: 'discarded' }).where(eq(mentions.id, mention.id));
      res.crisisSkipped += 1;
      continue;
    }

    const leadScore = scoreLead(intent);
    if (leadScore <= 0 || intent.buyingIntent < 0.3) {
      await db.update(mentions).set({ status: 'classified' }).where(eq(mentions.id, mention.id));
      continue;
    }

    // Suppression check before creating/updating a prospect.
    if (await isSuppressed(mention.platform, mention.authorExternalId ?? undefined, mention.authorHandle ?? undefined)) {
      await db.update(mentions).set({ status: 'classified' }).where(eq(mentions.id, mention.id));
      res.suppressed += 1;
      continue;
    }

    const externalId = mention.authorExternalId ?? mention.authorHandle;
    if (!externalId) {
      await db.update(mentions).set({ status: 'classified' }).where(eq(mentions.id, mention.id));
      continue;
    }

    // Upsert prospect and recompute rolled-up score from all their qualified signals.
    const [existing] = await db
      .select()
      .from(prospects)
      .where(and(eq(prospects.platform, mention.platform), eq(prospects.authorExternalId, externalId)))
      .limit(1);

    if (existing) {
      const rolled = rollUpProspectScore([existing.score, leadScore]);
      await db
        .update(prospects)
        .set({
          score: rolled,
          topPainPoint: intent.painPoint ?? existing.topPainPoint,
          updatedAt: now(),
        })
        .where(eq(prospects.id, existing.id));
    } else {
      await db.insert(prospects).values({
        platform: mention.platform,
        authorHandle: mention.authorHandle,
        authorExternalId: externalId,
        score: leadScore,
        topPainPoint: intent.painPoint,
        status: 'queued',
        createdAt: now(),
        updatedAt: now(),
      });
    }

    await db.update(mentions).set({ status: 'classified' }).where(eq(mentions.id, mention.id));
    res.qualified += 1;
  }

  return res;
}

export interface DraftResult {
  drafted: number;
  skipped: string[];
}

/**
 * For queued prospects above a score threshold, match a product and generate a
 * review-queue draft. Enforces platform outreach policy and per-prospect
 * cooldown. Never sends.
 */
export async function draftForQueuedProspects(minScore = 50, max = 25): Promise<DraftResult> {
  const out: DraftResult = { drafted: 0, skipped: [] };

  const activeProducts = await db.select().from(products).where(eq(products.active, true));
  if (activeProducts.length === 0) {
    out.skipped.push('No active products to match.');
    return out;
  }

  const queued = await db
    .select()
    .from(prospects)
    .where(eq(prospects.status, 'queued'))
    .orderBy(desc(prospects.score))
    .limit(max);

  for (const prospect of queued) {
    if (prospect.score < minScore) continue;

    const platform = prospect.platform as Platform;
    const gate = checkOutreachAllowed(platform, 'public_reply');
    if (!gate.allowed) {
      out.skipped.push(`prospect ${prospect.id}: ${gate.reason}`);
      continue;
    }

    // Cooldown check.
    if (prospect.cooldownUntil && prospect.cooldownUntil > now()) {
      out.skipped.push(`prospect ${prospect.id}: in cooldown`);
      continue;
    }

    // Re-check suppression at draft time.
    if (await isSuppressed(prospect.platform, prospect.authorExternalId, prospect.authorHandle ?? undefined)) {
      await db.update(prospects).set({ status: 'suppressed', updatedAt: now() }).where(eq(prospects.id, prospect.id));
      out.skipped.push(`prospect ${prospect.id}: suppressed`);
      continue;
    }

    // Find the originating mention for reply targeting.
    const [srcMention] = await db
      .select()
      .from(mentions)
      .where(
        and(
          eq(mentions.platform, prospect.platform),
          or(
            eq(mentions.authorExternalId, prospect.authorExternalId),
            eq(mentions.authorHandle, prospect.authorHandle ?? ''),
          ),
        ),
      )
      .orderBy(desc(mentions.capturedAt))
      .limit(1);

    const painPoint = prospect.topPainPoint ?? srcMention?.content ?? '';
    const matches = matchProducts({ painPoint, products: activeProducts, limit: 1 });
    if (matches.length === 0) {
      out.skipped.push(`prospect ${prospect.id}: no product match`);
      continue;
    }

    const best = matches[0].product;
    const isAffiliate = Boolean(
      activeProducts.find((p) => p.id === best.id)?.affiliateUrl ||
      activeProducts.find((p) => p.id === best.id)?.affiliateNetwork,
    );
    const full = activeProducts.find((p) => p.id === best.id)!;
    const productUrl = full.affiliateUrl || full.landingUrl || full.affiliateUrl || '';

    const draft = draftOutreach({
      platform,
      channel: 'public_reply',
      painPoint,
      product: best,
      isAffiliate,
      productUrl: productUrl || 'https://example.com/product',
    });

    const [conn] = await db.select().from(connectors).where(eq(connectors.platform, platform)).limit(1);

    await db.insert(outreachMessages).values({
      prospectId: prospect.id,
      productId: best.id,
      connectorId: conn?.id,
      mentionId: srcMention?.id,
      channel: 'public_reply',
      draftBody: draft.body,
      disclosureText: draft.disclosureText,
      templateVariant: draft.templateVariant,
      attributionTag: draft.attributionTag,
      status: 'pending_review',
      createdAt: now(),
      updatedAt: now(),
    });

    // Move prospect out of the queue into contacted-pending so we don't
    // re-draft; the review/send step drives it forward.
    const cooldownHours = PLATFORM_POLICIES[platform].perProspectCooldownHours;
    await db
      .update(prospects)
      .set({
        status: 'cooldown',
        cooldownUntil: new Date(Date.now() + cooldownHours * 3600 * 1000).toISOString(),
        updatedAt: now(),
      })
      .where(eq(prospects.id, prospect.id));

    await audit('draft_created', 'prospect', prospect.id, `product ${best.id}, variant ${draft.templateVariant}`);
    out.drafted += 1;
  }

  return out;
}

/** Convenience: run the whole read/classify/draft cycle for a platform. */
export async function runCycle(platform: Platform) {
  const ingest = await ingestPlatform(platform);
  const classify = await classifyNewMentions();
  const draft = await draftForQueuedProspects();
  return { ingest, classify, draft };
}
