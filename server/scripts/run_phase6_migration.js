const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hospital_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'phase6_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running Phase 6 Migration...');
    await pool.query(sql);
    console.log('Migration successful!');
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
