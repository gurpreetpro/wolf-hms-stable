const pool = require('../config/db');

async function fixSchema() {
    try {
        console.log('Creating security_visitors table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS security_visitors (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                contact_number VARCHAR(50),
                visitor_type VARCHAR(50),
                purpose TEXT,
                host_id INTEGER REFERENCES users(id),
                patient_id UUID REFERENCES patients(id),
                check_in_time TIMESTAMP DEFAULT NOW(),
                check_out_time TIMESTAMP,
                status VARCHAR(50) DEFAULT 'Checked In',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ security_visitors created.');

        console.log('Creating security_incidents table (if missing)...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS security_incidents (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                type VARCHAR(50),
                severity VARCHAR(50),
                location VARCHAR(255),
                description TEXT,
                media_urls TEXT[],
                reporter_id INTEGER REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'Open',
                ai_analysis TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ security_incidents created.');

    } catch (err) {
        console.error('Schema Fix Failed:', err);
    } finally {
        pool.end();
    }
}

fixSchema();
