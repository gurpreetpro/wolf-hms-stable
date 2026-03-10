// Quick script to check database users
const pool = require('./config/db');

async function checkUsers() {
    try {
        console.log('Connecting to database...');

        // Check users
        const result = await pool.query('SELECT id, username, email, role FROM users LIMIT 20');

        console.log('\n=== USERS IN DATABASE ===\n');
        if (result.rows.length === 0) {
            console.log('⚠️ NO USERS FOUND IN DATABASE!');
        } else {
            result.rows.forEach(u => {
                console.log(`  ${u.username.padEnd(20)} | ${u.email.padEnd(30)} | ${u.role}`);
            });
        }
        console.log(`\nTotal: ${result.rows.length} users`);

        process.exit(0);
    } catch (err) {
        console.error('Database Error:', err.message);
        process.exit(1);
    }
}

checkUsers();
