const pool = require('../config/db');

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Backing up old lab_parameters...');
        await client.query('DROP TABLE IF EXISTS lab_parameters_backup_2026');
        
        // Check if table exists before renaming
        const tableCheck = await client.query("SELECT to_regclass('public.lab_parameters')");
        if (tableCheck.rows[0].to_regclass) {
             await client.query('ALTER TABLE lab_parameters RENAME TO lab_parameters_backup_2026');
             console.log('Renamed existing lab_parameters to lab_parameters_backup_2026');
        } else {
            console.log('lab_parameters table did not exist, skipping backup.');
        }

        console.log('Creating lab_parameters table...');
        await client.query(`
            CREATE TABLE lab_parameters (
                id SERIAL PRIMARY KEY,
                test_name VARCHAR(255) NOT NULL,
                param_key VARCHAR(255) NOT NULL,
                param_label VARCHAR(255) NOT NULL,
                param_type VARCHAR(50) DEFAULT 'number',
                unit VARCHAR(50),
                reference_min NUMERIC,
                reference_max NUMERIC,
                reference_text TEXT,
                category VARCHAR(100),
                display_order INTEGER DEFAULT 0,
                is_required BOOLEAN DEFAULT FALSE,
                loinc_code VARCHAR(50),
                critical_low NUMERIC,
                critical_high NUMERIC,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(test_name, param_key)
            )
        `);

        console.log('Creating instrument_test_mapping table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS instrument_test_mapping (
                id SERIAL PRIMARY KEY,
                manufacturer VARCHAR(100) NOT NULL,
                model VARCHAR(100) NOT NULL,
                instrument_code VARCHAR(100) NOT NULL,
                wolf_param_key VARCHAR(100) NOT NULL,
                wolf_test_name VARCHAR(255) NOT NULL,
                unit_conversion JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(manufacturer, model, instrument_code)
            )
        `);

        // Seed some basic data so it's not empty and we can verify it works
        console.log('Seeding initial data...');
        await client.query(`
            INSERT INTO lab_parameters (test_name, param_key, param_label, category, display_order, unit, reference_min, reference_max) VALUES 
            ('CBC', 'hemoglobin', 'Hemoglobin', 'Hematology', 1, 'g/dL', 13.5, 17.5),
            ('CBC', 'wbc', 'White Blood Cells', 'Hematology', 2, 'x10^3/uL', 4.5, 11.0),
            ('CBC', 'rbc', 'Red Blood Cells', 'Hematology', 3, 'x10^6/uL', 4.5, 5.9),
            ('CBC', 'platelets', 'Platelet Count', 'Hematology', 4, 'x10^3/uL', 150, 450),
            ('Lipid Profile', 'cholesterol', 'Total Cholesterol', 'Biochemistry', 1, 'mg/dL', 0, 200),
            ('Lipid Profile', 'triglycerides', 'Triglycerides', 'Biochemistry', 2, 'mg/dL', 0, 150),
            ('Lipid Profile', 'hdl', 'HDL Cholesterol', 'Biochemistry', 3, 'mg/dL', 40, 60),
            ('Lipid Profile', 'ldl', 'LDL Cholesterol', 'Biochemistry', 4, 'mg/dL', 0, 100)
            ON CONFLICT (test_name, param_key) DO NOTHING
        `);

        await client.query('COMMIT');
        console.log('Schema fixed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error fixing schema:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
