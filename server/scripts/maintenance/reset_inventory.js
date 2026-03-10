const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function resetInventory() {
    try {
        console.log('📦 Resetting pharmacy inventory...');
        await pool.query('UPDATE inventory_items SET stock_quantity = 1000');
        console.log('✅ Pharmacy inventory reset to 1000 units per item');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

resetInventory();
