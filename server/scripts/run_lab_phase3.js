// Lab Dashboard Phase 3 Database Migrations
// Run: node run_lab_phase3.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: String(process.env.DB_PASSWORD || 'password'),
    port: process.env.DB_PORT || 5432,
});

async function runMigrations() {
    const client = await pool.connect();

    try {
        console.log('\n🧪 Lab Dashboard Phase 3 Migrations\n');
        console.log('='.repeat(50));

        // 1. Create lab_reagents table
        console.log('\n1️⃣ Creating lab_reagents table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_reagents (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                catalog_number VARCHAR(50),
                manufacturer VARCHAR(100),
                current_stock INTEGER DEFAULT 0,
                min_stock_level INTEGER DEFAULT 10,
                unit VARCHAR(20) DEFAULT 'units',
                expiry_date DATE,
                storage_location VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ lab_reagents ready');

        // 2. Create reagent_usage_log table
        console.log('\n2️⃣ Creating reagent_usage_log table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS reagent_usage_log (
                id SERIAL PRIMARY KEY,
                reagent_id INTEGER REFERENCES lab_reagents(id),
                quantity_used INTEGER NOT NULL,
                used_by INTEGER,
                lab_request_id INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ reagent_usage_log ready');

        // 3. Create lab_qc_materials table
        console.log('\n3️⃣ Creating lab_qc_materials table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_qc_materials (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                lot_number VARCHAR(50),
                test_type_id INTEGER,
                target_value DECIMAL(10,2),
                sd_value DECIMAL(10,2),
                expiry_date DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ lab_qc_materials ready');

        // 4. Create lab_qc_results table
        console.log('\n4️⃣ Creating lab_qc_results table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_qc_results (
                id SERIAL PRIMARY KEY,
                qc_material_id INTEGER REFERENCES lab_qc_materials(id),
                value DECIMAL(10,2) NOT NULL,
                performed_by INTEGER,
                status VARCHAR(20) DEFAULT 'pending',
                westgard_rule VARCHAR(30),
                deviation_sd DECIMAL(5,2),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ lab_qc_results ready');

        // 5. Create lab_report_tokens table
        console.log('\n5️⃣ Creating lab_report_tokens table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_report_tokens (
                id SERIAL PRIMARY KEY,
                lab_request_id INTEGER,
                token VARCHAR(64) UNIQUE NOT NULL,
                expires_at TIMESTAMP,
                accessed_count INTEGER DEFAULT 0,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_token ON lab_report_tokens(token)`);
        console.log('   ✅ lab_report_tokens ready');

        // 6. Create delta_check_rules table
        console.log('\n6️⃣ Creating delta_check_rules table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS delta_check_rules (
                id SERIAL PRIMARY KEY,
                test_type_id INTEGER,
                parameter VARCHAR(50),
                max_percent_change DECIMAL(5,2),
                max_absolute_change DECIMAL(10,2),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ delta_check_rules ready');

        // 7. Seed sample reagents
        console.log('\n7️⃣ Seeding sample reagents...');
        const reagentCheck = await client.query('SELECT COUNT(*) FROM lab_reagents');
        if (parseInt(reagentCheck.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO lab_reagents (name, catalog_number, manufacturer, current_stock, min_stock_level, unit, expiry_date, storage_location) VALUES
                ('Complete Blood Count Reagent', 'CBC-001', 'Sysmex', 150, 50, 'tests', NOW() + INTERVAL '6 months', 'Hematology Lab'),
                ('Glucose Reagent', 'GLU-002', 'Roche', 200, 75, 'tests', NOW() + INTERVAL '4 months', 'Biochemistry Lab'),
                ('Creatinine Reagent', 'CRE-003', 'Beckman', 100, 30, 'tests', NOW() + INTERVAL '3 months', 'Biochemistry Lab'),
                ('Lipid Panel Reagent', 'LIP-004', 'Abbott', 80, 25, 'tests', NOW() + INTERVAL '5 months', 'Biochemistry Lab'),
                ('TSH Reagent', 'TSH-005', 'Siemens', 60, 20, 'tests', NOW() + INTERVAL '2 months', 'Immunology Lab'),
                ('HbA1c Reagent', 'HBA-006', 'Bio-Rad', 120, 40, 'tests', NOW() + INTERVAL '7 months', 'Diabetes Lab'),
                ('Electrolyte Reagent Pack', 'ELE-007', 'Roche', 90, 35, 'packs', NOW() + INTERVAL '4 months', 'Biochemistry Lab'),
                ('Liver Function Reagent', 'LFT-008', 'Beckman', 70, 25, 'tests', NOW() + INTERVAL '5 months', 'Biochemistry Lab')
            `);
            console.log('   ✅ 8 sample reagents seeded');
        } else {
            console.log('   ⏭️ Reagents already exist');
        }

        // 8. Seed QC materials
        console.log('\n8️⃣ Seeding QC materials...');
        const qcCheck = await client.query('SELECT COUNT(*) FROM lab_qc_materials');
        if (parseInt(qcCheck.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO lab_qc_materials (name, lot_number, target_value, sd_value, expiry_date) VALUES
                ('CBC Normal Control', 'QC-CBC-N-2024', 14.5, 0.5, NOW() + INTERVAL '3 months'),
                ('CBC Abnormal Control', 'QC-CBC-A-2024', 8.0, 0.4, NOW() + INTERVAL '3 months'),
                ('Chemistry Normal Control', 'QC-CHEM-N-2024', 100.0, 5.0, NOW() + INTERVAL '4 months'),
                ('Chemistry Abnormal Control', 'QC-CHEM-A-2024', 250.0, 10.0, NOW() + INTERVAL '4 months')
            `);
            console.log('   ✅ 4 QC materials seeded');
        } else {
            console.log('   ⏭️ QC materials already exist');
        }

        // 9. Seed delta check rules
        console.log('\n9️⃣ Seeding delta check rules...');
        const deltaCheck = await client.query('SELECT COUNT(*) FROM delta_check_rules');
        if (parseInt(deltaCheck.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO delta_check_rules (parameter, max_percent_change, max_absolute_change) VALUES
                ('Hemoglobin', 25.0, 3.0),
                ('Creatinine', 50.0, 1.5),
                ('Potassium', 20.0, 1.0),
                ('Sodium', 5.0, 10.0),
                ('Glucose', 100.0, NULL),
                ('Platelets', 50.0, 100000)
            `);
            console.log('   ✅ 6 delta check rules seeded');
        } else {
            console.log('   ⏭️ Delta check rules already exist');
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 Phase 3 Migrations Complete!\n');

        // Summary
        const tables = await client.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('lab_reagents', 'reagent_usage_log', 'lab_qc_materials', 'lab_qc_results', 'lab_report_tokens', 'delta_check_rules')
        `);
        console.log(`📊 Created ${tables.rowCount} new tables\n`);

    } catch (error) {
        console.error('\n❌ Migration Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
