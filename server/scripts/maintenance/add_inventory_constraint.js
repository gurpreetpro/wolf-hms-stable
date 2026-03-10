const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function checkAndAddIndex() {
    try {
        // Check existing indexes
        const indexes = await pool.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'inventory_items'`);
        console.log('Existing indexes:', indexes.rows);

        // Check if unique constraint exists
        const hasUnique = indexes.rows.some(i => i.indexdef.includes('UNIQUE') && i.indexdef.includes('name'));

        if (!hasUnique) {
            console.log('Adding unique constraint on name...');
            // First remove duplicates if any
            await pool.query(`
                DELETE FROM inventory_items a USING inventory_items b 
                WHERE a.id < b.id AND a.name = b.name
            `);
            // Now add unique constraint
            await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_name_unique ON inventory_items(name)`);
            console.log('✅ Unique index added');
        } else {
            console.log('✅ Unique constraint already exists');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkAndAddIndex();
