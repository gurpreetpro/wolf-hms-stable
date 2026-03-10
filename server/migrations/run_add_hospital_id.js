/**
 * Migration Runner: Add hospital_id to 96 tables
 * Run: node migrations/run_add_hospital_id.js
 * 
 * Reads the SQL migration file and executes it against the database.
 * Safe to re-run — uses IF NOT EXISTS everywhere.
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
    const sqlPath = path.join(__dirname, 'add_hospital_id_to_96_tables.sql');
    
    if (!fs.existsSync(sqlPath)) {
        console.error('❌ Migration file not found:', sqlPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔄 Starting Multi-Tenant Migration...');
    console.log('   Adding hospital_id to 96 tables + indexes + backfill');
    console.log('');

    const client = await pool.connect();
    
    try {
        // Execute the entire migration as one transaction
        await client.query(sql);
        
        // Verify: count tables with hospital_id
        const verifyRes = await client.query(`
            SELECT COUNT(DISTINCT table_name) as count 
            FROM information_schema.columns 
            WHERE column_name = 'hospital_id' AND table_schema = 'public'
        `);
        
        console.log('');
        console.log('✅ Migration Complete!');
        console.log(`   Tables with hospital_id: ${verifyRes.rows[0].count}`);
        
        // Check for any NULL hospital_id remaining
        const nullCheck = await client.query(`
            SELECT table_name FROM information_schema.columns 
            WHERE column_name = 'hospital_id' AND table_schema = 'public'
        `);
        
        let nullCount = 0;
        for (const row of nullCheck.rows) {
            try {
                const res = await client.query(
                    `SELECT COUNT(*) as c FROM ${row.table_name} WHERE hospital_id IS NULL`
                );
                if (parseInt(res.rows[0].c) > 0) {
                    console.log(`   ⚠️  ${row.table_name}: ${res.rows[0].c} rows with NULL hospital_id`);
                    nullCount += parseInt(res.rows[0].c);
                }
            } catch (e) {
                // Table might not exist, skip
            }
        }
        
        if (nullCount === 0) {
            console.log('   ✅ All rows have hospital_id assigned');
        } else {
            console.log(`   ⚠️  ${nullCount} total rows still have NULL hospital_id`);
        }
        
    } catch (error) {
        console.error('❌ Migration Error:', error.message);
        if (error.detail) console.error('   Detail:', error.detail);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
