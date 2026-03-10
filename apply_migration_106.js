
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'wolf_hms_db',
  password: process.env.DB_PASSWORD || 'password',
  port: 5432,
});

async function applyMigration() {
  try {
    const migrationFile = path.join(__dirname, 'server', 'migrations', '106_add_ipd_number.sql');
    const migrationSql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Applying migration...');
    await pool.query(migrationSql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

applyMigration();
