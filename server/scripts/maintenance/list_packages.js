const { pool } = require('./db');

async function listPackages() {
    try {
        const res = await pool.query('SELECT name FROM lab_packages');
        console.log('📦 Packages:', res.rows.map(r => r.name));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listPackages();
