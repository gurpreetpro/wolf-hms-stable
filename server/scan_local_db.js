const pool = require('./config/db');
const fs = require('fs');

async function scanLocalData() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };
    
    log('WOLF HMS LOCAL DATABASE SCAN');
    log('============================\n');
    
    const tables = [
        { name: 'hospitals', desc: 'Hospitals' },
        { name: 'users', desc: 'Users' },
        { name: 'patients', desc: 'Patients' },
        { name: 'appointments', desc: 'Appointments' },
        { name: 'admissions', desc: 'Admissions' },
        { name: 'beds', desc: 'Beds' },
        { name: 'wards', desc: 'Wards' },
        { name: 'medications', desc: 'Medications' },
        { name: 'lab_tests', desc: 'Lab Tests' },
        { name: 'emergency_logs', desc: 'Emergency Logs' },
        { name: 'hospital_settings', desc: 'Hospital Settings' },
    ];
    
    log('TABLE COUNTS:');
    for (const t of tables) {
        try {
            const res = await pool.query(`SELECT COUNT(*) as count FROM ${t.name}`);
            log(`  ${t.desc}: ${res.rows[0].count}`);
        } catch (e) {
            log(`  ${t.desc}: NOT FOUND`);
        }
    }
    
    log('\nHOSPITALS:');
    try {
        const hospitals = await pool.query(`SELECT id, name, code FROM hospitals`);
        hospitals.rows.forEach(h => log(`  [${h.id}] ${h.name} (${h.code})`));
    } catch(e) { log('  Error: ' + e.message); }
    
    log('\nUSERS (by role):');
    try {
        const users = await pool.query(`SELECT username, role, is_active FROM users ORDER BY role, username`);
        users.rows.forEach(u => {
            const s = u.is_active ? '+' : '-';
            log(`  ${s} ${u.username} [${u.role}]`);
        });
    } catch(e) { log('  Error: ' + e.message); }
    
    log('\nLEGACY DATA CHECK:');
    try {
        const testPat = await pool.query(`SELECT COUNT(*) as c FROM patients WHERE name ILIKE '%test%' OR name ILIKE '%demo%'`);
        log(`  Test Patients: ${testPat.rows[0].c}`);
    } catch(e) {}
    try {
        const activeEmg = await pool.query(`SELECT COUNT(*) as c FROM emergency_logs WHERE status = 'Active'`);
        log(`  Active Emergencies: ${activeEmg.rows[0].c}`);
    } catch(e) {}
    
    log('\n============================');
    log('SCAN COMPLETE');
    
    fs.writeFileSync('scan_results.txt', output);
    console.log('\nResults saved to scan_results.txt');
    process.exit(0);
}

scanLocalData().catch(e => { console.error(e); process.exit(1); });
