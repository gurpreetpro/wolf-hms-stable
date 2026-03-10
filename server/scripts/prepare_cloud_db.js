const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SECRET = 'WolfHMS_Migration_Secret_2026';

const TABLES_TO_TRUNCATE = [
    'ward_service_charges', 
    'ward_consumables', 
    'hospital_settings', 
    'ot_rooms',  // Need to create this first
    'admissions', 
    'beds', 
    'patients', 
    'users', 
    'hospitals', 
    'equipment_types',
    'surgeries'
];

async function prepareCloud() {
    console.log('=== PREPARING CLOUD DATABASE ===\n');
    
    try {
        // 1. Fix Schema (Add Columns)
        console.log('1. Adding missing columns...');
        const missingCols = [
            'logo_url VARCHAR(255)',
            'address TEXT',
            'city VARCHAR(100)',
            'state VARCHAR(100)',
            'country VARCHAR(100)',
            'phone VARCHAR(50)',
            'email VARCHAR(100)',
            'subdomain VARCHAR(100)',
            'custom_domain VARCHAR(100)',
            'primary_color VARCHAR(20)',
            'secondary_color VARCHAR(20)',
            'settings JSONB',
            'subscription_tier VARCHAR(50)',
            'subscription_plan VARCHAR(50)',
            'status VARCHAR(20) DEFAULT \'active\'',
            'bed_count INTEGER',
            'staff_count INTEGER',
            'pricing_tier VARCHAR(50)',
            'hospital_name VARCHAR(100)',
            'hospital_domain VARCHAR(100)',
            'slug VARCHAR(100)',
            'tagline VARCHAR(255)',
            'registration_no VARCHAR(100)',
            'subscription_start TIMESTAMP',
            'subscription_end TIMESTAMP'
        ];

        for (const colDef of missingCols) {
            try {
                // FORCE FIX: Drop column first if it exists to remove any weird constraints/generated properties
                // Only for subdomain/hospital_domain which are causing issues
                const colName = colDef.split(' ')[0];
                if (['subdomain', 'hospital_domain', 'custom_domain'].includes(colName)) {
                    await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                        secret: SECRET,
                        sql: `ALTER TABLE hospitals DROP COLUMN IF EXISTS ${colName} CASCADE;`
                    });
                     console.log(`   🗑️ Dropped existing ${colName}`);
                }

                await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                    secret: SECRET,
                    sql: `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS ${colDef};`
                });
                console.log(`   ✅ Added hospitals column: ${colDef.split(' ')[0]}`);
            } catch (e) {
                 console.log(`   ⚠️ Failed to process ${colDef.split(' ')[0]}: ${e.response?.data?.message || e.message}`);
            }
        }

        // 2. Create Missing Tables (OT Rooms)
        console.log('\n2. Creating missing tables...');
        const otSchema = `
            CREATE TABLE IF NOT EXISTS ot_rooms (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Available',
                equipment JSONB DEFAULT '{}',
                hospital_id INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        try {
             await axios.post(`${CLOUD_URL}/api/sync/sql`, { secret: SECRET, sql: otSchema });
             console.log('   ✅ ot_rooms ensured');
        } catch (e) {
             console.log('   ⚠️ Error creating ot_rooms:', e.message);
        }
        
        // 3. Create Surgeries table if missing (might be needed)
        const surgSchema = `
            CREATE TABLE IF NOT EXISTS surgeries (
                id SERIAL PRIMARY KEY,
                patient_id UUID,
                doctor_id INTEGER,
                ot_room_id INTEGER,
                procedure_name VARCHAR(255),
                status VARCHAR(50),
                scheduled_start TIMESTAMP,
                scheduled_end TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
         try {
             await axios.post(`${CLOUD_URL}/api/sync/sql`, { secret: SECRET, sql: surgSchema });
             console.log('   ✅ surgeries ensured');
        } catch (e) {
             console.log('   ⚠️ Error creating surgeries:', e.message);
        }

        // 4. TRUNCATE ALL (Clean Slate)
        console.log('\n3. Truncating all tables...');
        for (const table of TABLES_TO_TRUNCATE) {
            try {
                // Check if table exists first to avoid 404/500 errors crashing the script
                 const check = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                    secret: SECRET,
                    sql: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}')`
                });
                
                if (check.data.rows[0].exists) {
                    await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                        secret: SECRET,
                        sql: `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`
                    });
                    console.log(`   ✅ Truncated ${table}`);
                } else {
                    console.log(`   ⚠️ Table ${table} does not exist!`);
                }
            } catch (err) {
                console.log(`   ❌ Failed to truncate ${table}: ${err.message}`);
            }
        }

        console.log('\n✅ Cloud Database Prepared!');

    } catch (err) {
        console.error('Fatal Error:', err.message);
    }
}

prepareCloud();
