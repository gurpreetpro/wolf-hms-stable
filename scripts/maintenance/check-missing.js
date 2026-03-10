const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

async function checkMissing() {
    const required = [
        'insurance_preauths', 'insurance_claims', 
        'tpa_masters', 'billing_exceptions', 
        'procedure_masters', 'bed_rates', 'package_masters', 
        'security_missions', 'security_gates', 'security_zones', 
        'patrol_checkpoints', 'geofence_zones', 'sos_alerts', 
        'mission_dispatches', 
        'pre_anesthesia_checkups', 'intra_op_records', 
        'pacu_monitoring', 'ot_rooms', 
        'billing_rules', 'era_submissions', 'claim_scrub_results'
    ];
    
    const valid = required.map(t => `'${t}'`).join(',');
    const q = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (${valid})`;
    
    try {
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { sql: q, setupKey: SETUP_KEY });
        const found = res.data.rows.map(r => r.table_name);
        
        const missing = required.filter(r => !found.includes(r));
        console.log('--- MISSING ---');
        missing.forEach(m => console.log(m));
        console.log('--- FOUND ---');
        found.forEach(f => console.log(f));
    } catch (e) { console.error(e.message); }
}
checkMissing();
