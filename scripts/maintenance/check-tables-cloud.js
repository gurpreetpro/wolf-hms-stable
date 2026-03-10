const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

async function checkTables() {
    const q = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('surgeries', 'surgery_schedules', 'guard_patrols', 'security_checkpoints', 'security_incidents', 'visitor_logs', 'housekeeping_requests', 'dietary_orders', 'payments', 'pos_transactions', 'opd_queue')";
    try {
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { sql: q, setupKey: SETUP_KEY });
        console.log('Tables found:', JSON.stringify(res.data.rows));
    } catch (e) { console.error(e.message); }
}
checkTables();
