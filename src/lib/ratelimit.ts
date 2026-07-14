/**
 * Lightweight in-memory rate limiter + bot honeypot helpers.
 *
 * A fixed-window counter keyed by client IP. This is a per-instance limiter
 * (each Node process / Worker isolate has its own map) — a solid first layer
 * that stops a single client from hammering the public, now-LLM-backed
 * endpoints. For strict global limits across many Workers, back this with
 * Cloudflare KV or a Durable Object (same call sites, swap the store).
 */

import { NextResponse, type NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  // Opportunistically drop expired buckets so the map doesn't grow unbounded.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
}

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export interface RateResult {
  allowed: boolean;
  retryAfter: number; // seconds until the window resets
  remaining: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  let b = store.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    store.set(key, b);
  }
  b.count += 1;
  const allowed = b.count <= limit;
  return { allowed, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)), remaining: Math.max(0, limit - b.count) };
}

/**
 * Convenience guard for API routes. Returns a 429 NextResponse when the caller
 * has exceeded `limit` requests per `windowMs`, or null to proceed. `name`
 * namespaces the bucket so different endpoints don't share a counter.
 */
export function rateLimited(
  request: NextRequest,
  name: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const { allowed, retryAfter } = rateLimit(`${name}:${clientIp(request)}`, limit, windowMs);
  if (allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly.", code: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * Bot honeypot: a form field that should always be empty for real users (it's
 * hidden in the UI). If a bot fills it, treat the submission as spam. Returns
 * true when the honeypot was tripped.
 */
export function honeypotTripped(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
