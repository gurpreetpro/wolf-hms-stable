// Lab Dashboard Phase 1 Database Migrations - Simplified
// Run: node run_lab_phase1.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function addColumn(client, table, column, type) {
    try {
        await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`   + Added ${column}`);
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log(`   ✓ ${column} already exists`);
        } else {
            console.error(`   ✗ Error adding ${column}:`, e.message);
        }
    }
}

async function runMigrations() {
    const client = await pool.connect();

    try {
        console.log('\n🔬 Lab Dashboard Phase 1 Migrations\n');
        console.log('='.repeat(40));

        // 1. Add columns to lab_orders
        console.log('\n1️⃣ Adding columns to lab_orders...');
        await addColumn(client, 'lab_orders', 'barcode', 'VARCHAR(20)');
        await addColumn(client, 'lab_orders', 'sample_collected_at', 'TIMESTAMP');
        await addColumn(client, 'lab_orders', 'has_critical_value', 'BOOLEAN DEFAULT FALSE');
        await addColumn(client, 'lab_orders', 'collected_by', 'INTEGER');

        // 2. Create lab_audit_log table
        console.log('\n2️⃣ Creating lab_audit_log table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_audit_log (
                id SERIAL PRIMARY KEY,
                lab_order_id INTEGER,
                action VARCHAR(50) NOT NULL,
                performed_by INTEGER,
                details JSONB,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ lab_audit_log ready');

        // 3. Create lab_reference_ranges table
        console.log('\n3️⃣ Creating lab_reference_ranges table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_reference_ranges (
                id SERIAL PRIMARY KEY,
                test_name VARCHAR(100) NOT NULL,
                parameter VARCHAR(100) NOT NULL,
                unit VARCHAR(20),
                normal_min DECIMAL(10,2),
                normal_max DECIMAL(10,2),
                critical_low DECIMAL(10,2),
                critical_high DECIMAL(10,2),
                age_group VARCHAR(20) DEFAULT 'adult',
                gender VARCHAR(10) DEFAULT 'all',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ lab_reference_ranges ready');

        // 4. Check if reference ranges exist
        const existingRanges = await client.query('SELECT COUNT(*) as cnt FROM lab_reference_ranges');
        if (parseInt(existingRanges.rows[0].cnt) === 0) {
            console.log('\n4️⃣ Seeding reference ranges...');

            const insertRange = async (test, param, unit, nmin, nmax, clow, chigh) => {
                await client.query(`
                    INSERT INTO lab_reference_ranges (test_name, parameter, unit, normal_min, normal_max, critical_low, critical_high)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [test, param, unit, nmin, nmax, clow, chigh]);
            };

            // CBC
            await insertRange('CBC', 'hemoglobin', 'g/dL', 12.0, 16.0, 7.0, 20.0);
            await insertRange('CBC', 'wbc', '/µL', 4500, 11000, 2000, 30000);
            await insertRange('CBC', 'platelets', '/µL', 150000, 400000, 50000, 1000000);
            await insertRange('CBC', 'rbc', 'million/µL', 4.5, 5.5, 3.0, 7.0);

            // RFT
            await insertRange('RFT', 'creatinine', 'mg/dL', 0.7, 1.3, 0.4, 10.0);
            await insertRange('RFT', 'urea', 'mg/dL', 15, 40, 5, 150);

            // LFT
            await insertRange('LFT', 'bilirubin', 'mg/dL', 0.1, 1.2, 0.0, 15.0);
            await insertRange('LFT', 'sgpt', 'U/L', 7, 56, 0, 500);
            await insertRange('LFT', 'sgot', 'U/L', 5, 40, 0, 500);

            // Blood Sugar
            await insertRange('Blood Sugar', 'blood_sugar', 'mg/dL', 70, 100, 40, 500);
            await insertRange('Blood Sugar', 'fasting_glucose', 'mg/dL', 70, 100, 40, 500);
            await insertRange('Blood Sugar', 'hba1c', '%', 4.0, 5.6, 3.0, 14.0);

            // Electrolytes
            await insertRange('Electrolytes', 'potassium', 'mEq/L', 3.5, 5.0, 2.5, 6.5);
            await insertRange('Electrolytes', 'sodium', 'mEq/L', 136, 145, 120, 160);
            await insertRange('Electrolytes', 'calcium', 'mg/dL', 8.5, 10.5, 6.0, 14.0);

            // Lipid Profile
            await insertRange('Lipid Profile', 'cholesterol', 'mg/dL', 0, 200, 0, 400);
            await insertRange('Lipid Profile', 'triglycerides', 'mg/dL', 0, 150, 0, 500);
            await insertRange('Lipid Profile', 'hdl', 'mg/dL', 40, 60, 20, 100);
            await insertRange('Lipid Profile', 'ldl', 'mg/dL', 0, 100, 0, 300);

            // Thyroid
            await insertRange('Thyroid', 'tsh', 'mIU/L', 0.4, 4.0, 0.01, 50);
            await insertRange('Thyroid', 't3', 'ng/dL', 80, 200, 40, 400);
            await insertRange('Thyroid', 't4', 'µg/dL', 4.5, 12.5, 1.0, 25.0);

            console.log('   ✅ 22 reference ranges seeded');
        } else {
            console.log('\n4️⃣ Reference ranges already exist (' + existingRanges.rows[0].cnt + ' rows)');
        }

        // 5. Generate barcodes for existing orders
        console.log('\n5️⃣ Generating barcodes for existing orders...');
        const updated = await client.query(`
            UPDATE lab_orders 
            SET barcode = 'LAB' || LPAD(id::text, 8, '0')
            WHERE barcode IS NULL
            RETURNING id
        `);
        console.log(`   ✅ Updated ${updated.rowCount} orders with barcodes`);

        console.log('\n' + '='.repeat(40));
        console.log('🎉 Migrations Complete!\n');

    } catch (error) {
        console.error('\n❌ Migration Error:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
