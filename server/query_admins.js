// Query admin users
const pool = require('./config/db');

async function main() {
    try {
        const res = await pool.query(`
            SELECT u.id, u.username, u.email, u.role, u.hospital_id, h.name as hospital_name 
            FROM users u 
            LEFT JOIN hospitals h ON u.hospital_id = h.id 
            WHERE u.role = 'admin' 
            ORDER BY u.hospital_id
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}
main();
