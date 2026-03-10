const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SECRET = 'WolfHMS_Migration_Secret_2026';

async function fixGeneratedColumns() {
    console.log('=== FIXING ALL GENERATED COLUMNS ===\n');
    
    // Columns to check and fix
    const targetCols = [
        'subdomain', 
        'hospital_domain', 
        'custom_domain',
        'slug'
    ];
    
    try {
        for (const col of targetCols) {
            console.log(`\nChecking column: ${col}...`);
            
            // 1. Inspect
            const res = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                secret: SECRET,
                sql: `
                    SELECT column_name, is_generated, generation_expression 
                    FROM information_schema.columns 
                    WHERE table_name = 'hospitals' AND column_name = '${col}'
                `
            });
            
            const info = res.data.rows[0];
            if (info) {
                console.log(`   State: ${JSON.stringify(info)}`);
                
                // Even if it says "NEVER", force drop/recreate to be sure (maybe metadata lag?)
                // NO, if it says NEVER, it should be fine. But let's be aggressive.
                
                console.log(`   🔨 Dropping ${col}...`);
                try {
                    await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                        secret: SECRET,
                        sql: `ALTER TABLE hospitals DROP COLUMN IF EXISTS ${col} CASCADE;`
                    });
                     // Re-add
                    console.log(`   ✨ Re-adding ${col}...`);
                    await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                        secret: SECRET,
                        sql: `ALTER TABLE hospitals ADD COLUMN ${col} VARCHAR(100);`
                    });
                    console.log(`   ✅ Fixed ${col}`);
                } catch(e) {
                    console.log(`   ❌ Error fixing ${col}: ${e.message}`);
                }
            } else {
                console.log('   Column does not exist. Adding...');
                 try {
                    await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                        secret: SECRET,
                        sql: `ALTER TABLE hospitals ADD COLUMN ${col} VARCHAR(100);`
                    });
                    console.log(`   ✅ Added ${col}`);
                } catch(e) {
                    console.log(`   ❌ Error adding ${col}: ${e.message}`);
                }
            }
        }
        
        // 3. Truncate ALL tables (Reuse prepare logic quickly)
        console.log('\n🗑️ Truncating ALL tables...');
         const tables = [
            'ward_service_charges', 'ward_consumables', 'hospital_settings', 
            'ot_rooms', 'admissions', 'beds', 'patients', 'users', 'hospitals', 'surgeries'
        ];
        for (const t of tables) {
             await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                secret: SECRET,
                sql: `TRUNCATE TABLE ${t} RESTART IDENTITY CASCADE;`
            });
        }
        console.log('   ✅ Tables Truncated');

    } catch (err) {
        console.error('Error:', err.message);
    }
}

fixGeneratedColumns();
