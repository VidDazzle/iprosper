import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

/**
 * Lazily construct the Drizzle client on first use.
 *
 * Next.js evaluates route modules during the production build (page-data
 * collection). Creating the libSQL client at import time means a missing
 * TURSO_CONNECTION_URL crashes the build even though no query runs. Deferring
 * construction until the first property access keeps import-time side effects
 * out of the build while leaving every call site (`db.select()`, etc.)
 * unchanged.
 */
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  if (_db) return _db;
  const url = process.env.TURSO_CONNECTION_URL;
  if (!url) {
    throw new Error(
      'TURSO_CONNECTION_URL is not set. Configure the database connection (see .env.example).',
    );
  }
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
}) as DrizzleDb;

export type Database = DrizzleDb;
