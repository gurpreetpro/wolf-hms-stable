const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'wolf_hms',
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
    port: process.env.DB_PORT || 5432,
});

async function check() {
    try {
        console.log('Checking clinical_alerts table...');
        const res = await pool.query('SELECT count(*) FROM clinical_alerts');
        console.log(`clinical_alerts count: ${res.rows[0].count}`);
        console.log('Table exists and is accessible.');
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err.message);
        if (err.message.includes('does not exist')) {
            console.log('Table missing. Initiating manual creation...');
            await createTable();
        } else {
            process.exit(1);
        }
    }
}

async function createTable() {
    try {
        const sql = `
        CREATE TABLE IF NOT EXISTS clinical_alerts (
            id SERIAL PRIMARY KEY,
            patient_id INT NOT NULL,
            admission_id INT NOT NULL,
            type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            value VARCHAR(50),
            threshold VARCHAR(50),
            is_acknowledged BOOLEAN DEFAULT FALSE,
            acknowledged_by INT,
            acknowledged_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_clinical_alerts_admission ON clinical_alerts(admission_id);
        CREATE INDEX IF NOT EXISTS idx_clinical_alerts_status ON clinical_alerts(is_acknowledged);
        `;
        await pool.query(sql);
        console.log('Table clinical_alerts created manually.');
        process.exit(0);
    } catch (err) {
        console.error('Manual creation failed:', err);
        process.exit(1);
    }
}

check();
