// Test the actual HTTP endpoints like the frontend does
const axios = require('axios');
const pool = require('./config/db');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000';

async function testHTTPEndpoints() {
    console.log('='.repeat(60));
    console.log('TESTING ACTUAL HTTP API ENDPOINTS');
    console.log('='.repeat(60));

    try {
        // 1. Generate a valid JWT token for a nurse/admin user
        console.log('\n1. Generating auth token...');
        const user = await pool.query(
            `SELECT id, username, role FROM users WHERE role IN ('nurse', 'ward_incharge', 'admin') LIMIT 1`
        );

        if (user.rows.length === 0) {
            console.log('   ✗ No suitable user found!');
            return;
        }

        const { id, username, role } = user.rows[0];
        console.log(`   User: ${username} (${role}, ID: ${id})`);

        // Create JWT token
        const token = jwt.sign(
            { id, username, role },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
            { expiresIn: '1h' }
        );
        console.log(`   ✓ Token generated`);

        // 2. Get an admitted patient
        console.log('\n2. Fetching ward overview...');
        let wardRes;
        try {
            wardRes = await axios.get(`${BASE_URL}/api/nurse/ward-overview`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`   ✓ Ward Overview: ${wardRes.data.admissions?.length || 0} admissions`);
        } catch (e) {
            console.log(`   ✗ Ward Overview Failed: ${e.response?.data?.message || e.message}`);
            console.log(`   Status: ${e.response?.status}`);
            return;
        }

        if (!wardRes.data.admissions || wardRes.data.admissions.length === 0) {
            console.log('   ✗ No admissions found!');
            return;
        }

        // Use first admission
        const admission = wardRes.data.admissions[0];
        console.log(`   Selected: ${admission.patient_name} (admission_id: ${admission.admission_id})`);
        console.log(`   Patient ID: ${admission.patient_id}`);

        // 3. Test each endpoint that NursePatientProfile calls
        console.log('\n3. Testing NursePatientProfile endpoints...\n');

        const endpoints = [
            { name: 'Care Plan', url: `/api/nurse/care-plan/${admission.admission_id}` },
            { name: 'Pain Scores', url: `/api/nurse/pain/${admission.admission_id}` },
            { name: 'Fluid Balance', url: `/api/nurse/fluid-balance/${admission.admission_id}` },
            { name: 'IV Lines', url: `/api/nurse/iv-line/${admission.admission_id}` },
            { name: 'Care Tasks', url: `/api/clinical/tasks?admission_id=${admission.admission_id}` },
            { name: 'Vitals History', url: `/api/clinical/vitals/${admission.patient_id}` },
            { name: 'Lab Results', url: `/api/lab/patient/${admission.patient_id}` }
        ];

        for (const ep of endpoints) {
            try {
                const res = await axios.get(`${BASE_URL}${ep.url}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(`   ✓ ${ep.name}: Status ${res.status}`);
            } catch (e) {
                console.log(`   ✗ ${ep.name}: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
                if (e.response?.data) {
                    console.log(`     Response: ${JSON.stringify(e.response.data).substring(0, 200)}`);
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('TEST COMPLETE');
        console.log('='.repeat(60));

    } catch (e) {
        console.error('Error:', e.message);
        console.error(e.stack);
    }

    process.exit(0);
}

testHTTPEndpoints();
