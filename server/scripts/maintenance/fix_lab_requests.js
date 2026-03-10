// Check lab_requests table columns and add missing updated_at column
const pool = require('./config/db');

async function fixLabRequests() {
    try {
        // Check columns
        const cols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'lab_requests'
            ORDER BY ordinal_position
        `);

        console.log('Current lab_requests columns:');
        cols.rows.forEach(c => console.log('  - ' + c.column_name));

        const hasUpdatedAt = cols.rows.some(c => c.column_name === 'updated_at');

        if (!hasUpdatedAt) {
            console.log('\n⚠️ Column updated_at is MISSING! Adding it...');
            await pool.query(`ALTER TABLE lab_requests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log('✅ Column added successfully!');
        } else {
            console.log('\n✅ Column updated_at already exists.');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }

    process.exit(0);
}

fixLabRequests();
