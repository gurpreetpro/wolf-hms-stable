const axios = require('axios');
const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:5000';

async function auditSystem() {
    console.log('🔍 Starting Wolf HMS System Audit...\n');
    let errors = [];

    // 1. Check Database Connection
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Database Connection: OK');
        
        // Check Key Tables
        const tableRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name IN ('users', 'patients', 'clinical_vitals', 'video_sessions');
        `);
        const foundTables = tableRes.rows.map(r => r.table_name);
        if (foundTables.includes('clinical_vitals')) {
            console.log('✅ IoT Schema (clinical_vitals): Present');
        } else {
            console.error('❌ IoT Schema (clinical_vitals): MISSING');
            errors.push('Table clinical_vitals missing');
        }
    } catch (err) {
        console.error('❌ Database Connection: FAILED', err.message);
        errors.push('DB Connection Failed');
    }

    // 2. Check Server API
    try {
        const healthRes = await axios.get(`${SERVER_URL}/api/health`);
        if (healthRes.status === 200) {
            console.log('✅ Server Health Check: OK');
        } else {
            console.error(`❌ Server Health Check: Failed (Status ${healthRes.status})`);
            errors.push('Server Health Check Failed');
        }
    } catch (err) {
        console.error('❌ Server Health Check: FAILED (Is server running?)', err.message);
        errors.push('Server unreachable');
    }

    // 3. Security Audit (.env presence)
    if (fs.existsSync(path.join(__dirname, '../.env'))) {
        console.log('✅ Server .env: Present');
        const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
        if (envContent.includes('AIzaSyBizMsVmeVeEROn6w-o5nsfEvKomubIyxw')) {
             console.log('✅ Server .env: Updated with Gemini 2.5 Key');
        } else {
             console.warn('⚠️ Server .env: Does NOT contain new Gemini Key');
             errors.push('Server .env outdated');
        }
    } else {
        console.error('❌ Server .env: MISSING');
        errors.push('Server .env missing');
    }

    // 4. Summarize
    console.log('\n--- Audit Summary ---');
    if (errors.length === 0) {
        console.log('🎉 SYSTEM READY FOR DEPLOYMENT');
        process.exit(0);
    } else {
        console.error('⚠️ AUDIT FAILED WITH ERRORS:');
        errors.forEach(e => console.error(`- ${e}`));
        process.exit(1);
    }
}

auditSystem();
