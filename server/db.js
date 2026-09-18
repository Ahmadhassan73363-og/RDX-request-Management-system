import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present (ignored if already loaded or on Vercel)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

// Resolve connection string from any of the standard Vercel or Neon environment variables
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  'postgresql://neondb_owner:npg_Jc3vfCzM4DLN@ep-purple-recipe-aym3x839-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

const isSsl =
  process.env.PGSSL === 'true' ||
  Boolean(
    connectionString &&
      (connectionString.includes('sslmode=require') ||
        connectionString.includes('neon.tech') ||
        connectionString.includes('vercel-storage.com'))
  );

function createPool() {
  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      // Conservative pool size for serverless lambdas to prevent Neon connection exhaustion
      max: process.env.NODE_ENV === 'production' ? 4 : 10,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 10000,
    });
  }

  return new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'root',
    database: process.env.PGDATABASE || 'rdx_request_db',
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000,
  });
}

// Preserve the pool across warm serverless function invocations (prevents connection leaks)
if (!globalThis._rdxPgPool) {
  globalThis._rdxPgPool = createPool();
}
export const pool = globalThis._rdxPgPool;

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

