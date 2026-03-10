const axios = require('axios');

const url = 'https://wolfhms-fdurncganq-el.a.run.app/api/health/exec-sql';

const sql = `
    ALTER TABLE wards ADD COLUMN IF NOT EXISTS occupied_beds INTEGER DEFAULT 0;
    ALTER TABLE wards ADD COLUMN IF NOT EXISTS total_beds INTEGER DEFAULT 0;
    ALTER TABLE roles ADD COLUMN IF NOT EXISTS hospital_id UUID;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS hospital_id UUID;
`;

axios.post(url, {
    setupKey: 'WolfSetup2024!',
    sql: sql
})
.then(res => {
    console.log('Columns Added:', JSON.stringify(res.data, null, 2));
})
.catch(err => {
    console.error('Error:', err.response ? err.response.data : err.message);
});
