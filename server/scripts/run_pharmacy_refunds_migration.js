// Run Pharmacy Refunds Migration
// Usage: node run_pharmacy_refunds_migration.js

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function runMigration() {
    console.log('💰 Running Pharmacy Refunds Migration...\n');

    try {
        const sqlPath = path.join(__dirname, 'migrations', 'pharmacy_refunds.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        // Verify table created
        const tableCheck = await pool.query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_name = 'pharmacy_refunds'
        `);
        console.log(`✅ pharmacy_refunds table: ${tableCheck.rows[0].count > 0 ? 'Created' : 'Missing'}`);

        // Show table structure
        const columns = await pool.query(`
            SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name = 'pharmacy_refunds'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 Table columns:');
        columns.rows.forEach(c => {
            console.log(`   - ${c.column_name}: ${c.data_type}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
