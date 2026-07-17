import { test } from "node:test";
import assert from "node:assert/strict";
import { AuditLog, MemoryAuditSink } from "../src/audit/audit-log.js";
import { generateSigningKeyPair } from "../src/crypto/signing.js";

test("audit chain is intact after appends and detects tampering", async () => {
  const { publicKeyPem, privateKeyPem } = generateSigningKeyPair();
  const sink = new MemoryAuditSink();
  const log = new AuditLog(sink, { keyId: "k1", privateKeyPem });

  await log.record({ actor: "u1", tenantId: "t1", action: "auth.login", outcome: "allow" });
  await log.record({ actor: "u1", tenantId: "t1", action: "agent.deploy", target: "agt_1", outcome: "allow" });
  await log.record({ actor: "u1", tenantId: "t1", action: "secret.read", outcome: "deny" });

  assert.ok(log.verify(publicKeyPem).ok);

  // Tamper with a past entry's action.
  (sink.entries[1] as { action: string }).action = "agent.delete";
  const res = log.verify(publicKeyPem);
  assert.equal(res.ok, false);
  assert.equal(res.brokenAt, 1);
});

test("audit chain detects deletion of an entry", async () => {
  const sink = new MemoryAuditSink();
  const log = new AuditLog(sink);
  await log.record({ actor: "u", tenantId: "t", action: "a", outcome: "info" });
  await log.record({ actor: "u", tenantId: "t", action: "b", outcome: "info" });
  await log.record({ actor: "u", tenantId: "t", action: "c", outcome: "info" });
  sink.entries.splice(1, 1); // remove middle
  assert.equal(AuditLog.verifyChain(sink.entries).ok, false);
});
