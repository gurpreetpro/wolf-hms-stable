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
    console.log('📊 WOLF HMS - Comprehensive Local Inventory\n');
    console.log('=' .repeat(60));

    let report = '# Wolf HMS - Local System Inventory\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n\n`;

    // ============================================
    // 1. DATABASE INFO
    // ============================================
    report += '---\n## 1. Database Connection\n\n';
    report += `- **Host**: ${process.env.DB_HOST}\n`;
    report += `- **Database**: ${process.env.DB_NAME}\n`;
    report += `- **Port**: ${process.env.DB_PORT}\n\n`;

    // ============================================
    // 2. ALL TABLES WITH ROW COUNTS
    // ============================================
    console.log('📋 Fetching all tables...');
    const tablesRes = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    report += '---\n## 2. Database Tables\n\n';
    report += `**Total Tables**: ${tables.length}\n\n`;
    report += '<details>\n<summary>📋 Click to expand full table list</summary>\n\n';
    report += '| # | Table | Rows |\n|---|---|---|\n';

    let idx = 1;
    for (const table of tables) {
        try {
            const countRes = await pool.query(`SELECT COUNT(*) as c FROM "${table}"`);
            const count = parseInt(countRes.rows[0].c);
            report += `| ${idx++} | ${table} | ${count} |\n`;
        } catch (e) {
            report += `| ${idx++} | ${table} | ERROR |\n`;
        }
    }
    report += '\n</details>\n\n';

    // ============================================
    // 3. KEY TABLE SCHEMAS
    // ============================================
    console.log('📐 Fetching schema for key tables...');
    const keyTables = ['users', 'patients', 'admissions', 'hospitals', 'audit_logs', 'wards', 'beds'];
    
    report += '---\n## 3. Key Table Schemas\n\n';
    
    for (const tbl of keyTables) {
        try {
            const schemaRes = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [tbl]);
            
            if (schemaRes.rows.length > 0) {
                report += `### ${tbl}\n\n`;
                report += '| Column | Type | Nullable | Default |\n|---|---|---|---|\n';
                schemaRes.rows.forEach(col => {
                    report += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || '-'} |\n`;
                });
                report += '\n';
            }
        } catch (e) {
            report += `### ${tbl}\n\n*Table does not exist or error occurred.*\n\n`;
        }
    }

    // ============================================
    // 4. SEED SCRIPTS
    // ============================================
    console.log('🌱 Listing seed scripts...');
    const scriptsDir = path.join(__dirname, '.');
    const allScripts = fs.readdirSync(scriptsDir);
    const seedScripts = allScripts.filter(f => f.startsWith('seed_'));

    report += '---\n## 4. Available Seed Scripts\n\n';
    report += `**Location**: \`server/scripts/\`\n\n`;
    seedScripts.forEach(s => report += `- ${s}\n`);
    report += '\n';

    // ============================================
    // 5. MIGRATION FILES
    // ============================================
    console.log('📁 Listing migration files...');
    const migrationsDir = path.join(__dirname, '../migrations');
    let migrationFiles = [];
    try {
        migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    } catch (e) {
        migrationFiles = [];
    }

    report += '---\n## 5. Database Migrations\n\n';
    report += `**Total Migrations**: ${migrationFiles.length}\n\n`;
    report += '<details>\n<summary>📁 Click to expand migration list</summary>\n\n';
    migrationFiles.forEach((m, i) => report += `${i+1}. ${m}\n`);
    report += '\n</details>\n\n';

    // ============================================
    // 6. KEY DATA SUMMARY
    // ============================================
    console.log('📈 Generating key data summary...');
    report += '---\n## 6. Key Data Summary\n\n';
    
    const summaryQueries = [
        { name: 'Hospitals', query: 'SELECT COUNT(*) as c FROM hospitals' },
        { name: 'Users', query: 'SELECT COUNT(*) as c FROM users' },
        { name: 'Patients', query: 'SELECT COUNT(*) as c FROM patients' },
        { name: 'Admissions', query: 'SELECT COUNT(*) as c FROM admissions' },
        { name: 'Wards', query: 'SELECT COUNT(*) as c FROM wards' },
        { name: 'Beds', query: 'SELECT COUNT(*) as c FROM beds' },
        { name: 'Inventory Items', query: 'SELECT COUNT(*) as c FROM inventory_items' },
        { name: 'Lab Test Types', query: 'SELECT COUNT(*) as c FROM lab_test_types' },
        { name: 'Audit Logs', query: 'SELECT COUNT(*) as c FROM audit_logs' },
    ];

    report += '| Category | Count |\n|---|---|\n';
    for (const sq of summaryQueries) {
        try {
            const res = await pool.query(sq.query);
            report += `| ${sq.name} | ${res.rows[0].c} |\n`;
        } catch (e) {
            report += `| ${sq.name} | N/A |\n`;
        }
    }
    report += '\n';

    // ============================================
    // 7. SAMPLE DATA (First 3 Users)
    // ============================================
    console.log('👤 Fetching sample users...');
    report += '---\n## 7. Sample Users\n\n';
    try {
        const usersRes = await pool.query('SELECT id, username, role, is_active FROM users LIMIT 5');
        report += '| ID | Username | Role | Active |\n|---|---|---|---|\n';
        usersRes.rows.forEach(u => {
            report += `| ${u.id} | ${u.username} | ${u.role} | ${u.is_active} |\n`;
        });
    } catch (e) {
        report += '*Could not fetch users.*\n';
    }
    report += '\n';

    // Write Report
    const reportPath = path.join(__dirname, '../../local_inventory.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Inventory Report saved to: local_inventory.md`);
    console.log('=' .repeat(60));

    await pool.end();
}

main().catch(e => {
    console.error('Fatal Error:', e);
    pool.end();
});
