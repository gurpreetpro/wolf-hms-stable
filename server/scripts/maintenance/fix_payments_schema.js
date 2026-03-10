const pool = require('./config/db');

const fixPaymentsSchema = async () => {
    try {
        console.log('Checking payments table schema...');

        // Check if visit_id exists
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'visit_id'
        `);

        if (res.rows.length === 0) {
            console.log('⚠️ visit_id column missing. Adding it...');
            await pool.query('ALTER TABLE payments ADD COLUMN visit_id INTEGER REFERENCES opd_visits(id)');
            console.log('✅ visit_id column added.');
        } else {
            console.log('✅ visit_id already exists.');
        }

        // Just in case, check for other columns used in code: refund_amount, refund_reason etc.
        // The error log showed we hit the visit_id issue first.

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing schema:', err);
        process.exit(1);
    }
};

fixPaymentsSchema();
