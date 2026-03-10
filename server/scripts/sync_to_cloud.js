const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SECRET = 'WolfHMS_Migration_Secret_2026';

async function syncToCloud() {
    console.log('=== SYNCING DATA TO CLOUD SQL ===\n');
    
    // Read the exported SQL
    const sqlPath = path.join(__dirname, '../migrations/data_export.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    // IMPORTANT: Fix super_admin hospital_id to NULL for platform-wide access
    // The export has hospital_id: 2, but we need NULL
    sql = sql.replace(
        /INSERT INTO users \(id, username, password, email, role,([^)]+)\) VALUES \(4, 'gurpreetpro', ([^,]+), 'gurpreetpro@gmail.com', 'super_admin',([^)]+), 2,/g,
        "INSERT INTO users (id, username, password, email, role,$1) VALUES (4, 'gurpreetpro', $2, 'gurpreetpro@gmail.com', 'super_admin',$3, NULL,"
    );
    
    // Split into smaller batches (API might have size limits)
    const statements = sql.split(';\n').filter(s => s.trim() && !s.startsWith('--'));
    
    console.log(`📦 Total statements to execute: ${statements.length}`);
    console.log(`📊 SQL size: ${(sql.length / 1024).toFixed(2)} KB\n`);
    
    // Execute in batches of 10 statements
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i += batchSize) {
        const batch = statements.slice(i, i + batchSize);
        const batchSql = batch.join(';\n') + ';';
        
        try {
            const response = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                secret: SECRET,
                sql: batchSql
            }, {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.data.success || response.status === 200) {
                successCount += batch.length;
                process.stdout.write(`\r✅ Progress: ${successCount}/${statements.length} statements`);
            } else {
                errorCount++;
                console.log(`\n⚠️ Batch ${Math.floor(i/batchSize)+1} warning:`, response.data);
            }
        } catch (err) {
            errorCount++;
            console.log(`\n❌ Batch ${Math.floor(i/batchSize)+1} error:`, err.response?.data?.message || err.message);
            // Continue with next batch
        }
    }
    
    console.log(`\n\n=== SYNC COMPLETE ===`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    // Post-sync: Fix super_admin hospital_id to NULL
    console.log('\n--- Fixing super_admin hospital_id ---');
    try {
        const fixResult = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
            secret: SECRET,
            sql: "UPDATE users SET hospital_id = NULL WHERE role = 'super_admin' OR email = 'gurpreetpro@gmail.com';"
        });
        console.log('✅ Super admin fixed for platform-wide access');
    } catch (err) {
        console.log('⚠️ Could not fix super_admin:', err.message);
    }
    
    // Verify data counts
    console.log('\n--- Verifying Cloud Data ---');
    try {
        const tables = ['hospitals', 'users', 'patients', 'admissions', 'wards', 'beds'];
        for (const table of tables) {
            const result = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                secret: SECRET,
                sql: `SELECT COUNT(*) FROM ${table}`
            });
            console.log(`  ${table}: ${result.data.result?.[0]?.count || result.data.rows?.[0]?.count || 'N/A'}`);
        }
    } catch (err) {
        console.log('⚠️ Could not verify:', err.message);
    }
}

syncToCloud();
