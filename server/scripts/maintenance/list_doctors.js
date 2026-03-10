const { pool } = require('./db');

async function listDoctors() {
    const result = await pool.query(`
        SELECT id, name, username, department 
        FROM users 
        WHERE role = 'doctor' AND is_active = true 
        ORDER BY name
    `);
    console.log('=== ALL ACTIVE DOCTORS ===\n');
    result.rows.forEach((d, i) => {
        console.log(`${i+1}. ${d.name} - ${d.department}`);
        console.log(`   ID: ${d.id}, Username: ${d.username}`);
    });
    console.log(`\nTotal: ${result.rows.length} doctors`);
    process.exit();
}
listDoctors();
