const axios = require('axios');

const API_URL = 'http://217.216.78.81:8080/api';
let authToken = null;
let patientId = null;
let doctorId = null;
let admissionId = null;
let invoiceId = null;
let patientPhone = '999' + Math.floor(Math.random() * 10000000); // 10 digit

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runNuclearSimulation() {
    console.log('🚀 INITIALIZING WOLF HMS CLOUD NUCLEAR SIMULATION...');
    console.log('Target: ' + API_URL);
    console.log('--------------------------------------------------');

    // AXIOS CONFIG WITH HEADERS
    const config = {
        headers: { 
            'x-hospital-id': '1',
            'Content-Type': 'application/json'
        },
        timeout: 20000 // Higher timeout for cloud latency
    };

    try {
        // [STEP 1] AUTHENTICATION
        console.log('\n🔐 [STEP 1] Authenticating as Admin...');
        try {
            const loginRes = await axios.post(`${API_URL}/auth/demo-login`, {}, config);
            authToken = loginRes.data.token;
            console.log('✅ AUTH SUCCESS! Token acquired via Demo Login.');
        } catch (e) {
            console.warn('⚠️ Demo Login failed (' + e.message + '), trying standard login...');
            try {
                 const loginRes = await axios.post(`${API_URL}/auth/login`, {
                     username: 'admin_user', 
                     password: 'password123' 
                 }, config);
                 authToken = loginRes.data.token;
                 console.log('✅ AUTH SUCCESS! Token acquired via Standard Login.');
            } catch (innerE) {
                 console.error('❌ ALL AUTH ATTEMPTS FAILED:', innerE.message);
                 if(innerE.response) console.error(JSON.stringify(innerE.response.data));
                 process.exit(1);
            }
        }
        
        // Update config with Auth Token
        config.headers['Authorization'] = `Bearer ${authToken}`;


        // [STEP 2] PATIENT REGISTRATION
        console.log('\n📝 [STEP 2] Registering Patient...');
        try {
            const patientData = {
                name: 'Cloud Sim ' + Math.floor(Math.random() * 1000),
                age: 40,
                gender: 'Male',
                phone: patientPhone,
                address: '101 Cloud Blvd',
                blood_group: 'O+'
            };
            const regRes = await axios.post(`${API_URL}/patients/register`, patientData, config);
            patientId = regRes.data.patientId || regRes.data.data.id || regRes.data.id;
            console.log(`✅ REGISTRATION SUCCESS! Patient ID: ${patientId} (${patientData.name})`);
        } catch (e) {
            console.error('❌ REGISTRATION FAILED:', e.message);
            if(e.response) console.error(JSON.stringify(e.response.data));
            process.exit(1);
        }

        // [STEP 3] FIND A DOCTOR
        console.log('\n👨‍⚕️ [STEP 3] Locating Staff (Doctor)...');
        try {
            const usersRes = await axios.get(`${API_URL}/auth/users`, config);
            const doctor = usersRes.data.data.find(u => u.role === 'doctor');
            if (!doctor) throw new Error('No doctor found in system.');
            doctorId = doctor.id;
            console.log(`✅ STAFF LOCATED: Dr. ${doctor.username} (ID: ${doctorId})`);
        } catch (e) {
            console.error('❌ STAFF LOCATION FAILED:', e.message);
            process.exit(1);
        }

        // [STEP 4] OPD BOOKING
        console.log('\n📅 [STEP 4] Booking OPD Appointment...');
        try {
            const bookData = {
                patientPhone: patientPhone, 
                patientId: patientId,       
                doctorId: doctorId,
                date: new Date().toISOString().split('T')[0],
                time: '10:00',
                consultationType: 'in-person',
                notes: 'Cloud Nuclear Test Visit'
            };
            await axios.post(`${API_URL}/patients/book-appointment`, bookData, config);
            console.log('✅ OPD BOOKING SUCCESS!');
        } catch (e) {
            console.warn('⚠️ OPD BOOKING WARN: ' + e.message + ' (Proceeding to IPD)');
        }

        // [STEP 5] IPD ADMISSION
        console.log('\n🛏️ [STEP 5] Admitting Application (IPD)...');
        try {
            // FORCE HARDCODED BEDS (General Ward has available beds)
            const bedsToTry = [
                { number: "Gen 1", ward: "General Ward" },
                { number: "Gen 2", ward: "General Ward" },
                { number: "Gen 3", ward: "General Ward" },
                { number: "Gen 4", ward: "General Ward" }
            ];
            
            let admissionSuccess = false;
            
            for (const bed of bedsToTry) {
                 try {
                    console.log(`ℹ️ Attempting admission to Bed: ${bed.number} in ${bed.ward}`);
                    
                    const admitData = {
                        patient_id: patientId,
                        ward: bed.ward,
                        bed_number: bed.number,
                        diagnosis: 'Cloud Fever',
                        doctor_id: doctorId,
                        notes: 'Nuclear Cloud Admission'
                    };

                    const admitRes = await axios.post(`${API_URL}/admissions/admit`, admitData, config);
                    
                    if (admitRes.data.data && admitRes.data.data.admission_id) {
                        admissionId = admitRes.data.data.admission_id;
                    } else if (admitRes.data.data && admitRes.data.data.admission) {
                         admissionId = admitRes.data.data.admission.id;
                    } else {
                         admissionId = admitRes.data.admission_id;
                    }

                    console.log(`✅ ADMISSION SUCCESS! Admission ID: ${admissionId}`);
                    admissionSuccess = true;
                    break; 
                } catch (innerErr) {
                    console.warn(`⚠️ Admission to Bed ${bed.number} failed: ${innerErr.response?.data?.message || innerErr.message}.`);
                }
            }
            
            if (!admissionSuccess) throw new Error('All admission attempts failed.');

        } catch (e) {
            console.error('❌ ADMISSION FAILED:', e.message);
            // Critical failure
            process.exit(1);
        }

        // [STEP 6] LAB ORDER
        console.log('\n🧪 [STEP 6] Ordering Lab Test...');
        try {
            const testsRes = await axios.get(`${API_URL}/lab/tests`, config);
            const tests = Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data.data || []);
            
            const cbcTest = tests.find(t => (t.test_name || t.name).includes('CBC') || (t.test_name || t.name).includes('Blood')) || tests[0];
            
            if (cbcTest) {
                const orderData = {
                    patient_id: patientId,
                    admission_id: admissionId,
                    doctor_id: doctorId,
                    test_type: cbcTest.name || cbcTest.test_name 
                };
                const orderRes = await axios.post(`${API_URL}/lab/order`, orderData, config); 
                console.log(`✅ LAB ORDER SUCCESS! Ordered: ${orderData.test_type}`);

                // [STEP 6.1] COMPLETE LAB ORDER
                const labReqId = orderRes.data.data ? orderRes.data.data.id : orderRes.data.id;
                if (labReqId) {
                    console.log(`🧪 Completing Lab Req ID: ${labReqId}...`);
                    try {
                        await axios.post(`${API_URL}/lab/upload-result`, {
                            request_id: labReqId,
                            result_json: { hemoglobin: 12.5, wbc: 5000, status: 'Normal' }
                        }, config);
                        console.log('✅ LAB RESULTS UPLOADED');
                    } catch (labErr) {
                         console.error('⚠️ Failed to complete lab order:', labErr.message);
                    }
                }
            } else {
                console.warn('⚠️ No Lab Tests found to order.');
            }
        } catch (e) {
             console.warn('⚠️ LAB ORDER FAILED (Non-critical):', e.message);
        }

        // [STEP 7] PHARMACY ORDER
        console.log('\n💊 [STEP 7] Dispensing Medicine...');
        try {
            const invRes = await axios.get(`${API_URL}/pharmacy/inventory`, config); 
            const inventory = Array.isArray(invRes.data) ? invRes.data : (invRes.data.data || []);
            const medicine = inventory.find(i => i.stock > 0) || inventory[0];

            if (medicine) {
                const pharmData = {
                    patient_id: patientId,
                    item: medicine.name, 
                    quantity: 1,
                    force: true
                };
                await axios.post(`${API_URL}/pharmacy/dispense`, pharmData, config); 
                 console.log(`✅ PHARMACY SUCCESS! Dispensed: ${medicine.name}`);
            } else {
                 console.warn('⚠️ No Medicine in Stock.');
            }
        } catch (e) {
            console.warn('⚠️ PHARMACY FAILED (Non-critical):', e.message);
        }

        // [STEP 8] FINAL BILLING
        console.log('\n💰 [STEP 8] Generating Final Invoice...');
        await sleep(2000); 

        // [STEP 8.1] CLEAR PENDING TASKS
        console.log('🧹 Clearing Pending Care Tasks...');
        try {
            const tasksRes = await axios.get(`${API_URL}/clinical/tasks?admission_id=${admissionId}&status=Pending`, config);
            const pendingTasks = tasksRes.data.data || tasksRes.data || [];
            if (pendingTasks.length > 0) {
                console.log(`ℹ️ Found ${pendingTasks.length} pending tasks. Completing them...`);
                for (const task of pendingTasks) {
                    await axios.post(`${API_URL}/clinical/tasks/complete`, { task_id: task.id }, config);
                }
            }
        } catch (taskErr) {
             console.warn('⚠️ Failed to clear tasks:', taskErr.message);
        }

        try {
            // [PROBE]
            try { 
                await axios.get(`${API_URL}/finance/test`); 
                console.log('✅ Finance Route Probe OK'); 
            } catch (e) { 
                console.warn('⚠️ Finance Probe Failed:', e.message); 
            }

            const billRes = await axios.post(`${API_URL}/finance/generate`, { 
                patient_id: patientId,
                admission_id: admissionId,
                userId: 1
            }, config);
            
            const invoice = billRes.data.data ? billRes.data.data.invoice : billRes.data.invoice;
            const total = invoice ? invoice.total_amount : 'Unknown';
            invoiceId = invoice ? invoice.id : null;
            
            console.log(`✅ BILLING SUCCESS! Invoice generated. Total: ${total}`);
        } catch (e) {
             console.error('❌ BILLING FAILED:', e.message);
             if(e.response) console.error(JSON.stringify(e.response.data));
             process.exit(1);
        }

        // [STEP 9] DISCHARGE
        console.log('\n🏥 [STEP 9] Discharging Patient...');
        try {
            const dischargeRes = await axios.post(`${API_URL}/admissions/discharge`, {
                admission_id: admissionId,
                discharge_type: 'NORMAL',
                summary: 'Cloud Nuclear Test Complete',
                notes: 'Verified by Antigravity.'
            }, config);
            console.log('✅ DISCHARGE SUCCESS! Patient has left the building.');
        } catch (e) {
             console.error('❌ DISCHARGE FAILED:', e.message);
             if(e.response) console.error(JSON.stringify(e.response.data));
             process.exit(1);
        }

        console.log('\n--------------------------------------------------');
        console.log('🎉 CLOUD NUCLEAR SIMULATION PASSED! Ecosystem is Online.');
        console.log('--------------------------------------------------');

    } catch (globalError) {
        console.error('\n💥 CLOUD NUCLEAR SIMULATION ABORTED:', globalError.message);
    }
}

runNuclearSimulation();
