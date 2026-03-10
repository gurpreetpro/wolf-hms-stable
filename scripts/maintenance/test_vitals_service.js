const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });
const ClinicalService = require('../../server/services/clinicalService');
const pool = require('../../server/config/db');

async function testService() {
    try {
        console.log('DB URL Loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');
        // console.log('DB URL:', process.env.DATABASE_URL); // Careful with secrets

        console.log('Fetching valid IDs...');
        const patRes = await pool.query('SELECT id FROM patients LIMIT 1');
        const admRes = await pool.query('SELECT id FROM admissions LIMIT 1');
        const userRes = await pool.query('SELECT id FROM users LIMIT 1');
        
        if (patRes.rows.length === 0 || admRes.rows.length === 0) {
            console.error('TEST SKIPPED: No data in DB.');
            return;
        }

        const aid = admRes.rows[0].id;
        const pid = patRes.rows[0].id;
        const uid = userRes.rows.length > 0 ? userRes.rows[0].id : 1;

        console.log(`Using: AID=${aid}, PID=${pid}, UID=${uid}`);

        // TEST: Service Call via Prisma
        const mockData = {
            admission_id: aid,
            patient_id: pid,
            bp: '120/80',
            temp: 104.5, // Critical High
            spo2: 95,
            heart_rate: 135, // Critical High
            user_id: uid
        };

        const { vitalsLog, alerts } = await ClinicalService.logVitals(mockData);
        
        console.log('Vitals Logged ID:', vitalsLog.id);
        console.log('Recorded At:', vitalsLog.recorded_at);
        console.log('Alerts Generated:', alerts.length);
        if (alerts.length > 0) {
            console.log('Sample Alert:', alerts[0].message);
        }

    } catch (err) {
        console.error('TEST FAILED:', err.message);
        console.error('Code:', err.code);
        console.error('Meta:', err.meta);
    } finally {
        await pool.end();
        // Since ClinicalService uses Prisma, we should ideally disconnect it too
        // but for a script it's fine.
        const prisma = require('../../server/config/prisma');
        await prisma.$disconnect();
    }
}

testService();
