const { pool } = require('../db');

async function run() {
    console.log('🔧 Running Manual Migration...');
    
    try {
        // Create clinical_alerts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clinical_alerts (
                id SERIAL PRIMARY KEY,
                patient_id UUID REFERENCES patients(id),
                admission_id INTEGER REFERENCES admissions(id),
                type VARCHAR(50) NOT NULL,
                category VARCHAR(50) DEFAULT 'clinical',
                title VARCHAR(255) NOT NULL,
                message TEXT,
                details JSONB,
                score INTEGER,
                breakdown JSONB,
                value VARCHAR(100),
                threshold VARCHAR(100),
                source VARCHAR(50) DEFAULT 'Wolf-Sentinel',
                is_acknowledged BOOLEAN DEFAULT FALSE,
                acknowledged_by INTEGER REFERENCES users(id),
                acknowledged_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created clinical_alerts');

        // Indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_clinical_alerts_active ON clinical_alerts(is_acknowledged) WHERE is_acknowledged = FALSE;`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient ON clinical_alerts(patient_id);`);
        console.log('✅ Created Indexes');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

run();
