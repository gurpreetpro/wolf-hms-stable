/**
 * Run Treatment Packages Migration Locally
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runMigration() {
    console.log('📦 Running Treatment Packages Migration Locally...\n');
    
    try {
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, 'migrations', '215_treatment_packages.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log(`📄 Loaded migration (${sql.length} bytes)\n`);
        
        // Execute
        await pool.query(sql);
        
        console.log('✅ Migration applied successfully!');
        
        // Verify packages
        const result = await pool.query('SELECT code, name, category, base_price FROM treatment_packages ORDER BY category, name');
        
        console.log(`\n📊 Created ${result.rows.length} packages:\n`);
        result.rows.forEach(pkg => {
            console.log(`   [${pkg.category}] ${pkg.code}: ${pkg.name} - ₹${pkg.base_price}`);
        });
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

runMigration();
