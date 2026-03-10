const request = require('supertest');
const { pool } = require('../server'); // Import pool
const { app } = require('../server'); // Import app correctly
// Note: If server.js doesn't export 'app' correctly or starts listening, supertest might create a new server. 
// We need to ensure server.js exports 'app'.

const fs = require('fs');
const path = require('path');
const { generateLicense } = require('../utils/licenseUtil');

describe('🏥 Virtual Hospital Simulation (End-to-End)', () => {
    jest.setTimeout(30000); // Increase timeout to 30 seconds
    let adminToken, doctorToken, nurseToken, receptionistToken, pharmacistToken, labTechToken, anaesthetistToken;
    let patientId, admissionId, invoiceId;
    let licenseKey;

    beforeAll(async () => {
        // 1. Generate a valid license key for testing
        licenseKey = generateLicense('Test Hospital', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
        console.log('🔑 [Setup] Generated License Key:', licenseKey);

        // Ensure DB is connected (handled by server.js, but we wait a bit)
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
        await pool.end();
        // Cleanup license file
        const licensePath = path.join(__dirname, '../../license.key');
        if (fs.existsSync(licensePath)) fs.unlinkSync(licensePath);
    });

    // ==========================================
    // PHASE 1 & 7: Auth & Security
    // ==========================================
    test('🔐 [Auth] Login all roles', async () => {
        const roles = [
            { user: 'admin_user', pass: 'password123', setter: t => adminToken = t },
            { user: 'doctor_user', pass: 'password123', setter: t => doctorToken = t },
            { user: 'nurse_user', pass: 'password123', setter: t => nurseToken = t },
            { user: 'receptionist_user', pass: 'password123', setter: t => receptionistToken = t },
            { user: 'pharmacist_user', pass: 'password123', setter: t => pharmacistToken = t },
            { user: 'lab_tech_user', pass: 'password123', setter: t => labTechToken = t },
            { user: 'anaesthetist_user', pass: 'password123', setter: t => anaesthetistToken = t },
        ];

        for (const r of roles) {
            const res = await request(app).post('/api/auth/login').send({ username: r.user, password: r.pass });
            expect(res.statusCode).toEqual(200);
            r.setter(res.body.token);
        }
        console.log('✅ [Auth] All Staff Logged In.');
    });

    test('🛡️ [License] Activate System', async () => {
        const res = await request(app)
            .post('/api/license/activate')
            .send({ key: licenseKey });

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toContain('Successful');
        console.log('✅ [License] System Activated.');
    });

    // ==========================================
    // SCENARIO A: The OPD Fast Track (Phase 2, 3, 4)
    // ==========================================
    describe('Scenario A: The OPD Fast Track', () => {
        test('📝 [Reception] Register Walk-In Patient', async () => {
            const randomSuffix = Math.floor(Math.random() * 10000);
            const res = await request(app)
                .post('/api/opd/register')
                .set('Authorization', `Bearer ${receptionistToken}`)
                .send({
                    name: `Sim User ${randomSuffix}`,
                    age: 30,
                    gender: 'Male',
                    phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`, // Random 10-digit phone starting with 99
                    complaint: 'Fever'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('token_number');
            patientId = res.body.patient_id;
            console.log(`✅ [Reception] Patient Registered. Token: ${res.body.token_number}`);
        });

        test('👨‍⚕️ [Doctor] Start Consult & Prescribe', async () => {
            // 1. Get Queue
            const queueRes = await request(app).get('/api/opd/queue').set('Authorization', `Bearer ${doctorToken}`);
            expect(queueRes.statusCode).toEqual(200);

            // 2. Prescribe
            const rxRes = await request(app)
                .post('/api/clinical/prescribe')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    patient_id: patientId,
                    admission_id: null,
                    medications: [{ name: 'Paracetamol', dose: '500mg', freq: 'BID' }]
                });

            expect(rxRes.statusCode).toEqual(201);
            console.log('✅ [Doctor] Consultation Done. Paracetamol Prescribed.');
        });

        test('💊 [Pharmacy] Dispense Medication', async () => {
            const res = await request(app)
                .post('/api/pharmacy/dispense')
                .set('Authorization', `Bearer ${pharmacistToken}`)
                .send({
                    patient_id: patientId,
                    item: 'Paracetamol 500mg', // Must match seeded inventory name
                    quantity: 2
                });

            // Note: If inventory is not seeded or name mismatch, this might fail. 
            // We seeded 'Paracetamol 500mg' in phase4_schema.sql
            if (res.statusCode !== 200) console.log('Pharmacy Error:', res.body);
            expect(res.statusCode).toEqual(200);
            console.log('✅ [Pharmacy] Paracetamol Dispensed.');
        });
    });

    // ==========================================
    // SCENARIO B: The IPD Complex Cycle (Phase 2, 3, 4, 5, 6)
    // ==========================================
    describe('Scenario B: The IPD Complex Cycle', () => {
        test('🛏️ [Reception] Admit Patient to ICU-A', async () => {
            const res = await request(app)
                .post('/api/admissions/admit')
                .set('Authorization', `Bearer ${receptionistToken}`)
                .send({
                    patient_id: patientId,
                    ward: 'ICU',
                    bed_number: 'A-02' // Changed to A-02
                });

            if (res.statusCode !== 201) console.log('Admission Error:', res.body);
            expect(res.statusCode).toEqual(201);
            admissionId = res.body.admission_id;
            console.log('✅ [Reception] Patient Admitted to ICU-A.');
        });

        test('🩺 [Nurse] Log Vitals', async () => {
            const res = await request(app)
                .post('/api/clinical/vitals')
                .set('Authorization', `Bearer ${nurseToken}`)
                .send({
                    admission_id: admissionId,
                    bp: '120/80',
                    temp: '98.6',
                    spo2: '99',
                    heart_rate: '72'
                });

            expect(res.statusCode).toEqual(201);
            console.log('✅ [Nurse] Vitals Logged.');
        });

        test('📋 [Doctor] Assign Care Task (Instruction)', async () => {
            console.log(`Debug: Assigning Task - Patient: ${patientId}, Admission: ${admissionId}`);
            const res = await request(app)
                .post('/api/clinical/tasks')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    patient_id: patientId,
                    admission_id: admissionId,
                    type: 'Instruction',
                    description: 'Monitor fluid intake strictly',
                    scheduled_time: new Date().toISOString()
                });

            if (res.statusCode !== 201) console.log('Task Assignment Error:', res.body);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            console.log('✅ [Doctor] Care Task Assigned to Nurse.');
        });

        test('✅ [Nurse] Complete Care Task', async () => {
            // 1. Get Tasks
            const tasksRes = await request(app)
                .get(`/api/clinical/tasks?admission_id=${admissionId}&status=Pending`)
                .set('Authorization', `Bearer ${nurseToken}`);

            console.error('Debug: Tasks Found:', JSON.stringify(tasksRes.body, null, 2));

            const task = tasksRes.body.find(t => t.type === 'Instruction');
            if (!task) {
                console.error('❌ Instruction task not found in:', tasksRes.body);
                throw new Error('Instruction task not found');
            }

            // 2. Complete Task
            const res = await request(app)
                .post('/api/clinical/tasks/complete')
                .set('Authorization', `Bearer ${nurseToken}`)
                .send({ task_id: task.id });

            if (res.statusCode !== 200) console.error('❌ Complete Task Error:', res.body);
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('Completed');
            console.log('✅ [Nurse] Care Task Completed.');
        });

        test('🔬 [Doctor] Order CBC Test', async () => {
            const res = await request(app)
                .post('/api/lab/order')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    admission_id: admissionId,
                    patient_id: patientId,
                    test_type: 'CBC'
                });

            if (res.statusCode !== 201) console.error('❌ Lab Order Error:', res.body);
            expect(res.statusCode).toEqual(201);
            console.log('✅ [Doctor] CBC Test Ordered.');
        });

        test('🧪 [Lab Tech] Upload Result (AI Parsing)', async () => {
            // Need request ID. For sim, we'll fetch queue first.
            const queueRes = await request(app).get('/api/lab/queue').set('Authorization', `Bearer ${labTechToken}`);
            const labRequest = queueRes.body.find(r => r.admission_id === admissionId);

            if (!labRequest) {
                console.error('❌ Lab Request not found in queue:', queueRes.body);
                throw new Error('Lab Request not found in queue');
            }

            const res = await request(app)
                .post('/api/lab/upload-result')
                .set('Authorization', `Bearer ${labTechToken}`)
                .send({
                    request_id: labRequest.id,
                    result_json: { hemoglobin: 14.5, platelets: 250000 }
                });

            if (res.statusCode !== 200) console.error('❌ Lab Upload Error:', res.body);
            expect(res.statusCode).toEqual(200);
            console.log('✅ [Lab] Results Uploaded.');
        });

        test('🚨 [Nurse] Trigger Code Blue', async () => {
            const res = await request(app)
                .post('/api/emergency/trigger')
                .set('Authorization', `Bearer ${nurseToken}`)
                .send({ code: 'Blue', location: 'ICU-A' });

            expect(res.statusCode).toEqual(201);
            console.log('✅ [Emergency] Code Blue Triggered.');
        });

        test('⚡ [Anaesthetist] Respond to Code Blue', async () => {
            const res = await request(app)
                .post('/api/emergency/respond')
                .set('Authorization', `Bearer ${anaesthetistToken}`)
                .send({
                    code: 'Blue',
                    action: 'CPR Started'
                });

            expect(res.statusCode).toEqual(200);
            console.log('✅ [Emergency] Code Blue Responded.');
        });

        test('💰 [Finance] Generate Invoice', async () => {
            const res = await request(app)
                .post('/api/finance/generate')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    admission_id: admissionId,
                    patient_id: patientId
                });

            if (res.statusCode !== 201) console.error('❌ Invoice Error:', res.body);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('invoice');
            expect(res.body.invoice).toHaveProperty('total_amount');
            const total = parseFloat(res.body.invoice.total_amount);
            expect(total).toBeGreaterThan(0);
            invoiceId = res.body.invoice.id;
            console.log(`✅ [Finance] Invoice Generated. Total: $${total}`);
        });

        test('👋 [Admissions] Discharge Patient', async () => {
            const res = await request(app)
                .post('/api/admissions/discharge')
                .set('Authorization', `Bearer ${doctorToken}`) // Changed to Doctor
                .send({ admission_id: admissionId });

            if (res.statusCode !== 200) console.error('❌ Discharge Error:', res.body);
            expect(res.statusCode).toEqual(200);
            console.log('✅ [Discharge] Patient Discharged. Bed Available.');
        });
    });

});
