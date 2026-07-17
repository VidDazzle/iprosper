/**
 * Generate the production secrets Evolve OS needs and print them as env vars.
 * Pipe into your secret manager — never commit the output.
 *
 *   node --experimental-strip-types scripts/keygen.ts
 */
import { generateSigningKeyPair } from "../src/crypto/signing.js";
import { secureRandom } from "../src/crypto/random.js";

const rootKey = secureRandom(32).toString("base64");
const { publicKeyPem, privateKeyPem } = generateSigningKeyPair();
const kid = `evt-${new Date().getFullYear()}-1`;

const enc = (s: string): string => Buffer.from(s, "utf8").toString("base64");

console.log("# --- Evolve OS secrets (store in a secret manager, do NOT commit) ---");
console.log(`EVOLVE_KMS_ROOT_KEY=${rootKey}`);
console.log(`EVOLVE_TOKEN_KID=${kid}`);
console.log(`# PEM values are base64-wrapped here for single-line env storage.`);
console.log(`# Decode with: echo "$VAR" | base64 -d`);
console.log(`EVOLVE_TOKEN_PRIVATE_KEY_B64=${enc(privateKeyPem)}`);
console.log(`EVOLVE_TOKEN_PUBLIC_KEY_B64=${enc(publicKeyPem)}`);
console.log("#");
console.log("# Raw PEM (if your secret store handles multiline):");
console.log(privateKeyPem.trim());
console.log(publicKeyPem.trim());
