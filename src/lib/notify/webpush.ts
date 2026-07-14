/**
 * Web Push sender — RFC 8291 (aes128gcm payload encryption) + RFC 8292 (VAPID),
 * implemented on the Web Crypto API so it runs on both Node 20+ and Cloudflare
 * Workers with no dependency. No-ops (logs) when VAPID keys aren't configured.
 *
 * Configure:
 *   VAPID_PUBLIC_KEY   (base64url, 65-byte uncompressed P-256 point)
 *   VAPID_PRIVATE_KEY  (base64url, 32-byte raw scalar)
 *   VAPID_SUBJECT      (mailto:you@xdebt.ai or your https site)
 * Generate a pair with:  npx web-push generate-vapid-keys
 */

export interface PushSubscription {
  endpoint: string;
  p256dh: string; // base64url
  auth: string; // base64url
}

const enc = new TextEncoder();
// Typed loosely: Web Crypto's TS lib now demands Uint8Array<ArrayBuffer> for
// byte args, which fights our helper-returned views. Usage below is standard.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const subtle: any = globalThis.crypto?.subtle;

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(b: Uint8Array): string {
  let bin = "";
  for (const byte of b) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT && subtle);
}

/* -------------------------------- VAPID JWT ------------------------------- */

async function importVapidSigningKey(): Promise<CryptoKey> {
  const pub = b64urlToBytes(process.env.VAPID_PUBLIC_KEY!);
  const d = process.env.VAPID_PRIVATE_KEY!;
  const jwk: JsonWebKey = {
    kty: "EC", crv: "P-256",
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    d, ext: true, key_ops: ["sign"],
  };
  return subtle!.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function vapidAuthHeader(endpoint: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(enc.encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: process.env.VAPID_SUBJECT,
  })));
  const signingInput = `${header}.${payload}`;
  const key = await importVapidSigningKey();
  const sig = new Uint8Array(await subtle!.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput)));
  const jwt = `${signingInput}.${bytesToB64url(sig)}`;
  return `vapid t=${jwt}, k=${process.env.VAPID_PUBLIC_KEY}`;
}

/* ------------------------- aes128gcm payload (RFC 8291) ------------------- */

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await subtle!.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await subtle!.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

async function encryptPayload(sub: PushSubscription, payload: string): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(sub.p256dh);
  const authSecret = b64urlToBytes(sub.auth);

  // Ephemeral (application server) ECDH key pair.
  const asKeys = await subtle!.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await subtle!.exportKey("raw", asKeys.publicKey));

  const uaKey = await subtle!.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await subtle!.deriveBits({ name: "ECDH", public: uaKey }, asKeys.privateKey, 256));

  // ikm = HKDF(auth, ecdh, "WebPush: info\0" || ua_public || as_public, 32)
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdh, keyInfo, 32);

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // Plaintext + padding delimiter (0x02 = last record).
  const plaintext = concat(enc.encode(payload), new Uint8Array([0x02]));
  const aesKey = await subtle!.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await subtle!.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext));

  // Header: salt(16) | rs(uint32=4096) | idlen(1)=65 | as_public(65)
  const rs = new Uint8Array([0, 0, 0x10, 0x00]);
  const idlen = new Uint8Array([asPublic.length]);
  return concat(salt, rs, idlen, asPublic, ciphertext);
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/** Send one push. Returns { ok, status, gone } — `gone` means the subscription
 *  is expired (404/410) and should be deleted. */
export async function sendWebPush(sub: PushSubscription, msg: PushMessage): Promise<{ ok: boolean; status?: number; gone?: boolean; reason?: string }> {
  if (!isPushConfigured()) {
    console.log(`[push → ${sub.endpoint.slice(0, 40)}…] ${msg.title}: ${msg.body}`);
    return { ok: false, reason: "not_configured" };
  }
  try {
    const body = await encryptPayload(sub, JSON.stringify(msg));
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: await vapidAuthHeader(sub.endpoint),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
      },
      body: body as unknown as BodyInit,
    });
    return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "send_error" };
  }
}
