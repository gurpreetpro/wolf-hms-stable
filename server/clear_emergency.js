const pool = require('./config/db');

(async () => {
    try {
        // Check current active emergencies (case variations)
        const active = await pool.query("SELECT * FROM emergency_logs WHERE status IN ('Active', 'active', 'ACTIVE')");
        console.log('Active emergencies found:', active.rows.length);
        if (active.rows.length > 0) {
            console.log(active.rows);
        }
        
        // Resolve any active (case-insensitive)
        const r = await pool.query("UPDATE emergency_logs SET status = 'Resolved', resolved_at = NOW() WHERE status IN ('Active', 'active', 'ACTIVE')");
        console.log('Resolved:', r.rowCount);
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
