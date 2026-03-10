const axios = require('axios');

const API_URL = 'http://localhost:8080/api';
let authToken = null;
let patientId = null;
let doctorId = null;
let admissionId = null;
let patientPhone = '555-' + Math.floor(Math.random() * 10000);

async function runSimulation() {
  console.log('🏥 Starting Hospital Flow Simulation (Authenticated)...');

  try {
    // 1. Login (Get Token)
    console.log('\n[1] Authenticating...');
    const loginRes = await axios.post(`${API_URL}/auth/demo-login`, {});
    authToken = loginRes.data.token;
    console.log('✅ Login Successful! Token obtained.');

    // 2. Register Patient (Public App Endpoint)
    console.log('\n[2] Registering New Patient...');
    const patientData = {
      name: 'Sim Patient ' + Math.floor(Math.random() * 1000),
      age: 35,
      gender: 'Male',
      phone: patientPhone,
      address: '123 Sim Lane',
      blood_group: 'O+'
    };
    const regRes = await axios.post(`${API_URL}/patients/register`, patientData);
    patientId = regRes.data.patientId; // Adjusted response field based on code inspection
    console.log(`✅ Patient Registered! ID: ${patientId} (${patientData.name})`);

    // 3. Get Doctor (Protected)
    console.log('\n[3] Fetching Available Doctor...');
    const usersRes = await axios.get(`${API_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${authToken}` }
    });
    const doctor = usersRes.data.data.find(u => u.role === 'doctor');
    if (!doctor) throw new Error('No doctor found in system');
    doctorId = doctor.id;
    console.log(`✅ Doctor Found: ${doctor.username} (ID: ${doctorId})`);

    // 4. Book Appointment (Public App Endpoint)
    console.log('\n[4] Booking OPD Appointment...');
    const bookData = {
        patientPhone: patientPhone,
        doctorId: doctorId,
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        consultationType: 'in-person',
        notes: 'Simulation Visit'
    };
    const bookRes = await axios.post(`${API_URL}/patients/book-appointment`, bookData);
    console.log(`✅ Appointment Booked! Token: ${bookRes.data.booking.token_number}`);


    // 5. Admit Patient (Protected)
    console.log('\n[5] Admitting Patient...');
    // 5. Admit Patient (Protected)
    console.log('\n[5] Admitting Patient...');
    let admissionSuccess = false;
    
    try {
        const bedsRes = await axios.get(`${API_URL}/admissions/available-beds?ward_id=1`, {
             headers: { Authorization: `Bearer ${authToken}` }
        });

        const availableBeds = bedsRes.data.data || [];
        console.log(`ℹ️ Found ${availableBeds.length} potential beds.`);

        for (const freeBed of availableBeds) {
            let admitData = {}; 
            try {
                admitData = {
                    patient_id: patientId,
                    ward: freeBed.ward_name || freeBed.ward || 'General Ward',
                    bed_number: freeBed.bed_number || freeBed.number || String(freeBed.id),
                    diagnosis: 'Simulation Syndrome',
                    doctor_id: doctorId,
                    notes: 'Emergency Admission'
                };
                
                console.log(`➡️ Attempting admission to Bed ${admitData.bed_number}...`);
                const admitRes = await axios.post(`${API_URL}/admissions/admit`, admitData, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                
                // Response structure: { success: true, data: { admission_id: ..., admission: ... } }
                admissionId = admitRes.data.data.admission_id || admitRes.data.data.admission.id;
                console.log(`✅ Patient Admitted! Admission ID: ${admissionId}`);
                admissionSuccess = true;
                break; // Exit loop on success
            } catch (err) {
                if (err.response && (err.response.status === 400 || err.response.status === 404)) {
                     console.warn(`⚠️ Bed ${admitData.bed_number} (${admitData.ward}) failed: ${err.response.data.message || 'Unknown error'}, trying next...`);
                     continue;
                }
                throw err; // Stop for real errors
            }
        }
        
        if (!admissionSuccess) {
            throw new Error('All available beds failed admission (Inconsistent State).');
        }

    } catch(e) { 
        console.error('❌ Admission Check Failed:', e.message);
        throw e;
    }

    // 5.5 Nurse Actions (Complete Required Tasks)
    console.log('\n[5.5] Nurse Actions: Completing Pending Tasks...');
    try {
        const tasksRes = await axios.get(`${API_URL}/clinical/tasks?admission_id=${admissionId}&status=Pending`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const tasks = tasksRes.data.data || [];
        console.log(`ℹ️ Found ${tasks.length} pending tasks.`);
        
        for (const task of tasks) {
            await axios.post(`${API_URL}/clinical/tasks/complete`, { task_id: task.id }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            console.log(`✅ Completed Task: ${task.description} (ID: ${task.id})`);
        }
    } catch (e) {
        console.error('⚠️ Failed to complete tasks:', e.message);
    }

    // 6. Discharge (Protected)
    console.log('\n[6] Discharging Patient...');
    const dischargeData = {
      admission_id: admissionId,
      discharge_type: 'NORMAL',
      summary: 'Recovered via Script',
      notes: 'Auto Discharge'
    };
    await axios.post(`${API_URL}/admissions/discharge`, dischargeData, {
        headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Patient Discharged!');

    console.log('\n🎉 Simulation Complete! Full Flow Verified.');

  } catch (error) {
    console.error('\n❌ Simulation Failed:', error.message);
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

runSimulation();
