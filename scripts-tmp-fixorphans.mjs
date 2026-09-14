import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Reassign the 3 requests orphaned by earlier team deletions to an existing team
// so they're actionable again. Picking team-corporate as a reasonable default.
const fixes = [
  { id: 'req-6', teamId: 'team-corporate', teamName: 'Marketing team A' },
  { id: 'req-5', teamId: 'team-corporate', teamName: 'Marketing team A' },
  { id: 'req-1789029852831', teamId: 'team-corporate', teamName: 'Marketing team A' }
];

try {
  for (const f of fixes) {
    const r = await pool.query(
      `UPDATE requests SET team_id = $1, team_name = $2 WHERE id = $3 RETURNING id, tracking_number, team_id, team_name`,
      [f.teamId, f.teamName, f.id]
    );
    console.log('Fixed:', r.rows[0]);
  }
  const check = await pool.query(`SELECT id, tracking_number, team_id FROM requests WHERE team_id IS NULL`);
  console.log('Remaining orphaned requests:', check.rows);
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
