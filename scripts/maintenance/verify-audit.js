const axios = require('axios');
const { Pool } = require('./server/node_modules/pg');

// Setup DB connection to check logs
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432,
});

const API_URL = 'http://localhost:5000/api';

const runTest = async () => {
    try {
        console.log('1. Attempting Login (Should trigger Audit Log)...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });

        if (loginRes.data.success) {
            console.log('✅ Login Successful');
            const token = loginRes.data.token;
            const userId = loginRes.data.user.id;

            console.log('2. Verifying Audit Log in DB...');
            // Wait a moment for async log
            await new Promise(resolve => setTimeout(resolve, 1000));

            const logs = await pool.query(
                "SELECT * FROM audit_logs WHERE action = 'LOGIN' AND user_id = $1 ORDER BY created_at DESC LIMIT 1",
                [userId]
            );

            if (logs.rows.length > 0) {
                console.log('✅ Audit Log Found:', logs.rows[0]);
            } else {
                console.error('❌ Audit Log NOT Found!');
            }

            console.log('3. Viewing Patient Record (Should trigger VIEW_PATIENT)...');
            // Assuming patient ID 1 exists or fetching one
            try {
                // First search to find a valid ID
                const searchRes = await axios.get(`${API_URL}/patients/search?q=a`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (searchRes.data.data && searchRes.data.data.length > 0) {
                    const patientId = searchRes.data.data[0].id;
                    const viewRes = await axios.get(`${API_URL}/patients/${patientId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    console.log(`✅ Viewed Patient ${patientId}`);
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const viewLogs = await pool.query(
                         "SELECT * FROM audit_logs WHERE action = 'VIEW_PATIENT' AND entity_id = $1 ORDER BY created_at DESC LIMIT 1",
                         [String(patientId)]
                    );
                    
                    if (viewLogs.rows.length > 0) {
                         console.log('✅ View Audit Log Found:', viewLogs.rows[0]);
                    } else {
                         console.error('❌ View Audit Log NOT Found!');
                    }

                } else {
                    console.log('⚠️ No patients found to test view log.');
                }

            } catch (pErr) {
                 console.error('Patient Test Failed:', pErr.message);
            }

        } else {
            console.error('❌ Login Failed');
        }

    } catch (err) {
        console.error('Test Error:', err.message);
        if (err.response) console.error(err.response.data);
    } finally {
        await pool.end();
    }
};

runTest();
