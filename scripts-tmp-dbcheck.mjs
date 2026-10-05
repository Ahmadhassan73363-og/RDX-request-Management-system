/**
 * RDX — Clean All Dummy Data
 * Truncates all RDX application tables (keeps schema & structure intact).
 * Foreign key order matters — children before parents.
 */
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Jc3vfCzM4DLN@ep-purple-recipe-aym3x839-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 3,
  connectionTimeoutMillis: 15000
});

async function cleanAll() {
  const client = await pool.connect();
  console.log('✅ Connected to Neon PostgreSQL');

  try {
    await client.query('BEGIN');

    // Delete in FK-safe order (children first, parents last)
    const tables = [
      'audit_logs',
      'notifications',
      'budget_transactions',
      'form_submissions',
      'form_assignments',
      'requests',
      'forms',
      'users',
      'teams',
      'customers',
      'warehouses',
      'companies',
      'roles',
      'additional_fields',
    ];

    console.log('\n🗑️  Deleting all data from RDX tables...');
    for (const tbl of tables) {
      const r = await client.query(`DELETE FROM ${tbl}`);
      console.log(`  ✓ ${tbl.padEnd(25)} ${r.rowCount} rows deleted`);
    }

    // Reset settings to clean defaults (keep the row, reset content)
    await client.query(`
      INSERT INTO settings (id, data, updated_at)
      VALUES ('global', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
    `, [JSON.stringify({
      branding: {
        companyName: 'RDX',
        appTitle: 'Request & Budget Management System',
        currencySymbol: '£',
        currencyCode: 'GBP',
        primaryColorHex: '#b71234',
        supportEmail: 'support@enterprise.com',
        logoUrl: '/rdx-logo.png'
      },
      budgetRules: {
        warningThresholdPercent: 80,
        criticalThresholdPercent: 100,
        requireExecutiveOverrideWhenExceeded: true,
        maxRequestDiscountAllowedPercent: 40,
        enforceHardBudgetCap: true
      }
    })]);
    console.log('  ✓ settings                  reset to clean defaults');

    await client.query('COMMIT');
    console.log('\n🎉 All dummy data cleared. Database is clean and ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during cleanup:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanAll().catch(() => process.exit(1));
