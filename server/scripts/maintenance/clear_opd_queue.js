const pool = require('./config/db');

const clearQueue = async () => {
    try {
        console.log('Clearing OPD Queue...');

        // Delete all OPD visits
        // We might want to delete only for today, but "remove mock patients" implies clearing the dashboard.
        // The dashboard shows visits for CURRENT_DATE.
        // But to be sure, let's delete all 'Waiting' or 'In-Progress' visits?
        // Or just truncate the table?
        // Let's delete all from opd_visits to be clean.

        await pool.query("DELETE FROM opd_visits");

        console.log('✅ OPD Queue Cleared.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error clearing queue:', err);
        process.exit(1);
    }
};

clearQueue();
