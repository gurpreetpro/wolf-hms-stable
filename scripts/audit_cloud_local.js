/**
 * Wolf HMS - Cloud vs Local Database Audit Tool
 * 
 * This script compares:
 * - All tables
 * - All columns per table
 * - Applied migrations
 * - Seed data row counts
 * 
 * Outputs a comprehensive markdown report
 */

const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// =============================================
// CONFIGURATION
// =============================================

const CLOUD_EXEC_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql';
const CLOUD_KEY = 'WolfSetup2024!';

const LOCAL_DB_CONFIG = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Hospital456!',
    database: 'hospital_db'
};

// Tables to check for seed data counts
const SEED_DATA_TABLES = [
    'hospitals', 'users', 'patients', 'lab_test_types', 'lab_test_categories',
    'inventory_items', 'wards', 'beds', 'departments', 'medicines',
    'lab_reagents', 'lab_qc_materials', 'ward_consumables', 'equipment_types'
];

// =============================================
// HELPER FUNCTIONS
// =============================================

async function queryCloud(sql) {
    try {
        const res = await axios.post(CLOUD_EXEC_URL, {
            setupKey: CLOUD_KEY,
            sql: sql
        });
        return res.data.success ? res.data.rows : [];
    } catch (e) {
        console.error('Cloud query failed:', e.message);
        return [];
    }
}

async function queryLocal(pool, sql) {
    try {
        const res = await pool.query(sql);
        return res.rows;
    } catch (e) {
        console.error('Local query failed:', e.message);
        return [];
    }
}

// =============================================
// AUDIT FUNCTIONS
// =============================================

