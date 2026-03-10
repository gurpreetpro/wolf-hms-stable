
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'wolf_hms_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function applyMigration() {
  try {
    const migrationFile = path.join(__dirname, 'migrations', '107_ledger_phase1.sql');
    const migrationSql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Applying Ledger Phase 1 migration...');
    await pool.query(migrationSql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

applyMigration();
