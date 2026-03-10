const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function main() {
    console.log('📊 Generating Local Database Report...\n');

    // 1. Get Tables
    const tablesRes = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    let report = '# Local Database Report - Wolf HMS\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n\n`;
    report += `**Total Tables**: ${tables.length}\n\n`;

    // 2. Get Row Counts
    report += '## Tables & Row Counts\n\n';
    report += '| Table | Rows |\n';
    report += '|---|---|\n';

    for (const table of tables) {
        try {
            const countRes = await pool.query(`SELECT COUNT(*) as c FROM "${table}"`);
            const count = parseInt(countRes.rows[0].c);
            report += `| ${table} | ${count} |\n`;
        } catch (e) {
            report += `| ${table} | ERROR |\n`;
        }
    }

    // 3. List Seed Scripts
    report += '\n## Available Seed Scripts\n\n';
    const scriptsDir = path.join(__dirname, '.');
    const seedScripts = fs.readdirSync(scriptsDir).filter(f => f.startsWith('seed_'));
    seedScripts.forEach(s => report += `- ${s}\n`);

    // 4. Key Data Summary (Users, Hospitals, Patients)
    report += '\n## Key Data Summary\n\n';
    const summaryQueries = [
        { name: 'Hospitals', query: 'SELECT COUNT(*) as c FROM hospitals' },
        { name: 'Users', query: 'SELECT COUNT(*) as c FROM users' },
        { name: 'Patients', query: 'SELECT COUNT(*) as c FROM patients' },
        { name: 'Admissions', query: 'SELECT COUNT(*) as c FROM admissions' },
        { name: 'Inventory Items', query: 'SELECT COUNT(*) as c FROM inventory_items' },
        { name: 'Lab Tests', query: 'SELECT COUNT(*) as c FROM lab_tests' },
    ];

    for (const sq of summaryQueries) {
        try {
            const res = await pool.query(sq.query);
            report += `- **${sq.name}**: ${res.rows[0].c}\n`;
        } catch (e) {
            report += `- **${sq.name}**: N/A\n`;
        }
    }

    // Write Report
    const reportPath = path.join(__dirname, '../../local_db_report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Report saved to: ${reportPath}`);

    await pool.end();
}

main().catch(e => {
    console.error('Error:', e);
    pool.end();
});
