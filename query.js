const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'hospital_db',
    user: 'postgres',
    password: 'Hospital456!'
});

pool.query("SELECT id, username, role FROM users WHERE username ILIKE '%guard%' OR role = 'security_guard'")
    .then(r => { 
        console.log(JSON.stringify(r.rows, null, 2)); 
        pool.end(); 
    })
    .catch(e => { 
        console.error('Error:', e.message); 
        pool.end(); 
    });
