const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Migrating: Expanding inventory_items (Phase 4.2)...');

        const updates = [
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS generic_name VARCHAR(100)",
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100)",
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(20) DEFAULT 'General'", // H, H1, X, General
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS rack_location VARCHAR(50)",
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2)",
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS mrp DECIMAL(10, 2)",
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS gst_percent DECIMAL(5, 2) DEFAULT 0.00",
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20)"
        ];

        for (const query of updates) {
            await pool.query(query);
            console.log(`Executed: ${query.split('ADD COLUMN')[1]}`); // Log expanded column
        }

        console.log('✅ Migration Phase 4.2 Complete');
        process.exit();
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    }
}

migrate();
