const { Pool } = require('pg');
const pool = new Pool({
    user: 'admin',
    host: '217.216.78.81',
    database: 'wolfhms_db',
    password: 'wolfhms_secure_password',
    port: 5432,
});

async function run() {
    try {
        console.log('Creating tables...');
        await pool.query(`CREATE TABLE IF NOT EXISTS hospital_settings (id SERIAL PRIMARY KEY, key VARCHAR(100) NOT NULL, value TEXT, hospital_id INTEGER, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());`);

        await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hospital_settings_key_hospital_id_unique') THEN ALTER TABLE hospital_settings ADD CONSTRAINT hospital_settings_key_hospital_id_unique UNIQUE (key, hospital_id); END IF; END $$;`);

        await pool.query(`CREATE TABLE IF NOT EXISTS system_logs (id SERIAL PRIMARY KEY, user_id INT, action VARCHAR(100) NOT NULL, entity_type VARCHAR(50), entity_id INT, details JSONB, ip_address VARCHAR(45), timestamp TIMESTAMP DEFAULT NOW());`);

        await pool.query(`CREATE TABLE IF NOT EXISTS admin_audit_log (id SERIAL PRIMARY KEY, hospital_id INT, user_id INT, username VARCHAR(255), role VARCHAR(50), action VARCHAR(100) NOT NULL, entity_type VARCHAR(50) NOT NULL, entity_id INT, entity_name VARCHAR(255), before_data JSONB, after_data JSONB, reason TEXT, ip_address VARCHAR(45), user_agent TEXT, created_at TIMESTAMP DEFAULT NOW());`);

        console.log('Success');
        pool.end();
    } catch (e) { console.error('Error:', e.message); pool.end(); }
}
run();
