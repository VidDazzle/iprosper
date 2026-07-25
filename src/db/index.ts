import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

// Lazily constructed so importing this module (e.g. during Next.js's build-time
// "collecting page data" pass) never throws just because env vars aren't set
// yet in this environment — the real error only surfaces on an actual query,
// which is what you want in production too (a route that never touches the
// DB shouldn't fail to build because Turso credentials are missing).
let instance: LibSQLDatabase<typeof schema> | undefined;

function getDb(): LibSQLDatabase<typeof schema> {
  if (!instance) {
    const url = process.env.TURSO_CONNECTION_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) {
      throw new Error('TURSO_CONNECTION_URL is not set. Add it to your environment before using the database.');
    }
    const client = createClient({ url, authToken });
    instance = drizzle(client, { schema });
  }
  return instance;
}

export const db: LibSQLDatabase<typeof schema> = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Database = typeof db;
