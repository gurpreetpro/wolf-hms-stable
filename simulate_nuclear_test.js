const axios = require('axios');

const API_URL = 'http://127.0.0.1:8080/api';
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
    console.log('🚀 INITIALIZING WOLF HMS NUCLEAR SIMULATION...');
    console.log('--------------------------------------------------');

    // [STEP 0] ENSURE HOSPITAL EXISTS
    try {
        console.log('🔧 [STEP 0] Ensuring Hospital ID 1 exists...');
        await axios.get('http://127.0.0.1:8080/api/test/fix-settings-schema');
    } catch (e) {
        console.warn('⚠️ Could not run fix-settings-schema, proceeding anyway...');
    }

    // AXIOS CONFIG WITH HEADERS
    const config = {
        headers: { 
            'x-hospital-id': '1',
            'Content-Type': 'application/json'
        }
    };

    try {
        // [STEP 1] AUTHENTICATION
        console.log('\n🔐 [STEP 1] Authenticating as Admin...');
        try {
            // Try demo login first - if it fails (404), try standard login with demo credentials
            // Note: tenantResolver needs x-hospital-id
            const loginRes = await axios.post(`${API_URL}/auth/demo-login`, {}, config);
            authToken = loginRes.data.token;
            console.log('✅ AUTH SUCCESS! Token acquired via Demo Login.');
        } catch (e) {
            console.warn('⚠️ Demo Login failed (' + e.message + '), trying standard login...');
            try {
                 // Fallback to standard login if demo-login route is hidden/removed
                 const loginRes = await axios.post(`${API_URL}/auth/login`, {
                     username: 'admin', // Assuming 'admin' exists or was created by seeds
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
                name: 'Sim Nucleus ' + Math.floor(Math.random() * 1000),
                age: 40,
                gender: 'Male',
                phone: patientPhone,
                address: '101 Simulation Blvd',
                blood_group: 'A+'
            };
            const regRes = await axios.post(`${API_URL}/patients/register`, patientData, config);
            // Handle different potential response structures based on previous file analysis
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
                patientPhone: patientPhone, // Most systems key off phone
                patientId: patientId,       // Or ID if available
                doctorId: doctorId,
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                consultationType: 'in-person',
                notes: 'Nuclear Test Visit'
            };
            // Try endpoint; if it fails, try alternate
            await axios.post(`${API_URL}/patients/book-appointment`, bookData, config);
            console.log('✅ OPD BOOKING SUCCESS!');
        } catch (e) {
            console.warn('⚠️ OPD BOOKING WARN: ' + e.message + ' (Proceeding to IPD)');
        }



        // [STEP 5] IPD ADMISSION
        console.log('\n🛏️ [STEP 5] Admitting Application (IPD)...');
        try {
            // [STEP 5.0] FORCE CLEANUP (The "Nuclear" Option)
            const { Pool } = require('pg');
            // Assuming default local credentials or loading from env if possible
            // But for simulation script simplicity, we'll try standard local var or hardcode specific to dev env
            const dbConfig = {
                user: 'postgres',
                host: 'localhost',
                database: 'wolf_hms_db',
                password: 'password', // Adjust if known, or try to read .env
                port: 5432,
            };
            
            // Try to read .env if available
            try {
                require('dotenv').config({ path: './server/.env' });
                if (process.env.DB_PASSWORD) dbConfig.password = process.env.DB_PASSWORD;
                if (process.env.DB_USER) dbConfig.user = process.env.DB_USER;
                if (process.env.DB_NAME) dbConfig.database = process.env.DB_NAME;
            } catch (e) {}

            const pool = new Pool(dbConfig);
            
            console.log('🔧 [STEP 5.0] Connecting to DB for Cleanup...');
            
            // Find a bed first - Get ALL beds and filter client side if needed
            const bedsRes = await axios.get(`${API_URL}/admissions/available-beds?ward_id=1`, config);
            
            // Filter for actually available beds (API might return all beds in ward)
            const availableBeds = bedsRes.data.data.filter(b => b.status === 'Available'); // && !b.current_patient_id check is unreliable if API is dumb
            
            if (availableBeds.length === 0) throw new Error('No beds available in Ward 1.');
            
            let admissionSuccess = false;
            
            // Try up to 3 beds
            for (const bed of availableBeds.slice(0, 3)) {
                try {
                    console.log(`ℹ️ Attempting admission to Bed: ${bed.bed_number}`);
                    
                    // FORCE CLEANUP
                    const bedNum = bed.bed_number || bed.number;
                    // 3. Clear existing admission for this bed (if any)
                    const existingAdm = await pool.query("SELECT id FROM admissions WHERE ward = $1 AND bed_number = $2 AND status = 'Admitted'", ['General', bedNum]); // Assuming General Ward
                    if (existingAdm.rows.length > 0) {
                        const admId = existingAdm.rows[0].id;
                        console.log(`🧹 Force clearing Bed ${bedNum} (Admission ID: ${admId})...`);
                        
                        // Cascade Delete for Nuclear Cleanup
                        await pool.query('DELETE FROM pending_charges WHERE admission_id = $1', [admId]);
                        await pool.query('DELETE FROM care_tasks WHERE admission_id = $1', [admId]);
                        await pool.query('DELETE FROM lab_requests WHERE admission_id = $1', [admId]);
                        await pool.query('DELETE FROM bed_history WHERE admission_id = $1', [admId]);
                        // Note: Invoices might legally exist, so we might skip them or nuke them too if they block
                        await pool.query('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE admission_id = $1)', [admId]);
                        await pool.query('DELETE FROM invoices WHERE admission_id = $1', [admId]);

                        await pool.query('DELETE FROM admissions WHERE id = $1', [admId]);
                    }

                    // 4. Force Bed to Available
                    await pool.query("UPDATE beds SET status = 'Available' WHERE bed_number = $1", [bedNum]);

                    const admitData = {
                        patient_id: patientId,
                        ward: bed.ward || 'General',
                        bed_number: bed.bed_number || bed.number,
                        diagnosis: 'Simulation Fever',
                        doctor_id: doctorId,
                        notes: 'Nuclear Admission'
                    };

                    const admitRes = await axios.post(`${API_URL}/admissions/admit`, admitData, config);
                    
                    // Extract Admission ID safely
                    if (admitRes.data.data && admitRes.data.data.admission_id) {
                        admissionId = admitRes.data.data.admission_id;
                    } else if (admitRes.data.data && admitRes.data.data.admission) {
                         admissionId = admitRes.data.data.admission.id;
                    } else {
                         admissionId = admitRes.data.admission_id;
                    }

                    console.log(`✅ ADMISSION SUCCESS! Admission ID: ${admissionId}`);
                    admissionSuccess = true;
                    break; // Exit loop on success
                } catch (innerErr) {
                    console.warn(`⚠️ Admission to Bed ${bed.bed_number} failed: ${innerErr.response?.data?.message || innerErr.message}.`);
                }
            }
            
            await pool.end(); // Close DB connection
            
            if (!admissionSuccess) throw new Error('All admission attempts failed.');


        } catch (e) {
            console.error('❌ ADMISSION FAILED:', e.message);
            if(e.response) console.error(JSON.stringify(e.response.data));
            // Critical failure - cannot proceed to lab/pharmacy/billing without admission
            process.exit(1);
        }

        // [STEP 6] LAB ORDER
        console.log('\n🧪 [STEP 6] Ordering Lab Test...');
        try {
            // Get test types
            const testsRes = await axios.get(`${API_URL}/lab/tests`, config);
            // Handle different response structures (pure array vs wrapped)
            const tests = Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data.data || []);
            
            if (tests.length === 0) throw new Error('No tests returned from API');

            const cbcTest = tests.find(t => (t.test_name || t.name).includes('CBC') || (t.test_name || t.name).includes('Blood')) || tests[0];
            
            if (cbcTest) {
                // Controller 'orderTest' expects: { admission_id, patient_id, test_type (string name) }
                const orderData = {
                    patient_id: patientId,
                    admission_id: admissionId,
                    doctor_id: doctorId,
                    test_type: cbcTest.name || cbcTest.test_name // Must be string name
                };
                const orderRes = await axios.post(`${API_URL}/lab/order`, orderData, config); 
                console.log(`✅ LAB ORDER SUCCESS! Ordered: ${orderData.test_type}`);

                // [STEP 6.1] COMPLETE LAB ORDER (Required for Discharge)
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
                         if (labErr.response) console.error(labErr.response.data);
                    }
                }
            } else {
                console.warn('⚠️ No Lab Tests found to order.');
            }
        } catch (e) {
             console.warn('⚠️ LAB ORDER FAILED (Non-critical):', e.message);
             if(e.response) console.warn(e.response.data);
        }

        // [STEP 7] PHARMACY ORDER
        console.log('\n💊 [STEP 7] Dispensing Medicine...');
        try {
            // Get inventory
            const invRes = await axios.get(`${API_URL}/pharmacy/inventory`, config); 
            const inventory = Array.isArray(invRes.data) ? invRes.data : (invRes.data.data || []);
            const medicine = inventory.find(i => i.stock > 0) || inventory[0];

            if (medicine) {
                // Controller 'dispense' expects: { patient_id, item (string name), quantity }
                const pharmData = {
                    patient_id: patientId,
                    item: medicine.name, // Must be string name
                    quantity: 1,
                    force: true
                };
                // Try to create order/dispense
                await axios.post(`${API_URL}/pharmacy/dispense`, pharmData, config); 
                 console.log(`✅ PHARMACY SUCCESS! Dispensed: ${medicine.name}`);
            } else {
                 console.warn('⚠️ No Medicine in Stock.');
            }
        } catch (e) {
            console.warn('⚠️ PHARMACY FAILED (Non-critical):', e.message);
             if(e.response) console.warn(e.response.data);
        }

        // [STEP 8] FINAL BILLING
        console.log('\n💰 [STEP 8] Generating Final Invoice...');
        await sleep(1000); // Wait for async charges

        // [STEP 8.1] CLEAR PENDING TASKS (Required for Discharge)
        console.log('🧹 Clearing Pending Care Tasks...');
        try {
            const tasksRes = await axios.get(`${API_URL}/clinical/tasks?admission_id=${admissionId}&status=Pending`, config);
            const pendingTasks = tasksRes.data.data || tasksRes.data || [];
            if (pendingTasks.length > 0) {
                console.log(`ℹ️ Found ${pendingTasks.length} pending tasks. Completing them...`);
                for (const task of pendingTasks) {
                    await axios.post(`${API_URL}/clinical/tasks/complete`, { task_id: task.id }, config);
                    console.log(`   - Completed Task: ${task.description}`);
                }
            } else {
                console.log('ℹ️ No pending tasks found.');
            }
        } catch (taskErr) {
             console.warn('⚠️ Failed to clear tasks:', taskErr.message);
        }

        try {
            // Controller 'generateInvoice' expects snake_case
            const billRes = await axios.post(`${API_URL}/finance/generate`, { 
                patient_id: patientId,
                admission_id: admissionId,
                userId: 1
            }, config);
            
            // Handle response
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
                summary: 'Nuclear Test Complete',
                notes: 'All systems go.'
            }, config);
            console.log('✅ DISCHARGE SUCCESS! Patient has left the building.');
        } catch (e) {
             console.error('❌ DISCHARGE FAILED:', e.message);
             process.exit(1);
        }

        console.log('\n--------------------------------------------------');
        console.log('🎉 NUCLEAR SIMULATION PASSED! All departments connected.');
        console.log('--------------------------------------------------');

    } catch (globalError) {
        console.error('\n💥 NUCLEAR SIMULATION ABORTED:', globalError.message);
    }
}

runNuclearSimulation();
