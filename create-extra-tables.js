const axios = require('axios');

const url = 'https://wolfhms-fdurncganq-el.a.run.app/api/health/exec-sql';

const sql = `
    CREATE TABLE IF NOT EXISTS wards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        type VARCHAR(50),
        hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
        total_beds INTEGER DEFAULT 0,
        occupied_beds INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50),
        hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100),
        value TEXT,
        hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(key, hospital_id)
    );
`;

axios.post(url, {
    setupKey: 'WolfSetup2024!',
    sql: sql
})
.then(res => {
    console.log('Tables Created:', JSON.stringify(res.data, null, 2));
})
.catch(err => {
    console.error('Error:', err.response ? err.response.data : err.message);
});
