// Quick query to show hospitals
const pool = require('./config/db');

async function main() {
    try {
        console.log('Querying hospitals...');
        const res = await pool.query('SELECT id, name, code, subdomain, status FROM hospitals ORDER BY id');
        console.log('\\n=== HOSPITALS ===');
        console.table(res.rows);
        
        console.log('\\n=== PATIENT COUNT ===');
        const patients = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN name LIKE \'Test_%\' THEN 1 END) as demo FROM patients');
        console.log('Total:', patients.rows[0].total, '| Demo:', patients.rows[0].demo);
        
        console.log('\\n=== ACTIVE ADMISSIONS ===');
        const admissions = await pool.query("SELECT COUNT(*) as count FROM admissions WHERE status != 'Discharged'");
        console.log('Active:', admissions.rows[0].count);
        
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

main();
