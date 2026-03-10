const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const runMigration = async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Please provide a migration file path');
    process.exit(1);
  }

  const filePath = path.join(__dirname, '..', file);
  console.log(`Reading migration file: ${filePath}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    // Simple split by semicolon, filtering empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute.`);

    for (let i = 0; i < statements.length; i++) {
        console.log(`Executing Statement ${i + 1}/${statements.length}...`);
        try {
            await pool.query(statements[i]);
        } catch (stmtErr) {
            console.warn(`Statement ${i + 1} failed (might be benign if IF NOT EXISTS usage):`, stmtErr.message);
            // Optionally continue or throw based on strictness. For now, we continue to allow idempotency.
        }
    }
    console.log('Migration execution completed.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
};

runMigration();
