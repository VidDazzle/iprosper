import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

// Lazily instantiate the database so importing this module (e.g. during
// Next.js build-time page-data collection) does not require TURSO_* env vars.
// The client is created on first actual query at runtime.
let _db: LibSQLDatabase<typeof schema> | null = null;

function getDb(): LibSQLDatabase<typeof schema> {
  if (!_db) {
    const client = createClient({
      url: process.env.TURSO_CONNECTION_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb();
    return Reflect.get(instance, prop, instance);
  },
});

export type Database = LibSQLDatabase<typeof schema>;
