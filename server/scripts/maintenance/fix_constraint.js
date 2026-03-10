const pool = require('./config/db');

const fixConstraint = async () => {
    try {
        console.log('Fixing opd_visits status constraint...');

        await pool.query('ALTER TABLE opd_visits DROP CONSTRAINT IF EXISTS opd_visits_status_check');
        await pool.query("ALTER TABLE opd_visits ADD CONSTRAINT opd_visits_status_check CHECK (status IN ('Waiting', 'In-Consult', 'Completed', 'Cancelled', 'Rescheduled'))");

        console.log('✅ Constraint updated successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating constraint:', err);
        process.exit(1);
    }
};

fixConstraint();
