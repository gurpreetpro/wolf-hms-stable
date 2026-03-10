// Run Drug Interactions Migration
// Usage: node run_drug_interactions_migration.js

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function runMigration() {
    console.log('🏥 Running Drug Interactions Migration...\n');

    try {
        const sqlPath = path.join(__dirname, 'migrations', 'drug_interactions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        // Verify count
        const result = await pool.query('SELECT COUNT(*) as count FROM drug_interactions');
        console.log(`✅ Migration complete! ${result.rows[0].count} drug interactions loaded.\n`);

        // Show sample
        const sample = await pool.query(`
            SELECT drug1_name, drug2_name, severity, effect 
            FROM drug_interactions 
            WHERE severity = 'major' 
            LIMIT 5
        `);

        console.log('📋 Sample Major Interactions:');
        sample.rows.forEach(row => {
            console.log(`   ⚠️  ${row.drug1_name} + ${row.drug2_name} [${row.severity.toUpperCase()}]`);
            console.log(`      Effect: ${row.effect.substring(0, 60)}...`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
