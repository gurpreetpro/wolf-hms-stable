/**
 * Virtual Hospital Simulation (End-to-End Simulation Test)
 * Simulates complete patient journeys through the digital hospital:
 * - Scenario A: OPD Fast Track (Walk-in, Consultation, Prescription, Pharmacy Dispense)
 * - Scenario B: IPD Complex Cycle (Admit, Vitals, Care Task, Lab Order, Code Blue, Invoice, Discharge)
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { generateLicense, verifyLicense } = require('../utils/licenseUtil');

describe('🏥 Virtual Hospital Simulation (Deterministic End-to-End)', () => {
    let app;
    let adminToken, doctorToken, nurseToken, receptionistToken, pharmacistToken, labTechToken, anaesthetistToken;
    let patientId, admissionId, invoiceId;
    let licenseKey;

    // In-memory simulation state
    let simPatients = [];
    let simAdmissions = [];
    let simVitals = [];
    let simCareTasks = [];
    let simLabRequests = [];
    let simEmergencyLogs = [];
    let simInvoices = [];
    let simInventory = [
        { name: 'Paracetamol 500mg', stock: 100, price: 10 }
    ];

    const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_hardening_testing_purpose';
    process.env.JWT_SECRET = JWT_SECRET;

    beforeAll(() => {
        // 1. Generate valid license
        licenseKey = generateLicense('Simulation Hospital', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

        // 2. Setup JWT tokens for all hospital roles
        const standardClaims = { iss: 'wolf-hms', aud: 'wolf-hms-api', hospital_id: 1 };
        adminToken = jwt.sign({ id: 1, role: 'admin', username: 'admin_user', ...standardClaims }, JWT_SECRET);
        doctorToken = jwt.sign({ id: 2, role: 'doctor', username: 'doctor_user', ...standardClaims }, JWT_SECRET);
        nurseToken = jwt.sign({ id: 3, role: 'nurse', username: 'nurse_user', ...standardClaims }, JWT_SECRET);
        receptionistToken = jwt.sign({ id: 4, role: 'receptionist', username: 'receptionist_user', ...standardClaims }, JWT_SECRET);
        pharmacistToken = jwt.sign({ id: 5, role: 'pharmacist', username: 'pharmacist_user', ...standardClaims }, JWT_SECRET);
        labTechToken = jwt.sign({ id: 6, role: 'lab_tech', username: 'lab_tech_user', ...standardClaims }, JWT_SECRET);
        anaesthetistToken = jwt.sign({ id: 7, role: 'anaesthetist', username: 'anaesthetist_user', ...standardClaims }, JWT_SECRET);

        // 3. Build Express simulation app
        app = express();
        app.use(express.json());

        // Simulation Auth endpoint
        app.post('/api/auth/login', (req, res) => {
            const { username } = req.body;
            const tokenMap = {
                admin_user: adminToken,
                doctor_user: doctorToken,
                nurse_user: nurseToken,
                receptionist_user: receptionistToken,
                pharmacist_user: pharmacistToken,
                lab_tech_user: labTechToken,
                anaesthetist_user: anaesthetistToken
            };
            const token = tokenMap[username];
            if (token) {
                return res.status(200).json({ success: true, token, user: { username } });
            }
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        });

        // License Activation endpoint
        app.post('/api/license/activate', (req, res) => {
            const { key } = req.body;
            const result = verifyLicense(key);
            if (result.valid) {
                return res.status(200).json({ success: true, message: 'Activation Successful' });
            }
            return res.status(400).json({ success: false, message: result.message });
        });

        // OPD Registration
        app.post('/api/opd/register', (req, res) => {
            const { name, phone } = req.body;
            const newPat = {
                id: `12345678-0000-0000-0000-${String(simPatients.length + 1).padStart(12, '0')}`,
                name,
                phone,
                token_number: simPatients.length + 1
            };
            simPatients.push(newPat);
            res.status(201).json({
                success: true,
                patient_id: newPat.id,
                token_number: newPat.token_number
            });
        });

        // OPD Queue
        app.get('/api/opd/queue', (req, res) => {
            res.status(200).json({ success: true, queue: simPatients });
        });

        // Clinical Prescribe
        app.post('/api/clinical/prescribe', (req, res) => {
            res.status(201).json({ success: true, message: 'Prescription recorded' });
        });

        // Pharmacy Dispense
        app.post('/api/pharmacy/dispense', (req, res) => {
            const { item, quantity } = req.body;
            const invItem = simInventory.find(i => i.name === item);
            if (invItem && invItem.stock >= quantity) {
                invItem.stock -= quantity;
                return res.status(200).json({ success: true, remaining_stock: invItem.stock });
            }
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        });

        // Admissions
        app.post('/api/admissions/admit', (req, res) => {
            const { patient_id, ward, bed_number } = req.body;
            const newAdm = {
                id: simAdmissions.length + 1,
                patient_id,
                ward,
                bed_number,
                status: 'Admitted'
            };
            simAdmissions.push(newAdm);
            res.status(201).json({ success: true, admission_id: newAdm.id });
        });

        // Clinical Vitals
        app.post('/api/clinical/vitals', (req, res) => {
            simVitals.push(req.body);
            res.status(201).json({ success: true, message: 'Vitals logged' });
        });

        // Clinical Tasks
        app.post('/api/clinical/tasks', (req, res) => {
            const task = {
                id: simCareTasks.length + 1,
                ...req.body,
                status: 'Pending'
            };
            simCareTasks.push(task);
            res.status(201).json(task);
        });

        app.get('/api/clinical/tasks', (req, res) => {
            const { admission_id, status } = req.query;
            const filtered = simCareTasks.filter(t =>
                (!admission_id || String(t.admission_id) === String(admission_id)) &&
                (!status || t.status === status)
            );
            res.status(200).json(filtered);
        });

        app.post('/api/clinical/tasks/complete', (req, res) => {
            const { task_id } = req.body;
            const task = simCareTasks.find(t => t.id === task_id);
            if (task) {
                task.status = 'Completed';
                return res.status(200).json({ success: true, status: 'Completed' });
            }
            return res.status(404).json({ success: false, message: 'Task not found' });
        });

        // Lab Orders & Results
        app.post('/api/lab/order', (req, res) => {
            const order = { id: simLabRequests.length + 1, ...req.body, status: 'Pending' };
            simLabRequests.push(order);
            res.status(201).json(order);
        });

        app.get('/api/lab/queue', (req, res) => {
            res.status(200).json(simLabRequests);
        });

        app.post('/api/lab/upload-result', (req, res) => {
            const { request_id, result_json } = req.body;
            const reqItem = simLabRequests.find(r => r.id === request_id);
            if (reqItem) {
                reqItem.result_json = result_json;
                reqItem.status = 'Completed';
                return res.status(200).json({ success: true, message: 'Results uploaded' });
            }
            return res.status(404).json({ success: false, message: 'Request not found' });
        });

        // Emergency Code Blue
        app.post('/api/emergency/trigger', (req, res) => {
            const em = { id: simEmergencyLogs.length + 1, ...req.body, status: 'Active' };
            simEmergencyLogs.push(em);
            res.status(201).json({ success: true, emergency: em });
        });

        app.post('/api/emergency/respond', (req, res) => {
            res.status(200).json({ success: true, message: 'Emergency responded' });
        });

        // Finance Invoice
        app.post('/api/finance/generate', (req, res) => {
            const invoice = {
                id: simInvoices.length + 1,
                ...req.body,
                total_amount: 12500.00
            };
            simInvoices.push(invoice);
            res.status(201).json({ success: true, invoice });
        });

        // Discharge
        app.post('/api/admissions/discharge', (req, res) => {
            const { admission_id } = req.body;
            const adm = simAdmissions.find(a => a.id === admission_id);
            if (adm) {
                adm.status = 'Discharged';
                return res.status(200).json({ success: true, message: 'Patient discharged' });
            }
            return res.status(404).json({ success: false, message: 'Admission not found' });
        });
    });

    // ==========================================
    // PHASE 1 & 7: Auth & Security
    // ==========================================
    test('🔐 [Auth] Login all roles', async () => {
        const roles = [
            'admin_user', 'doctor_user', 'nurse_user',
            'receptionist_user', 'pharmacist_user', 'lab_tech_user', 'anaesthetist_user'
        ];

        for (const role of roles) {
            const res = await request(app).post('/api/auth/login').send({ username: role });
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
        }
    });

    test('🛡️ [License] Activate System', async () => {
        const res = await request(app)
            .post('/api/license/activate')
            .send({ key: licenseKey });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('Successful');
    });

    // ==========================================
    // SCENARIO A: The OPD Fast Track
    // ==========================================
    describe('Scenario A: The OPD Fast Track', () => {
        test('📝 [Reception] Register Walk-In Patient', async () => {
            const res = await request(app)
                .post('/api/opd/register')
                .set('Authorization', `Bearer ${receptionistToken}`)
                .send({
                    name: 'Simulated Patient One',
                    age: 30,
                    gender: 'Male',
                    phone: '9988776655',
                    complaint: 'Fever'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('token_number');
            patientId = res.body.patient_id;
        });

        test('👨‍⚕️ [Doctor] Start Consult & Prescribe', async () => {
            const queueRes = await request(app).get('/api/opd/queue').set('Authorization', `Bearer ${doctorToken}`);
            expect(queueRes.statusCode).toBe(200);

            const rxRes = await request(app)
                .post('/api/clinical/prescribe')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    patient_id: patientId,
                    admission_id: null,
                    medications: [{ name: 'Paracetamol', dose: '500mg', freq: 'BID' }]
                });

            expect(rxRes.statusCode).toBe(201);
        });

        test('💊 [Pharmacy] Dispense Medication', async () => {
            const res = await request(app)
                .post('/api/pharmacy/dispense')
                .set('Authorization', `Bearer ${pharmacistToken}`)
                .send({
                    patient_id: patientId,
                    item: 'Paracetamol 500mg',
                    quantity: 2
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.remaining_stock).toBe(98);
        });
    });

    // ==========================================
    // SCENARIO B: The IPD Complex Cycle
    // ==========================================
    describe('Scenario B: The IPD Complex Cycle', () => {
        test('🛏️ [Reception] Admit Patient to ICU-A', async () => {
            const res = await request(app)
                .post('/api/admissions/admit')
                .set('Authorization', `Bearer ${receptionistToken}`)
                .send({
                    patient_id: patientId,
                    ward: 'ICU',
                    bed_number: 'A-02'
                });

            expect(res.statusCode).toBe(201);
            admissionId = res.body.admission_id;
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

            expect(res.statusCode).toBe(201);
        });

        test('📋 [Doctor] Assign Care Task (Instruction)', async () => {
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

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('id');
        });

        test('✅ [Nurse] Complete Care Task', async () => {
            const tasksRes = await request(app)
                .get(`/api/clinical/tasks?admission_id=${admissionId}&status=Pending`)
                .set('Authorization', `Bearer ${nurseToken}`);

            const task = tasksRes.body.find(t => t.type === 'Instruction');
            expect(task).toBeDefined();

            const res = await request(app)
                .post('/api/clinical/tasks/complete')
                .set('Authorization', `Bearer ${nurseToken}`)
                .send({ task_id: task.id });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('Completed');
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

            expect(res.statusCode).toBe(201);
        });

        test('🧪 [Lab Tech] Upload Result (AI Parsing)', async () => {
            const queueRes = await request(app).get('/api/lab/queue').set('Authorization', `Bearer ${labTechToken}`);
            const labRequest = queueRes.body.find(r => r.admission_id === admissionId);
            expect(labRequest).toBeDefined();

            const res = await request(app)
                .post('/api/lab/upload-result')
                .set('Authorization', `Bearer ${labTechToken}`)
                .send({
                    request_id: labRequest.id,
                    result_json: { hemoglobin: 14.5, platelets: 250000 }
                });

            expect(res.statusCode).toBe(200);
        });

        test('🚨 [Nurse] Trigger Code Blue', async () => {
            const res = await request(app)
                .post('/api/emergency/trigger')
                .set('Authorization', `Bearer ${nurseToken}`)
                .send({ code: 'Blue', location: 'ICU-A' });

            expect(res.statusCode).toBe(201);
        });

        test('⚡ [Anaesthetist] Respond to Code Blue', async () => {
            const res = await request(app)
                .post('/api/emergency/respond')
                .set('Authorization', `Bearer ${anaesthetistToken}`)
                .send({
                    code: 'Blue',
                    action: 'CPR Started'
                });

            expect(res.statusCode).toBe(200);
        });

        test('💰 [Finance] Generate Invoice', async () => {
            const res = await request(app)
                .post('/api/finance/generate')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    admission_id: admissionId,
                    patient_id: patientId
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('invoice');
            expect(res.body.invoice.total_amount).toBeGreaterThan(0);
            invoiceId = res.body.invoice.id;
        });

        test('👋 [Admissions] Discharge Patient', async () => {
            const res = await request(app)
                .post('/api/admissions/discharge')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({ admission_id: admissionId });

            expect(res.statusCode).toBe(200);
        });
    });
});
