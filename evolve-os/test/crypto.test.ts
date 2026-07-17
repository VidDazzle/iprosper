import { test } from "node:test";
import assert from "node:assert/strict";
import { seal, open, openString } from "../src/crypto/aead.js";
import { secureRandom } from "../src/crypto/random.js";
import { hashSecret, verifySecret, constantTimeEqual } from "../src/crypto/hashing.js";
import { LocalKeyring } from "../src/crypto/kms.js";
import { encryptJson, decryptJson } from "../src/crypto/envelope.js";
import { generateSigningKeyPair, signMessage, verifyMessage } from "../src/crypto/signing.js";

test("AES-256-GCM seal/open round-trips", () => {
  const key = secureRandom(32);
  const box = seal(key, "top secret", "tenant-a");
  assert.equal(openString(key, box, "tenant-a"), "top secret");
});

test("AEAD rejects wrong AAD (context binding)", () => {
  const key = secureRandom(32);
  const box = seal(key, "data", "tenant-a");
  assert.throws(() => open(key, box, "tenant-b"));
});

test("AEAD rejects tampered ciphertext", () => {
  const key = secureRandom(32);
  const box = seal(key, "data");
  const raw = Buffer.from(box.ciphertext, "base64");
  const last = raw.length - 1;
  raw[last] = (raw[last] ?? 0) ^ 0xff;
  assert.throws(() => open(key, { ...box, ciphertext: raw.toString("base64") }));
});

test("scrypt password hashing verifies correctly", () => {
  const h = hashSecret("correct horse battery staple");
  assert.ok(verifySecret("correct horse battery staple", h));
  assert.equal(verifySecret("wrong password", h), false);
});

test("constantTimeEqual behaves like equality", () => {
  assert.ok(constantTimeEqual("abc", "abc"));
  assert.equal(constantTimeEqual("abc", "abd"), false);
  assert.equal(constantTimeEqual("abc", "abcd"), false);
});

test("KMS envelope encryption round-trips JSON", async () => {
  const kms = LocalKeyring.ephemeral();
  const env = await encryptJson(kms, { pan: "4111111111111111" }, "evolve");
  const back = await decryptJson<{ pan: string }>(kms, env);
  assert.equal(back.pan, "4111111111111111");
});

test("KMS rotation keeps old wrapped keys unwrappable", async () => {
  const kms = LocalKeyring.fromRootKey(secureRandom(32).toString("base64"), 1);
  const { wrapped } = await kms.generateDataKey("ctx");
  const before = await kms.unwrapKey(wrapped, "ctx");
  kms.rotate();
  const after = await kms.unwrapKey(wrapped, "ctx");
  assert.deepEqual(before, after);
});

test("Ed25519 sign/verify", () => {
  const { publicKeyPem, privateKeyPem } = generateSigningKeyPair();
  const sig = signMessage(privateKeyPem, "hello");
  assert.ok(verifyMessage(publicKeyPem, "hello", sig));
  assert.equal(verifyMessage(publicKeyPem, "hell0", sig), false);
});
