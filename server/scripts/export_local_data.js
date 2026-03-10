const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

// Tables to export in order (respecting foreign keys)
const TABLES = [
    'hospitals',
    'users', 
    'patients',
    'wards',
    'beds',
    'admissions',
    'ot_rooms',
    'surgeries',
    'equipment_types',
    'ward_consumables',
    'ward_service_charges',
    'hospital_settings'
];

async function exportLocalData() {
    console.log('=== EXPORTING LOCAL DATABASE TO SQL ===\n');
    
    let output = `-- Wolf HMS Local Data Export
-- Generated: ${new Date().toISOString()}
-- Strategy: REPLACE (Clean Slate)

-- IMPORTANT: Run in order!

`;
    
    try {
        for (const table of TABLES) {
            console.log(`Exporting ${table}...`);
            
            try {
                // Check if table exists
                const checkTable = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [table]);
                
                if (!checkTable.rows[0].exists) {
                    console.log(`  ⚠️ Table ${table} does not exist, skipping`);
                    continue;
                }
                
                // Get row count
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                const count = parseInt(countResult.rows[0].count);
                
                if (count === 0) {
                    console.log(`  ⚠️ Table ${table} is empty, skipping`);
                    continue;
                }
                
                // Add TRUNCATE
                output += `-- ${table} (${count} rows)\n`;
                output += `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;\n`;
                
                // Get all rows
                const data = await pool.query(`SELECT * FROM ${table}`);
                
                // Get column names
                const columns = Object.keys(data.rows[0]);
                
                // Generate INSERT statements
                for (const row of data.rows) {
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                        if (typeof val === 'number') return val;
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                        return `'${String(val).replace(/'/g, "''")}'`;
                    });
                    
                    output += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
                }
                
                output += '\n';
                console.log(`  ✅ Exported ${count} rows`);
                
            } catch (tableErr) {
                console.log(`  ❌ Error: ${tableErr.message.split('\n')[0]}`);
            }
        }
        
        // Write to file
        const outputPath = path.join(__dirname, '../migrations/data_export.sql');
        fs.writeFileSync(outputPath, output);
        console.log(`\n✅ Exported to: ${outputPath}`);
        console.log(`   Total size: ${(output.length / 1024).toFixed(2)} KB`);
        
        // Also create a JSON version for API upload
        const jsonPath = path.join(__dirname, '../migrations/data_export.json');
        fs.writeFileSync(jsonPath, JSON.stringify({ sql: output }, null, 2));
        console.log(`   JSON version: ${jsonPath}`);
        
    } catch (err) {
        console.error('Export failed:', err.message);
    } finally {
        pool.end();
    }
}

exportLocalData();
