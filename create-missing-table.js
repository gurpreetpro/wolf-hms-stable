const axios = require('axios');

const url = 'https://wolfhms-fdurncganq-el.a.run.app/api/health/exec-sql';

const sql = `
    CREATE TABLE IF NOT EXISTS terminals (
        id SERIAL PRIMARY KEY,
        hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
        name VARCHAR(100),
        terminal_code VARCHAR(50), 
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
`;

axios.post(url, {
    setupKey: 'WolfSetup2024!',
    sql: sql
})
.then(res => {
    console.log('Table Created:', JSON.stringify(res.data, null, 2));
})
.catch(err => {
    console.error('Error:', err.response ? err.response.data : err.message);
});
