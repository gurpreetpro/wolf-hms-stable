const axios = require('axios');

const url = 'https://wolfhms-fdurncganq-el.a.run.app/api/health/exec-sql';

const sql = `
    SELECT 'wards' as t, count(*) FROM wards
    UNION ALL
    SELECT 'roles' as t, count(*) FROM roles
    UNION ALL
    SELECT 'settings' as t, count(*) FROM settings
`;

axios.post(url, {
    setupKey: 'WolfSetup2024!',
    sql: sql
})
.then(res => {
    console.log('Columns:', JSON.stringify(res.data.rows, null, 2));
})
.catch(err => {
    console.error('Error:', err.response ? err.response.data : err.message);
});
