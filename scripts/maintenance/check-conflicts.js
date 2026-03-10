const axios = require('axios');

const url = 'https://wolfhms-fdurncganq-el.a.run.app/api/health/exec-sql';

const sql = `
    SELECT username, email, role, is_active FROM users WHERE email ILIKE '%gurpreet%' OR username ILIKE '%admin%'
`;

axios.post(url, {
    setupKey: 'WolfSetup2024!',
    sql: sql
})
.then(res => {
    console.log('Check Result:', JSON.stringify(res.data, null, 2));
})
.catch(err => {
    console.error('Error:', err.response ? err.response.data : err.message);
});
