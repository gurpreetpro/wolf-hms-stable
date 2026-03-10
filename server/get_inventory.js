const pool = require('./config/db');

async function getInventory() {
    try {
        const res = await pool.query('SELECT * FROM inventory_items');
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getInventory();
