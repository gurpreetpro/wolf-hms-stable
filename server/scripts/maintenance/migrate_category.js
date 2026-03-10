const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Migrating: Adding category to inventory_items...');

        await pool.query("ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category VARCHAR(100)");
        await pool.query("UPDATE inventory_items SET category = 'General' WHERE category IS NULL");
        await pool.query("UPDATE inventory_items SET category = 'Analgesic' WHERE name ILIKE '%Paracetamol%'");
        await pool.query("UPDATE inventory_items SET category = 'Antibiotic' WHERE name ILIKE '%Amoxicillin%'");

        console.log('✅ Migration Complete');
        process.exit();
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    }
}

migrate();