async function getTableList(source, pool = null) {
    const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`;
    if (source === 'cloud') {
        return (await queryCloud(sql)).map(r => r.table_name);
    } else {
        return (await queryLocal(pool, sql)).map(r => r.table_name);
    }
}

async function getTableColumns(source, tableName, pool = null) {
    const sql = `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY ordinal_position`;
    if (source === 'cloud') {
        return await queryCloud(sql);
    } else {
        return await queryLocal(pool, sql);
    }
}

async function getMigrations(source, pool = null) {
    const sql = `SELECT name FROM _migrations ORDER BY id`;
    if (source === 'cloud') {
        return (await queryCloud(sql)).map(r => r.name);
    } else {
        return (await queryLocal(pool, sql)).map(r => r.name);
    }
}

async function getRowCount(source, tableName, pool = null) {
    const sql = `SELECT count(*) as count FROM ${tableName}`;
    try {
        if (source === 'cloud') {
            const rows = await queryCloud(sql);
            return rows.length > 0 ? parseInt(rows[0].count) : 0;
        } else {
            const rows = await queryLocal(pool, sql);
            return rows.length > 0 ? parseInt(rows[0].count) : 0;
        }
    } catch (e) {
        return -1; // Table might not exist
    }
}

// =============================================
// COMPARISON LOGIC
// =============================================

function compareTables(cloudTables, localTables) {
    const missingInCloud = localTables.filter(t => !cloudTables.includes(t));
    const extraInCloud = cloudTables.filter(t => !localTables.includes(t));
    const common = localTables.filter(t => cloudTables.includes(t));
    return { missingInCloud, extraInCloud, common };
}

function compareMigrations(cloudMigrations, localFiles) {
    const notApplied = localFiles.filter(f => !cloudMigrations.includes(f));
    const extraApplied = cloudMigrations.filter(m => !localFiles.includes(m));
    return { notApplied, extraApplied };
}

function compareColumns(cloudCols, localCols) {
    const cloudColNames = cloudCols.map(c => c.column_name);
    const localColNames = localCols.map(c => c.column_name);
    
    const missingInCloud = localColNames.filter(c => !cloudColNames.includes(c));
    const extraInCloud = cloudColNames.filter(c => !localColNames.includes(c));
    
    return { missingInCloud, extraInCloud };
}

// =============================================
// REPORT GENERATION
// =============================================

async function generateReport() {
    console.log('🔍 Starting Cloud vs Local Audit...\n');
    
    const localPool = new Pool(LOCAL_DB_CONFIG);
    
    let report = `# Cloud vs Local Database Audit Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString('en-IN')}\n\n`;
    report += `---\n\n`;
    
    // =============================================
    // SECTION 1: TABLE COMPARISON
    // =============================================
    
    console.log('📊 Comparing tables...');
    const cloudTables = await getTableList('cloud');
    const localTables = await getTableList('local', localPool);
    
    const tableComparison = compareTables(cloudTables, localTables);
    
    report += `## 1. Table Comparison\n\n`;
    report += `| Metric | Count |\n|--------|-------|\n`;
    report += `| Cloud Tables | ${cloudTables.length} |\n`;
    report += `| Local Tables | ${localTables.length} |\n`;
    report += `| Common | ${tableComparison.common.length} |\n`;
    report += `| Missing in Cloud | ${tableComparison.missingInCloud.length} |\n`;
    report += `| Extra in Cloud | ${tableComparison.extraInCloud.length} |\n\n`;
    
    if (tableComparison.missingInCloud.length > 0) {
        report += `### ❌ Tables Missing in Cloud\n\n`;
        report += `| Table Name |\n|------------|\n`;
        tableComparison.missingInCloud.forEach(t => {
            report += `| \`${t}\` |\n`;
        });
        report += `\n`;
    }
    
    if (tableComparison.extraInCloud.length > 0) {
        report += `### ⚠️ Tables Extra in Cloud (not in Local)\n\n`;
        report += `| Table Name |\n|------------|\n`;
        tableComparison.extraInCloud.forEach(t => {
            report += `| \`${t}\` |\n`;
        });
        report += `\n`;
    }
    
    // =============================================
    // SECTION 2: COLUMN COMPARISON (for common tables)
    // =============================================
    
    console.log('📋 Comparing columns...');
    report += `## 2. Column Comparison\n\n`;
    
    let columnIssues = [];
    
    for (const table of tableComparison.common.slice(0, 50)) { // Limit to first 50 tables
        const cloudCols = await getTableColumns('cloud', table);
        const localCols = await getTableColumns('local', table, localPool);
        
        const colComparison = compareColumns(cloudCols, localCols);
        
        if (colComparison.missingInCloud.length > 0 || colComparison.extraInCloud.length > 0) {
            columnIssues.push({
                table,
                missingInCloud: colComparison.missingInCloud,
                extraInCloud: colComparison.extraInCloud
            });
        }
    }
    
    if (columnIssues.length === 0) {
        report += `✅ All checked tables have matching columns.\n\n`;
    } else {
        report += `Found **${columnIssues.length}** tables with column mismatches:\n\n`;
        
        columnIssues.forEach(issue => {
            report += `### \`${issue.table}\`\n\n`;
            if (issue.missingInCloud.length > 0) {
                report += `**Missing in Cloud:** ${issue.missingInCloud.map(c => `\`${c}\``).join(', ')}\n\n`;
            }
            if (issue.extraInCloud.length > 0) {
                report += `**Extra in Cloud:** ${issue.extraInCloud.map(c => `\`${c}\``).join(', ')}\n\n`;
            }
        });
    }
    
    // =============================================
    // SECTION 3: MIGRATION COMPARISON
    // =============================================
    
    console.log('📁 Comparing migrations...');
    report += `## 3. Migration Comparison\n\n`;
    
    const cloudMigrations = await getMigrations('cloud');
    const localMigrations = await getMigrations('local', localPool);
    
    // Also get migration files from disk
    const migrationDir = path.join(__dirname, '..', 'server', 'migrations');
    let migrationFiles = [];
    try {
        migrationFiles = fs.readdirSync(migrationDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
    } catch (e) {
        migrationFiles = [];
    }
    
    const migrationComparison = compareMigrations(cloudMigrations, migrationFiles);
    
    report += `| Metric | Count |\n|--------|-------|\n`;
    report += `| Migration Files (Disk) | ${migrationFiles.length} |\n`;
    report += `| Applied to Cloud | ${cloudMigrations.length} |\n`;
    report += `| Applied to Local | ${localMigrations.length} |\n`;
    report += `| Not Applied to Cloud | ${migrationComparison.notApplied.length} |\n\n`;
    
    if (migrationComparison.notApplied.length > 0) {
        report += `### ❌ Migrations NOT Applied to Cloud\n\n`;
        report += `| Migration File |\n|----------------|\n`;
        migrationComparison.notApplied.slice(0, 20).forEach(m => {
            report += `| \`${m}\` |\n`;
        });
        if (migrationComparison.notApplied.length > 20) {
            report += `| ... and ${migrationComparison.notApplied.length - 20} more |\n`;
        }
        report += `\n`;
    }
    
    // =============================================
    // SECTION 4: SEED DATA COMPARISON
    // =============================================
    
    console.log('📈 Comparing seed data...');
    report += `## 4. Seed Data Row Counts\n\n`;
    report += `| Table | Cloud | Local | Diff |\n|-------|-------|-------|------|\n`;
    
    for (const table of SEED_DATA_TABLES) {
        const cloudCount = await getRowCount('cloud', table);
        const localCount = await getRowCount('local', table, localPool);
        
        const diff = cloudCount - localCount;
        const diffStr = diff === 0 ? '✅' : (diff > 0 ? `+${diff}` : `${diff}`);
        const cloudStr = cloudCount === -1 ? '❌ N/A' : cloudCount;
        const localStr = localCount === -1 ? '❌ N/A' : localCount;
        
        report += `| \`${table}\` | ${cloudStr} | ${localStr} | ${diffStr} |\n`;
    }
    
    report += `\n`;
    
    // =============================================
    // CLEANUP
    // =============================================
    
    await localPool.end();
    
    console.log('\n✅ Audit complete!');
    
    return report;
}

// =============================================
// MAIN
// =============================================

(async () => {
    try {
        const report = await generateReport();
        
        // Save report
        const reportPath = path.join(__dirname, '..', '.gemini', 'antigravity', 'brain', 'd26817ef-7212-4f64-9da0-474647f1a6eb', 'cloud_local_audit.md');
        
        // Ensure directory exists
        const dir = path.dirname(reportPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, report);
        console.log(`\n📄 Report saved to: ${reportPath}`);
        
        // Also print to console
        console.log('\n' + '='.repeat(60) + '\n');
        console.log(report);
        
    } catch (e) {
        console.error('Audit failed:', e);
    }
})();
