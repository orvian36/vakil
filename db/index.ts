// db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type SqlClient = ReturnType<typeof postgres>;
type GlobalCache = {
  __sql?: SqlClient;
  __db?: any;
};

const g = globalThis as unknown as GlobalCache;

// IMPORTANT: Session vs Transaction pooler
// Session pooler: prepare:true (default). Transaction pooler: prepare:false.
const isProd = process.env.NODE_ENV === 'production';
const usingTransactionPooler = false; // set true only if you use txn pooler (port 6543)

if (!g.__sql) {
  // Determine SSL mode based on environment
  // For local development, SSL might not be required
  const sslMode = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('sslmode=require')
    ? 'require'
    : (process.env.DATABASE_SSL === 'true' ? 'require' : false);

  g.__sql = postgres(process.env.DATABASE_URL!, {
    max: 20,
    idle_timeout: 30,     // seconds
    connect_timeout: 15,   // seconds
    prepare: !usingTransactionPooler, // session:true, txn:false
    ssl: sslMode,
    connection: { application_name: 'personal-injury' },
  });
}

if (!g.__db) {
  g.__db = drizzle(g.__sql, { schema, logger: false });
}

export const sql = g.__sql!;
export const db = g.__db!;
