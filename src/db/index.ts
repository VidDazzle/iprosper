import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

// The Drizzle client is created lazily so that importing `db` (e.g. during
// Next.js build-time page-data collection) does not require TURSO_CONNECTION_URL
// to be present. The real connection is established on first query at runtime,
// where the environment variables are set.
function createDb() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  return drizzle(client, { schema });
}

type DrizzleDb = ReturnType<typeof createDb>;

let _db: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  if (!_db) _db = createDb();
  return _db;
}

// A proxy that defers instantiation until a property is actually accessed.
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export type Database = DrizzleDb;
