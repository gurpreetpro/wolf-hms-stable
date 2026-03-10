// Run Controlled Substances Migration
// Usage: node run_controlled_substances_migration.js

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function runMigration() {
    console.log('💊 Running Controlled Substances Migration...\n');

    try {
        const sqlPath = path.join(__dirname, 'migrations', 'controlled_substances.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        // Verify columns added
        const colCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'inventory_items' AND column_name IN ('is_controlled', 'schedule_type')
        `);
        console.log(`✅ Columns added: ${colCheck.rows.map(r => r.column_name).join(', ')}`);

        // Verify controlled substances
        const controlled = await pool.query(`
            SELECT name, schedule_type FROM inventory_items 
            WHERE is_controlled = TRUE
        `);
        console.log(`\n📋 Controlled Substances in Inventory: ${controlled.rows.length}`);
        controlled.rows.forEach(r => {
            console.log(`   💊 ${r.name} [${r.schedule_type}]`);
        });

        // Verify log table
        const logTable = await pool.query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_name = 'controlled_substance_log'
        `);
        console.log(`\n✅ controlled_substance_log table: ${logTable.rows[0].count > 0 ? 'Created' : 'Missing'}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
