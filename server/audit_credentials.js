const pool = require('./config/db');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');

const PASSWORD = 'password123';
const API_BASE = 'http://localhost:5000';

async function audit() {
    console.log('═'.repeat(70));
    console.log('🔍 WOLF HMS - COMPLETE DATABASE AUDIT');
    console.log('═'.repeat(70));
    
    let passed = 0;
    let failed = 0;

    // 1. HOSPITALS AUDIT
    console.log('\n📊 HOSPITALS TABLE');
    console.log('─'.repeat(70));
    
    const hospitals = await pool.query('SELECT * FROM hospitals ORDER BY id');
    console.log(`ID  | Code        | Name                     | Domain`);
    console.log('─'.repeat(70));
    hospitals.rows.forEach(h => {
        console.log(`${String(h.id).padEnd(3)} | ${(h.code || 'N/A').padEnd(11)} | ${(h.name || 'N/A').padEnd(24)} | ${h.subdomain || 'N/A'}`);
    });
    console.log(`\n✅ Total Hospitals: ${hospitals.rows.length}`);

    // 2. USERS AUDIT
    console.log('\n📊 USERS TABLE (Admins & Super Admins)');
    console.log('─'.repeat(70));
    
    const users = await pool.query(`
        SELECT u.id, u.username, u.email, u.role, u.hospital_id, u.is_active,
               h.name as hospital_name, h.code as hospital_code
        FROM users u
        LEFT JOIN hospitals h ON u.hospital_id = h.id
        ORDER BY u.hospital_id NULLS FIRST, u.role DESC
    `);
    
    console.log(`ID  | Username           | Role          | Hospital (ID)              | Active`);
    console.log('─'.repeat(70));
    users.rows.forEach(u => {
        const hosp = u.hospital_id ? `${u.hospital_name} (${u.hospital_id})` : 'PLATFORM-WIDE';
        console.log(`${String(u.id).padEnd(3)} | ${u.username.padEnd(18)} | ${u.role.padEnd(13)} | ${hosp.padEnd(26)} | ${u.is_active ? '✅' : '❌'}`);
    });
    console.log(`\n✅ Total Users: ${users.rows.length}`);

    // 3. PASSWORD VERIFICATION
    console.log('\n🔐 PASSWORD HASH VERIFICATION');
    console.log('─'.repeat(70));
    
    for (const u of users.rows) {
        const userWithPass = await pool.query('SELECT password FROM users WHERE id = $1', [u.id]);
        const hash = userWithPass.rows[0]?.password;
        
        if (hash) {
            const isValid = await bcrypt.compare(PASSWORD, hash);
            if (isValid) {
                console.log(`✅ ${u.username.padEnd(20)} -> password123 is VALID`);
                passed++;
            } else {
                console.log(`❌ ${u.username.padEnd(20)} -> password123 is INVALID!`);
                failed++;
            }
        } else {
            console.log(`⚠️ ${u.username.padEnd(20)} -> No password hash found!`);
            failed++;
        }
    }

    // 4. API LOGIN TEST
    console.log('\n🌐 API LOGIN TEST');
    console.log('─'.repeat(70));
    
    for (const u of users.rows) {
        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: u.username, password: PASSWORD })
            });
            
            const data = await response.json();
            
            if (response.ok && data.token) {
                console.log(`✅ ${u.username.padEnd(20)} -> LOGIN SUCCESS (Hospital: ${data.user?.hospital_id || 'N/A'})`);
                passed++;
            } else {
                console.log(`❌ ${u.username.padEnd(20)} -> LOGIN FAILED: ${data.message || data.error || 'Unknown'}`);
                failed++;
            }
        } catch (err) {
            console.log(`❌ ${u.username.padEnd(20)} -> API ERROR: ${err.message}`);
            failed++;
        }
    }

    // SUMMARY
    console.log('\n' + '═'.repeat(70));
    console.log('📋 AUDIT SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Total Tests: ${passed + failed}`);
    console.log('═'.repeat(70));

    process.exit(failed > 0 ? 1 : 0);
}

audit().catch(err => {
    console.error('Audit Error:', err);
    process.exit(1);
});
