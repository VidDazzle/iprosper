/**
 * Applies the SQL files in ./drizzle to the configured libSQL/Turso database.
 * Usage: node scripts/migrate.mjs
 *
 * Requires TURSO_CONNECTION_URL (+ TURSO_AUTH_TOKEN for remote) in the env.
 * Statements are split on the drizzle "--> statement-breakpoint" markers and
 * run in order; every DDL statement uses IF NOT EXISTS so re-runs are safe.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@libsql/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'drizzle');

const url = process.env.TURSO_CONNECTION_URL || 'file:./sqlite.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.execute(statement);
  }
  console.log(`Applied ${file} (${statements.length} statements)`);
}

console.log('Migrations complete.');
process.exit(0);
