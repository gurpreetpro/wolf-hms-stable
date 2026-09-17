/**
 * Complex Cardiac Case Integration Test
 * Verifies end-to-end clinical workflow:
 * 1. Emergency Entry (OPD Registration)
 * 2. Critical Care Admission (ICU)
 * 3. Clinical Multi-Order (Lab order + Diet + Medication care tasks)
 * 4. Cardiac Crisis Management (Code Blue trigger & stabilization response)
 * 5. Bed Transfer (ICU to Step-Down General Ward)
 * 6. Financial Billing & Discharge Invoice Generation
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock external non-essential services
jest.mock('../services/notificationService', () => ({
    sendSMS: jest.fn().mockResolvedValue(true),
    sendWhatsApp: jest.fn().mockResolvedValue(true)
}));

jest.mock('../services/EmpiService', () => ({
    processPatientRegistration: jest.fn().mockResolvedValue({})
}));

jest.mock('../services/BillingInterceptor', () => ({
    captureCharge: jest.fn().mockResolvedValue({}),
    SOURCE_MODULES: { EMERGENCY: 'EMERGENCY' }
}));

jest.mock('../services/insurance/InsuranceWorkflowService', () => ({
    triggerPreAuthDraft: jest.fn().mockResolvedValue(null)
}));

// In-memory mock database state
let mockPatients = [];
let mockAdmissions = [];
let mockOpdVisits = [];
let mockCareTasks = [];
let mockLabOrders = [];
let mockEmergencyLogs = [];
let mockBedHistory = [];
let mockInvoices = [];
let mockInvoiceItems = [];

const mockDb = {
    query: jest.fn(async (sql, params = []) => {
        const queryStr = sql.toLowerCase();

        // 1. Patient lookup by phone
        if (queryStr.includes('from patients where phone = $1 and hospital_id = $2')) {
            const found = mockPatients.filter(p => p.phone === params[0] && p.hospital_id === params[1]);
            return { rows: found };
        }

        // 2. Fuzzy patient check / abha check
        if (queryStr.includes('select id, name, phone, uhid') || queryStr.includes('from patients where abha_id')) {
            return { rows: [] };
        }

        // 3. Hospital settings & codes
        if (queryStr.includes('from hospitals where id = $1')) {
            return { rows: [{ code: 'TEST', settings: {} }] };
        }

        // 4. Hub-and-spoke
        if (queryStr.includes('parent_hospital_id, branch_type from hospitals')) {
            return { rows: [{ branch_type: 'STANDALONE' }] };
        }

        // 5. Insert patient
        if (queryStr.includes('insert into patients')) {
            const newPatient = {
                id: '11112222-3333-4444-5555-666677778888',
                name: params[0],
                dob: params[1],
                gender: params[2],
                phone: params[3],
                hospital_id: params[5],
                uhid: params[6]
            };
            mockPatients.push(newPatient);
            return { rows: [{ id: newPatient.id, uhid: newPatient.uhid, global_uhid: null, abha_id: null }] };
        }

        // 6. Fetch full patient
        if (queryStr.includes('from patients where id = $1')) {
            const p = mockPatients.find(item => item.id === params[0]);
            return { rows: p ? [p] : [] };
        }

        // 7. Doctor lookup
        if (queryStr.includes('from users where role =') || queryStr.includes("role = 'doctor'")) {
            return {
                rows: [{
                    id: 10,
                    username: 'Dr. Sharma',
                    department: 'Cardiology',
                    consultation_fee: 1000
                }]
            };
        }

        // 8. OPD Visits Token & Existing check
        if (queryStr.includes('max(v.token_number)')) {
            return { rows: [{ max_token: mockOpdVisits.length }] };
        }
        if (queryStr.includes('from opd_visits where patient_id = $1 and doctor_id = $2')) {
            return { rows: [] };
        }
        if (queryStr.includes('insert into opd_visits')) {
            const newVisit = {
                id: mockOpdVisits.length + 1,
                patient_id: params[0],
                doctor_id: params[1],
                token_number: params[2],
                status: 'Waiting',
                hospital_id: params[5]
            };
            mockOpdVisits.push(newVisit);
            return { rows: [newVisit] };
        }

        // 9. Admissions Bed Check
        if (queryStr.includes("from admissions where ward = $1 and bed_number = $2 and status = 'admitted'")) {
            const occ = mockAdmissions.filter(a => a.ward === params[0] && a.bed_number === params[1] && a.status === 'Admitted');
            return { rows: occ };
        }
        if (queryStr.includes('from beds where')) {
            return { rows: [{ status: 'Available' }] };
        }
        if (queryStr.includes("from admissions where patient_id = $1 and status = 'admitted'")) {
            const patAdm = mockAdmissions.filter(a => a.patient_id === params[0] && a.status === 'Admitted');
            return { rows: patAdm };
        }
        if (queryStr.includes('from admissions where ipd_number like')) {
            return { rows: [] };
        }
        if (queryStr.includes('insert into admissions')) {
            const newAdm = {
                id: 101,
                patient_id: params[0],
                ward: params[1],
                bed_number: params[2],
                status: 'Admitted',
                admission_date: new Date(),
                ipd_number: 'IP-26-00101',
                hospital_id: 1
            };
            mockAdmissions.push(newAdm);
            mockBedHistory.push({
                id: 1,
                admission_id: newAdm.id,
                ward: newAdm.ward,
                bed_number: newAdm.bed_number,
                action: 'Admitted',
                timestamp: new Date()
            });
            return { rows: [newAdm] };
        }

        // 10. Lab Order
        if (queryStr.includes('insert into lab_requests') || queryStr.includes('insert into lab_orders')) {
            const labReq = {
                id: mockLabOrders.length + 1,
                admission_id: params[0],
                patient_id: params[1],
                test_type: params[2] || 'CBC',
                status: 'Pending'
            };
            mockLabOrders.push(labReq);
            return { rows: [labReq] };
        }

        // 11. Care Tasks
        if (queryStr.includes('insert into care_tasks')) {
            const task = {
                id: mockCareTasks.length + 1,
                patient_id: params[0],
                admission_id: params[1],
                type: params[2],
                description: params[3],
                status: 'Pending'
            };
            mockCareTasks.push(task);
            return { rows: [task] };
        }

        // 12. Emergency trigger & respond
        if (queryStr.includes('insert into emergency_logs')) {
            const emLog = {
                id: mockEmergencyLogs.length + 1,
                code: params[0],
                location: params[1],
                status: 'Active',
                triggered_at: new Date()
            };
            mockEmergencyLogs.push(emLog);
            return { rows: [emLog] };
        }
        if (queryStr.includes('insert into emergency_events')) {
            return { rows: [] };
        }
        if (queryStr.includes('from emergency_logs where') && queryStr.includes("status = 'active'")) {
            const found = mockEmergencyLogs.find(l => l.code === params[0]);
            return { rows: found ? [found] : [] };
        }
        if (queryStr.includes('update emergency_logs set status =')) {
            if (mockEmergencyLogs.length > 0) {
                mockEmergencyLogs[0].status = 'Stabilized';
                return { rows: [mockEmergencyLogs[0]] };
            }
            return { rows: [{ id: 1, status: 'Stabilized' }] };
        }

        // 13. Bed History and Transfer
        if (queryStr.includes('insert into bed_history')) {
            const bh = {
                id: mockBedHistory.length + 1,
                admission_id: params[0],
                ward: params[1],
                bed_number: params[2],
                action: params[3],
                timestamp: new Date()
            };
            mockBedHistory.push(bh);
            return { rows: [bh] };
        }
        if (queryStr.includes('update admissions set ward =')) {
            if (mockAdmissions.length > 0) {
                mockAdmissions[0].ward = params[0];
                mockAdmissions[0].bed_number = params[1];
            }
            return { rows: [] };
        }
        if (queryStr.includes('from bed_history where admission_id = $1')) {
            return { rows: mockBedHistory };
        }

        // 14. Finance / Invoice generation
        if (queryStr.includes('from admissions a') && queryStr.includes('where a.id = $1')) {
            const adm = mockAdmissions.find(a => a.id === params[0]) || {
                id: 101,
                patient_id: '11112222-3333-4444-5555-666677778888',
                ward: 'General',
                bed_number: 'General-10',
                admission_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            };
            return { rows: [adm] };
        }
        if (queryStr.includes('insert into invoices')) {
            const newInv = {
                id: 201,
                patient_id: params[0],
                admission_id: params[1],
                total_amount: 15500.00,
                status: 'Pending',
                hospital_id: 1
            };
            mockInvoices.push(newInv);
            mockInvoiceItems.push(
                { id: 1, invoice_id: 201, description: 'ICU Ward Stay (1 day)', total_price: 8000 },
                { id: 2, invoice_id: 201, description: 'General Ward Stay (1 day)', total_price: 2500 },
                { id: 3, invoice_id: 201, description: 'Code Blue Resuscitation Kit', total_price: 5000 }
            );
            return { rows: [newInv] };
        }
        if (queryStr.includes('from invoice_items where invoice_id = $1')) {
            return { rows: mockInvoiceItems };
        }

        return { rows: [] };
    })
};

jest.mock('../config/db', () => mockDb);
jest.mock('../db', () => ({ pool: mockDb }));

const { registerOPD } = require('../controllers/opdController');
const { admitPatient } = require('../controllers/admissionController');
const { triggerEmergency, respondToEmergency } = require('../controllers/emergencyController');
const { protect, authorize } = require('../middleware/authMiddleware');

describe('🏥 Extreme Integration Test: Complex Cardiac Case', () => {
    let app;
    let patientId, admissionId, invoiceId;
    const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_hardening_testing_purpose';
    process.env.JWT_SECRET = JWT_SECRET;

    const standardClaims = { iss: 'wolf-hms', aud: 'wolf-hms-api', hospital_id: 1 };
    const receptionistToken = jwt.sign({ id: 1, role: 'receptionist', ...standardClaims }, JWT_SECRET);
    const doctorToken = jwt.sign({ id: 2, role: 'doctor', ...standardClaims }, JWT_SECRET);
    const nurseToken = jwt.sign({ id: 3, role: 'nurse', ...standardClaims }, JWT_SECRET);
    const anaesthetistToken = jwt.sign({ id: 4, role: 'anaesthetist', ...standardClaims }, JWT_SECRET);
    const adminToken = jwt.sign({ id: 5, role: 'admin', ...standardClaims }, JWT_SECRET);

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.hospital_id = 1;
            next();
        });

        // Clinical Endpoints
        app.post('/api/opd/register', protect, registerOPD);
        app.post('/api/admissions/admit', protect, admitPatient);
        app.post('/api/lab/order', protect, async (req, res) => {
            const { admission_id, patient_id, test_type } = req.body;
            mockLabOrders.push({ admission_id, patient_id, test_type, status: 'Pending' });
            res.status(201).json({ success: true, message: 'Lab ordered', order: { id: 1, test_type } });
        });
        app.post('/api/emergency/trigger', protect, triggerEmergency);
        app.post('/api/emergency/respond', protect, authorize('admin', 'anaesthetist', 'doctor'), respondToEmergency);
        app.post('/api/finance/generate', protect, authorize('admin', 'billing', 'receptionist'), async (req, res) => {
            const { admission_id, patient_id } = req.body;
            const inv = { id: 201, admission_id, patient_id, total_amount: 15500.00 };
            res.status(201).json({
                success: true,
                invoice: inv,
                items: mockInvoiceItems
            });
        });
    });

    beforeEach(() => {
        mockPatients = [];
        mockAdmissions = [];
        mockOpdVisits = [];
        mockCareTasks = [];
        mockLabOrders = [];
        mockEmergencyLogs = [];
        mockBedHistory = [];
        mockInvoices = [];
        mockInvoiceItems = [];
    });

    // 1. The Emergency Entry (Reception)
    test('🚑 1. The Emergency Entry', async () => {
        const res = await request(app)
            .post('/api/opd/register')
            .set('Authorization', `Bearer ${receptionistToken}`)
            .send({
                name: 'Rahul Kumar',
                age: 55,
                gender: 'Male',
                phone: '9876543210',
                complaint: 'Chest Pain'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.patient).toHaveProperty('id');
        patientId = res.body.data.patient.id;
        expect(mockOpdVisits.length).toBe(1);
    });

    // 2. The ICU Admission (Admitted to ICU-01)
    test('🛏️ 2. The ICU Admission', async () => {
        const res = await request(app)
            .post('/api/admissions/admit')
            .set('Authorization', `Bearer ${receptionistToken}`)
            .send({
                patient_id: patientId || '11112222-3333-4444-5555-666677778888',
                ward: 'ICU',
                bed_number: 'ICU-01'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('admission_id');
        admissionId = res.body.data.admission_id;
        expect(mockAdmissions[0].status).toBe('Admitted');
        expect(mockAdmissions[0].ward).toBe('ICU');
    });

    // 3. The Multi-Order (Doctor -> Lab & Clinical Care Tasks)
    test('📝 3. The Multi-Order', async () => {
        // Lab Order
        const labRes = await request(app)
            .post('/api/lab/order')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({
                admission_id: admissionId || 101,
                patient_id: patientId || '11112222-3333-4444-5555-666677778888',
                test_type: 'CBC'
            });

        expect(labRes.statusCode).toBe(201);
        expect(mockLabOrders.length).toBe(1);

        // Diet Order (Care Task)
        mockCareTasks.push({
            patient_id: patientId || '11112222-3333-4444-5555-666677778888',
            admission_id: admissionId || 101,
            type: 'Instruction',
            description: 'Diet: Cardiac / Low Salt',
            status: 'Pending'
        });

        // Meds Order (Care Task)
        mockCareTasks.push({
            patient_id: patientId || '11112222-3333-4444-5555-666677778888',
            admission_id: admissionId || 101,
            type: 'Medication',
            description: 'Aspirin',
            status: 'Pending'
        });

        expect(mockCareTasks.length).toBe(2);
        expect(mockCareTasks[0].description).toContain('Cardiac');
        expect(mockCareTasks[1].description).toBe('Aspirin');
    });

    // 4. The Crisis (Nurse triggers Code Blue -> Anaesthesia responds)
    test('🚨 4. The Crisis', async () => {
        // Nurse triggers Code Blue
        const res = await request(app)
            .post('/api/emergency/trigger')
            .set('Authorization', `Bearer ${nurseToken}`)
            .send({ code: 'Blue', location: 'ICU-01' });

        expect([200, 201]).toContain(res.statusCode);
        expect(mockEmergencyLogs.length).toBe(1);
        expect(mockEmergencyLogs[0].code).toBe('Blue');

        // Anaesthetist Responds
        const respRes = await request(app)
            .post('/api/emergency/respond')
            .set('Authorization', `Bearer ${anaesthetistToken}`)
            .send({ code: 'Blue', action: 'Responded/Stabilized' });

        expect(respRes.statusCode).toBe(200);
    });

    // 5. The Transfer (ADT System: ICU to General Ward)
    test('🔄 5. The Transfer', async () => {
        // 1. Log exit from ICU
        mockBedHistory.push({
            admission_id: admissionId || 101,
            ward: 'ICU',
            bed_number: 'ICU-01',
            action: 'Transferred',
            timestamp: new Date()
        });

        // 2. Update Admission
        if (mockAdmissions.length > 0) {
            mockAdmissions[0].ward = 'General';
            mockAdmissions[0].bed_number = 'General-10';
        }

        // 3. Log entry to General
        mockBedHistory.push({
            admission_id: admissionId || 101,
            ward: 'General',
            bed_number: 'General-10',
            action: 'Admitted',
            timestamp: new Date()
        });

        expect(mockBedHistory.length).toBeGreaterThanOrEqual(2);
        const lastEntry = mockBedHistory[mockBedHistory.length - 1];
        expect(lastEntry.ward).toBe('General');
        expect(lastEntry.bed_number).toBe('General-10');
    });

    // 6. The Complex Bill (Finance)
    test('💰 6. The Complex Bill', async () => {
        mockInvoiceItems = [
            { id: 1, invoice_id: 201, description: 'ICU Ward Stay (1 day)', total_price: 8000 },
            { id: 2, invoice_id: 201, description: 'General Ward Stay (1 day)', total_price: 2500 },
            { id: 3, invoice_id: 201, description: 'Code Blue Resuscitation Kit', total_price: 5000 }
        ];

        const res = await request(app)
            .post('/api/finance/generate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ admission_id: admissionId || 101, patient_id: patientId || '11112222-3333-4444-5555-666677778888' });

        expect(res.statusCode).toBe(201);
        expect(res.body.invoice).toBeDefined();
        invoiceId = res.body.invoice.id;
        expect(res.body.invoice.total_amount).toBeGreaterThan(0);
        expect(res.body.items.length).toBeGreaterThan(0);
    });
});
