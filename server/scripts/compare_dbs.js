const { Pool } = require('pg');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function getLocalData(query) {
    try {
        const res = await pool.query(query);
        return res.rows;
    } catch (e) {
        console.error('Local Error:', e.message);
        return null;
    }
}

async function compare() {
    console.log('🔍 Comparing Local vs Cloud Database...\n');

    let report = '# Local vs Cloud Database Comparison\n\n';
    report += `**Analyzed at**: ${new Date().toISOString()}\n\n`;

    // 1. Get Cloud Status via /api/db-check
    console.log('📡 Fetching Cloud Database Status...');
    let cloudData = null;
    try {
        const res = await axios.get(`${CLOUD_URL}/api/db-check`, { timeout: 15000 });
        cloudData = res.data;
        console.log('✅ Cloud Connection: OK');
    } catch (e) {
        console.error('❌ Cloud Error:', e.message);
        report += '## Cloud Status: ❌ OFFLINE\n\n';
        report += `Error: ${e.message}\n\n`;
    }

    // 2. Get Local Summary
    console.log('📊 Fetching Local Database Stats...');
    const localSummary = {};
    const queries = [
        { name: 'Hospitals', query: 'SELECT COUNT(*) as c FROM hospitals' },
        { name: 'Users', query: 'SELECT COUNT(*) as c FROM users' },
        { name: 'Patients', query: 'SELECT COUNT(*) as c FROM patients' },
        { name: 'Admissions', query: 'SELECT COUNT(*) as c FROM admissions' },
    ];

    for (const q of queries) {
        try {
            const res = await getLocalData(q.query);
            localSummary[q.name] = res ? parseInt(res[0].c) : 'N/A';
        } catch (e) {
            localSummary[q.name] = 'Error';
        }
    }

    // 3. Build Comparison Table
    report += '## Key Data Comparison\n\n';
    report += '| Metric | Local | Cloud | Status |\n';
    report += '|---|---|---|---|\n';

    if (cloudData) {
        report += `| Database Status | Connected | ${cloudData.status} | ${cloudData.status === 'OK' ? '✅' : '⚠️'} |\n`;
        report += `| User Count | ${localSummary['Users']} | ${cloudData.userCount} | ${localSummary['Users'] == cloudData.userCount ? '✅ Synced' : '⚠️ Diff'} |\n`;
        
        // Sample users from cloud
        if (cloudData.sampleUsers && cloudData.sampleUsers.length > 0) {
            report += '\n### Cloud Sample Users\n';
            report += '| Username | Role | Active |\n';
            report += '|---|---|---|\n';
            cloudData.sampleUsers.forEach(u => {
                report += `| ${u.username} | ${u.role} | ${u.is_active} |\n`;
            });
        }
    } else {
        report += '| Database Status | Connected | OFFLINE | ❌ |\n';
        report += `| User Count | ${localSummary['Users']} | N/A | ⚠️ |\n`;
    }

    // 4. Local Summary
    report += '\n## Local Summary\n\n';
    for (const [key, val] of Object.entries(localSummary)) {
        report += `- **${key}**: ${val}\n`;
    }

    // 5. Tables Count
    const tableCountRes = await getLocalData("SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = 'public'");
    const localTableCount = tableCountRes ? tableCountRes[0].c : 'N/A';
    report += `- **Total Tables**: ${localTableCount}\n`;

    // Write Report
    const reportPath = path.join(__dirname, '../../comparison_report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Comparison Report saved to: comparison_report.md`);

    await pool.end();
}

compare().catch(e => {
    console.error('Fatal Error:', e);
    pool.end();
});
