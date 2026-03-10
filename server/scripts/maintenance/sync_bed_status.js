const pool = require('./config/db');

const syncBeds = async () => {
    try {
        console.log('Starting Bed Status Sync...');

        // 1. Reset all beds to Available (optional, but safer to ensure clean slate)
        // Actually, let's not reset everything, just ensure occupied ones are occupied.
        // But if a patient was discharged and bed didn't update, it might be stuck as Occupied.
        // So resetting to Available first, then marking Occupied is best.
        // BUT, what about 'Maintenance'? I shouldn't touch those if possible.
        // Let's assume 'Maintenance' is manually set and shouldn't be overridden unless there is an admission?
        // If there is an admission in a 'Maintenance' bed, that's a bigger issue.
        // Let's just update beds that HAVE active admissions to 'Occupied'.
        // And beds that DO NOT have active admissions (and are 'Occupied') to 'Available'.

        // Step 1: Get all active admissions
        const activeAdmissions = await pool.query("SELECT ward, bed_number FROM admissions WHERE status = 'Admitted'");

        // Step 2: Mark all beds as Available first (excluding Maintenance if we want to be careful, but for now let's just reset Occupied ones)
        // Better approach:
        // Update all beds to 'Available' WHERE status = 'Occupied'.
        await pool.query("UPDATE beds SET status = 'Available' WHERE status = 'Occupied'");
        console.log('Reset occupied beds to Available.');

        // Step 3: Mark beds with active admissions as 'Occupied'
        let count = 0;
        for (const adm of activeAdmissions.rows) {
            const res = await pool.query(
                "UPDATE beds SET status = 'Occupied' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name = $2)",
                [adm.bed_number, adm.ward]
            );
            if (res.rowCount > 0) count++;
        }

        console.log(`Synced ${count} beds to 'Occupied' based on active admissions.`);
        process.exit(0);
    } catch (err) {
        console.error('Sync failed:', err);
        process.exit(1);
    }
};

syncBeds();
