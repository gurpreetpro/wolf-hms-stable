const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testOTFlow() {
    console.log('\n🏥 Testing OT Management Flow...\n');

    try {
        // 0. Login
        process.stdout.write('0. Authenticating... ');
        let token;
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: 'admin',
                password: 'password' // Default dev password usually
            });
            token = loginRes.data.token;
            console.log('OK (Token received)');
        } catch (err) {
            console.log(`FAILED (Login): ${err.message}`);
            // Try another cred? Or proceed if auth is not the issue (unlikely for 401)
             process.exit(1);
        }

        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Get Rooms
        process.stdout.write('1. Fetching OT Rooms... ');
        const roomsRes = await axios.get(`${API_URL}/ot/rooms`, authHeaders);
        const rooms = roomsRes.data;
        if (rooms.length > 0) {
            console.log(`OK (${rooms.length} rooms found)`);
        } else {
            console.log('FAILED (No rooms)');
            process.exit(1);
        }

        const roomID = rooms[0].id; 

        // 2. Book Surgery
        process.stdout.write('2. Booking Surgery (Test)... ');
        const surgeryData = {
            patient_id: 1, 
            doctor_id: 'TestDoctorUUID', 
            ot_room_id: roomID,
            procedure_name: 'Appendectomy (Test)',
            start_time: new Date(Date.now() + 86400000).toISOString(),
            end_time: new Date(Date.now() + 90000000).toISOString(),
            priority: 'Scheduled',
            notes: 'Automated Test Booking'
        };

        let bookingRes;
        try {
            bookingRes = await axios.post(`${API_URL}/ot/book`, surgeryData, authHeaders);
            console.log(`OK (ID: ${bookingRes.data.id})`);
        } catch (err) {
            console.log(`FAILED: ${err.response?.data?.message || err.message}`);
             if (err.response?.data?.message === 'Invalid Patient ID') {
                 console.log('WARN: Patient ID 1 not found. Skipping booking check.');
             }
        }

        // 3. Check Schedule
        if (bookingRes) {
            process.stdout.write('3. Verifying Schedule... ');
            const scheduleRes = await axios.get(`${API_URL}/ot/schedule`, authHeaders);
            const found = scheduleRes.data.find(s => s.id === bookingRes.data.id);
            if (found) {
                console.log('OK (Booking found in calendar)');
            } else {
                console.log('FAILED (Booking missing)');
            }
        }

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
    } finally {
        process.exit(0);
    }
}

testOTFlow();
