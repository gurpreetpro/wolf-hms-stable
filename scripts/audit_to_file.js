const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432,
});

async function audit() {
    let output = '# 🔐 Local Credentials Audit\n\n';
    try {
        const hospitals = await pool.query('SELECT id, name, code FROM hospitals ORDER BY id');
        output += '## 🏥 Hospitals\n';
        hospitals.rows.forEach(h => {
            output += `- **ID ${h.id}:** ${h.name} (Code: \`${h.code}\`)\n`;
        });

        const users = await pool.query(`
            SELECT u.id, u.username, u.role, h.name as hospital_name 
            FROM users u 
            LEFT JOIN hospitals h ON u.hospital_id = h.id 
            ORDER BY u.hospital_id, u.role
        `);

        output += '\n## 👤 Users\n';
        output += '| Username | Role | Hospital | ID |\n';
        output += '|---|---|---|---|\n';
        users.rows.forEach(u => {
            output += `| **${u.username}** | ${u.role} | ${u.hospital_name || 'None'} | ${u.id} |\n`;
        });
        
        output += `\n**Total Users:** ${users.rows.length}\n`;
        
        fs.writeFileSync('credentials_audit.md', output);
        console.log('Audit written to credentials_audit.md');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

audit();
