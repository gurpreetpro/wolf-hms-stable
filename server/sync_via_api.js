/**
 * Cloud Database Sync via API
 * Uses the exec-sql endpoint to run SQL directly on Cloud SQL
 */

const axios = require('axios');
const fs = require('fs');

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SETUP_KEY = 'WolfSetup2024!';
const DUMP_FILE = 'database_dump_clean.sql';

async function execSQL(sql) {
    try {
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
            setupKey: SETUP_KEY,
            sql: sql
        }, { timeout: 60000 });
        return { success: true, data: res.data };
    } catch (err) {
        return { success: false, error: err.response?.data || err.message };
    }
}

async function syncDatabase() {
    console.log('===========================================');
    console.log('  WOLF HMS DATABASE SYNC VIA API');
    console.log('===========================================\n');

    // Read the SQL dump
    console.log('[1/3] Reading SQL dump...');
    const sqlContent = fs.readFileSync(DUMP_FILE, 'utf8');
    console.log(`  Loaded ${sqlContent.length} characters\n`);

    // Split into statements
    console.log('[2/3] Parsing SQL statements...');
    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SET '));
    
    console.log(`  Found ${statements.length} statements to execute\n`);

    // Execute in batches
    console.log('[3/3] Executing on Cloud SQL...');
    let success = 0, failed = 0;
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.length < 10) continue; // Skip tiny statements
        
        const result = await execSQL(stmt + ';');
        if (result.success) {
            success++;
            process.stdout.write('.');
        } else {
            failed++;
            // Only log errors that aren't "already exists" type
            if (!result.error?.message?.includes('already exists') && 
                !result.error?.message?.includes('does not exist')) {
                console.log(`\n  ERROR at ${i}: ${result.error?.message || result.error}`);
            }
        }
        
        // Progress update every 50 statements
        if (i % 50 === 0 && i > 0) {
            console.log(` [${i}/${statements.length}]`);
        }
    }

    console.log(`\n\n===========================================`);
    console.log(`  SYNC COMPLETE`);
    console.log(`  Success: ${success}  Failed: ${failed}`);
    console.log(`===========================================\n`);
}

syncDatabase().catch(e => console.error(e));
