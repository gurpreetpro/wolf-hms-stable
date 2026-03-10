const axios = require('axios');

const url = 'https://wolfhms-fdurncganq-el.a.run.app/api/health/exec-sql';

axios.post(url, {
    setupKey: 'WolfSetup2024!',
    sql: "SELECT u.username, u.hospital_id, h.hospital_name FROM users u LEFT JOIN hospitals h ON u.hospital_id = h.id WHERE u.username = 'developer'"
})
.then(res => {
    console.log('Users found:', JSON.stringify(res.data, null, 2));
    if (res.data.rows && res.data.rows.length > 0) {
        res.data.rows.forEach(u => {
             console.log(`User: ${u.username}, Email: ${u.email}, Password Hash: ${u.password ? (u.password.substring(0, 10) + '...') : 'NULL'}`);
        });
    } else {
        console.log("No user found with that email.");
    }
})
.catch(err => {
    console.error('Error:', err.response ? err.response.data : err.message);
});
