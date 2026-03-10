const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

class MigrationService {
  async init() {
    // Create migrations table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async run() {
    await this.init();

    // Get applied migrations
    const { rows: appliedRows } = await pool.query('SELECT name FROM _migrations');
    const applied = new Set(appliedRows.map(r => r.name));

    // Get available migrations
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure alphanumeric order

    let count = 0;

    for (const file of files) {
      if (!applied.has(file)) {
        console.log(`🚀 Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        
        try {
          await pool.query('BEGIN');
          await pool.query(sql);
          await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
          await pool.query('COMMIT');
          console.log(`✅ Applied ${file}`);
          count++;
        } catch (err) {
          await pool.query('ROLLBACK');
          console.error(`❌ Failed to apply ${file}: ${err.message}`);
          if (err.detail) console.error(`   Detail: ${err.detail}`);
          console.error(`   Code: ${err.code}`);
          console.error(`   Detail: ${err.detail}`);
          console.error(`   Hint: ${err.hint}`);
          console.error(`   Position: ${err.position}`);
          throw err;
        }
      }
    }

    if (count === 0) {
      console.log('✨ Database is up to date.');
    } else {
      console.log(`🎉 Successfully applied ${count} migrations.`);
    }
  }

  async list() {
      await this.init();
      const { rows } = await pool.query('SELECT * FROM _migrations ORDER BY id ASC');
      console.table(rows);
  }
}

// Standalone runner
if (require.main === module) {
  const service = new MigrationService();
  const cmd = process.argv[2];
  
  if (cmd === 'list') {
      service.list().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  } else {
      service.run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  }
}

module.exports = new MigrationService();
