// Cloud database connection (for running fix scripts against Cloud SQL)
const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,  // Cloud SQL Proxy port
    database: 'hospital_db',
    user: 'postgres',
    password: 'WolfCloud2024!'
});

module.exports = pool;
