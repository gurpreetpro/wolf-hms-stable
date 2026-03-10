/**
 * Diagnose Local and Cloud Inventory Structure
 * Compares schema and data counts between environments
 */

require('dotenv').config();
const pool = require('./config/db');

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';

async function diagnose() {
    console.log('🔍 WOLF HMS LOCAL VS CLOUD INVENTORY ANALYSIS\n');
    console.log('='.repeat(60));

    // 1. Check Local Schema
    console.log('\n📊 LOCAL DATABASE INVENTORY STRUCTURE\n');
    
    try {
        // Check if inventory table exists
        const inventoryCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'inventory'
            )
        `);
        
        const inventoryItemsCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'inventory_items'
            )
        `);
        
        console.log(`inventory table exists: ${inventoryCheck.rows[0].exists}`);
        console.log(`inventory_items table exists: ${inventoryItemsCheck.rows[0].exists}`);
        
        // Get schema of whichever exists
        const tableName = inventoryCheck.rows[0].exists ? 'inventory' : 
                         inventoryItemsCheck.rows[0].exists ? 'inventory_items' : null;
        
        if (tableName) {
            console.log(`\n📋 ${tableName} table columns:\n`);
            const schema = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [tableName]);
            
            schema.rows.forEach(col => {
                console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
            
            // Get row count
            const count = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
            console.log(`\n📈 Total rows: ${count.rows[0].count}`);
            
            // Get sample data
            console.log('\n📝 Sample items (first 5):');
            const sample = await pool.query(`SELECT name, stock_quantity, unit_price FROM ${tableName} LIMIT 5`);
            sample.rows.forEach(item => {
                console.log(`  - ${item.name}: ${item.stock_quantity || 'N/A'} units @ ₹${item.unit_price || 'N/A'}`);
            });
        }

    } catch (err) {
        console.error('❌ Local DB Error:', err.message);
    }

    // 2. Check Cloud Schema via API
    console.log('\n' + '='.repeat(60));
    console.log('\n☁️ CLOUD DATABASE INVENTORY STRUCTURE\n');
    
    try {
        // Query cloud for inventory schema
        const schemaQuery = `
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name IN ('inventory', 'inventory_items')
            ORDER BY table_name, ordinal_position
        `;
        
        const response = await fetch(`${CLOUD_URL}/api/sync/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: SYNC_SECRET, sql: schemaQuery })
        });
        
        const result = await response.json();
        
        if (result.success && result.rows) {
            console.log('📋 Cloud inventory columns:\n');
            result.rows.forEach(col => {
                console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
            
            // Get cloud count
            const countResponse = await fetch(`${CLOUD_URL}/api/sync/sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    secret: SYNC_SECRET, 
                    sql: `SELECT 
                        (SELECT COUNT(*) FROM inventory) as inventory_count,
                        (SELECT COUNT(*) FROM inventory_items) as inventory_items_count`
                })
            });
            
            const countResult = await countResponse.json();
            if (countResult.success && countResult.rows[0]) {
                console.log(`\n📈 Cloud inventory count: ${countResult.rows[0].inventory_count || 'N/A'}`);
                console.log(`📈 Cloud inventory_items count: ${countResult.rows[0].inventory_items_count || 'N/A'}`);
            }

        } else {
            console.log('Could not fetch cloud schema:', result.message);
        }

    } catch (err) {
        console.error('❌ Cloud API Error:', err.message);
    }

    // Cleanup
    await pool.end();
    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnosis complete\n');
}

diagnose();
