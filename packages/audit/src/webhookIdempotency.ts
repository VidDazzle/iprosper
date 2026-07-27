import { prisma } from "@apex/db";

/**
 * Idempotency guard for revenue-confirmation webhooks (Stripe
 * settlement, invoice-paid, affiliate commission-confirmed). Returns
 * true the first time a given (provider, externalId) pair is seen —
 * false on every retry, so the caller can skip re-processing. Without
 * this, a retried webhook delivery could double-count revenue.
 */
export async function recordWebhookEvent(
  provider: string,
  externalId: string,
  eventType: string,
  payload: unknown,
): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({
      data: { provider, externalId, eventType, payload: payload as never },
    });
    return true;
  } catch (err) {
    // Unique constraint violation on (provider, externalId) == already processed.
    if (isUniqueConstraintError(err)) {
      return false;
    }
    throw err;
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}
