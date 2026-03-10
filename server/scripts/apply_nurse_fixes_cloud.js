/**
 * Apply nurse dashboard fixes to Cloud Database
 * - Migration 206: Fix iv_lines schema + create fall_risk_assessments
 * - Seed ward_consumables and ward_service_charges
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cloud DB connection via proxy on port 5433
const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'hospital_db',
    user: 'postgres',
    password: 'WolfHMS_Secure_2026!'
});

async function applyCloudFixes() {
    console.log('🚀 Connecting to Cloud SQL via proxy...');
    
    try {
        // Test connection
        const testRes = await pool.query('SELECT NOW() as time, current_database() as db');
        console.log(`✅ Connected to: ${testRes.rows[0].db} at ${testRes.rows[0].time}`);

        // Step 1: Run Migration 206
        console.log('\n📦 Step 1: Running migration 206_fix_nurse_tables.sql...');
        const migrationPath = path.join(__dirname, '../db/migrations/206_fix_nurse_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await pool.query(migrationSQL);
        console.log('✅ Migration 206 applied successfully!');

        // Step 2: Check if consumables already seeded
        console.log('\n📦 Step 2: Checking seed data...');
        const consCheck = await pool.query('SELECT COUNT(*) as count FROM ward_consumables WHERE hospital_id = 1');
        const servCheck = await pool.query('SELECT COUNT(*) as count FROM ward_service_charges WHERE hospital_id = 1');
        
        console.log(`   Current consumables: ${consCheck.rows[0].count}`);
        console.log(`   Current services: ${servCheck.rows[0].count}`);

        if (parseInt(consCheck.rows[0].count) < 10) {
            console.log('\n📦 Step 3: Seeding consumables...');
            const consumables = [
                { name: 'Surgical Gloves (Pair)', price: 25, category: 'PPE', stock: 500 },
                { name: 'Face Mask N95', price: 45, category: 'PPE', stock: 300 },
                { name: 'IV Cannula 20G', price: 85, category: 'IV Supplies', stock: 200 },
                { name: 'IV Cannula 22G', price: 80, category: 'IV Supplies', stock: 200 },
                { name: 'IV Set (Adult)', price: 120, category: 'IV Supplies', stock: 150 },
                { name: 'Syringe 5ml', price: 8, category: 'Syringes', stock: 1000 },
                { name: 'Syringe 10ml', price: 12, category: 'Syringes', stock: 800 },
                { name: 'Gauze Pad 4x4', price: 15, category: 'Wound Care', stock: 500 },
                { name: 'Adhesive Bandage', price: 5, category: 'Wound Care', stock: 1000 },
                { name: 'Cotton Roll 500g', price: 180, category: 'General', stock: 100 },
                { name: 'Alcohol Swab (Pack 100)', price: 120, category: 'Antiseptic', stock: 50 },
                { name: 'Betadine Solution 100ml', price: 95, category: 'Antiseptic', stock: 80 },
                { name: 'Urinary Catheter 16Fr', price: 250, category: 'Catheters', stock: 50 },
                { name: 'Oxygen Mask (Adult)', price: 150, category: 'Respiratory', stock: 100 },
                { name: 'Nebulizer Kit', price: 180, category: 'Respiratory', stock: 80 }
            ];

            for (const c of consumables) {
                await pool.query(
                    `INSERT INTO ward_consumables (name, price, category, stock_quantity, hospital_id, active) 
                     VALUES ($1, $2, $3, $4, 1, true) ON CONFLICT DO NOTHING`,
                    [c.name, c.price, c.category, c.stock]
                );
            }
            console.log(`✅ Seeded ${consumables.length} consumable items`);
        } else {
            console.log('⏭️  Consumables already seeded, skipping...');
        }

        if (Number.parseInt(servCheck.rows[0].count) < 10) {
            console.log('\n📦 Step 4: Seeding service charges...');
            
            // First, add active column if it doesn't exist
            await pool.query(`ALTER TABLE ward_service_charges ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`);
            
            const services = [
                { name: 'Nursing Care (Per Day)', price: 500, category: 'Nursing' },
                { name: 'Oxygen Support (Per Hour)', price: 100, category: 'Respiratory' },
                { name: 'Nebulization', price: 150, category: 'Respiratory' },
                { name: 'ECG Monitoring (Per Hour)', price: 200, category: 'Monitoring' },
                { name: 'SpO2 Monitoring (Per Day)', price: 300, category: 'Monitoring' },
                { name: 'Blood Pressure Monitoring', price: 50, category: 'Monitoring' },
                { name: 'IV Fluid Administration', price: 200, category: 'IV Therapy' },
                { name: 'Blood Transfusion Service', price: 800, category: 'IV Therapy' },
                { name: 'Wound Dressing (Simple)', price: 150, category: 'Wound Care' },
                { name: 'Wound Dressing (Complex)', price: 350, category: 'Wound Care' },
                { name: 'Suture Removal', price: 200, category: 'Procedures' },
                { name: 'Catheter Insertion', price: 400, category: 'Procedures' },
                { name: 'NG Tube Insertion', price: 350, category: 'Procedures' },
                { name: 'Enema', price: 250, category: 'Procedures' },
                { name: 'Physiotherapy Session', price: 500, category: 'Therapy' },
                { name: 'Sponge Bath', price: 200, category: 'Personal Care' },
                { name: 'Bed Bath', price: 150, category: 'Personal Care' },
                { name: 'Escort Service (Per Hour)', price: 300, category: 'Support' }
            ];

            for (const s of services) {
                await pool.query(
                    `INSERT INTO ward_service_charges (name, price, category, hospital_id) 
                     VALUES ($1, $2, $3, 1) ON CONFLICT DO NOTHING`,
                    [s.name, s.price, s.category]
                );
            }
            console.log(`✅ Seeded ${services.length} service charges`);
        } else {
            console.log('⏭️  Services already seeded, skipping...');
        }

        // Final verification
        console.log('\n📊 Final Verification:');
        const finalCons = await pool.query('SELECT COUNT(*) as count FROM ward_consumables WHERE hospital_id = 1');
        const finalServ = await pool.query('SELECT COUNT(*) as count FROM ward_service_charges WHERE hospital_id = 1');
        const ivCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'iv_lines'`);
        const fallExists = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fall_risk_assessments')`);
        
        console.log(`   ✅ Consumables: ${finalCons.rows[0].count}`);
        console.log(`   ✅ Services: ${finalServ.rows[0].count}`);
        console.log(`   ✅ iv_lines columns: ${ivCols.rows.map(r => r.column_name).join(', ')}`);
        console.log(`   ✅ fall_risk_assessments table exists: ${fallExists.rows[0].exists}`);

        console.log('\n🎉 All cloud fixes applied successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.detail) console.error('   Detail:', error.detail);
    } finally {
        await pool.end();
    }
}

applyCloudFixes();
