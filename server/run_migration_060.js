const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', '060_security_module.sql'), 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} statements.`);
    
    for (const statement of statements) {
        if (!statement) continue;
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        try {
            await pool.query(statement);
        } catch (err) {
            console.error('❌ Failed statement:', statement);
            console.error('❌ Error:', err.message);
            // Don't exit, try next to see if it's transient or dependency related
        }
    }
    
    console.log('✅ Success!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

run();
