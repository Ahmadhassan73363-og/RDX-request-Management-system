import { pool } from './server/db.js';

async function main() {
  const r = await pool.query('SELECT * FROM requests WHERE id = $1', ['req-1789734531600']);
  console.log('Row:', JSON.stringify(r.rows[0], null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
