const { pool } = require('./db');

async function fixBeds() {
    try {
        // Add missing columns to beds table
        await pool.query("ALTER TABLE beds ADD COLUMN IF NOT EXISTS bed_type VARCHAR(50) DEFAULT 'Standard'");
        console.log('✅ Added bed_type column');
        
        await pool.query("ALTER TABLE beds ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Available'");
        console.log('✅ Added status column');
        
        await pool.query("ALTER TABLE beds ADD COLUMN IF NOT EXISTS bed_number VARCHAR(50)");
        console.log('✅ Added bed_number column');

        console.log('\n✅ All beds table columns fixed!');
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit();
}

fixBeds();
