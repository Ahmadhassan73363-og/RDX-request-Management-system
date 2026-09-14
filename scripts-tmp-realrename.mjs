import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  await pool.query('ALTER TABLE requests RENAME COLUMN gift_category TO request_category');
  await pool.query('ALTER TABLE requests RENAME COLUMN gift_item TO request_item');
  await pool.query('ALTER TABLE requests RENAME COLUMN gift_value TO request_value');
  console.log('Renamed gift_category/gift_item/gift_value -> request_category/request_item/request_value');

  const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'requests' AND column_name LIKE '%gift%' OR column_name LIKE '%request_category%' OR column_name LIKE '%request_item%' OR column_name LIKE '%request_value%'`);
  console.log('Verification:', cols.rows.map(r => r.column_name));
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
