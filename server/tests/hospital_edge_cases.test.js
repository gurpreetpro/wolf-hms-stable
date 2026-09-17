/**
 * Hospital Edge Cases (Negative Testing & Safety Locks)
 * Verifies system safety controls:
 * 1. Bed Concurrency / Conflict Prevention
 * 2. Pharmacy Stockout Guard
 * 3. Clinical Task Discharge Safety Lock
 * 4. Role-Based Access Control (RBAC)
 */

const request = require('supertest');
const express = require('express');

// State for edge cases
let mockAdmissions = [];
let mockInventory = [
    { id: 1, name: 'Paracetamol 500mg', stock_quantity: 10, price_per_unit: 5, category: 'Analgesic' }
];
let mockCareTasks = [];

// Mock DB pool
const mockDb = {
    query: jest.fn(async (sql, params = []) => {
        const queryStr = sql.toLowerCase();

        // 1. Bed check for admission
        if (queryStr.includes("from admissions where ward = $1 and bed_number = $2 and status = 'admitted'")) {
            const ward = params[0];
            const bedNumber = params[1];
            const occupied = mockAdmissions.filter(a => a.ward === ward && a.bed_number === bedNumber && a.status === 'Admitted');
            return { rows: occupied };
        }

        // 2. Bed status check in beds table
        if (queryStr.includes('from beds where')) {
            return { rows: [{ status: 'Available' }] };
        }

        // 3. Patient already admitted check
        if (queryStr.includes("from admissions where patient_id = $1 and status = 'admitted'")) {
            const patientAdmitted = mockAdmissions.filter(a => a.patient_id === params[0] && a.status === 'Admitted');
            return { rows: patientAdmitted };
        }

        // 4. Hospital code & settings
        if (queryStr.includes('from hospitals where id = $1')) {
            return { rows: [{ code: 'TEST', settings: {} }] };
        }

        // 5. Existing IPD numbers
        if (queryStr.includes('from admissions where ipd_number like $1')) {
            return { rows: [] };
        }

        // 6. Insert new admission
        if (queryStr.includes('insert into admissions')) {
            const newAdm = {
                id: mockAdmissions.length + 1,
                patient_id: params[0],
                ward: params[1],
                bed_number: params[2],
                status: 'Admitted',
                ipd_number: `IP-26-${String(mockAdmissions.length + 1).padStart(5, '0')}`
            };
            mockAdmissions.push(newAdm);
            return { rows: [newAdm] };
        }

        // 7. Inventory lookup
        if (queryStr.includes('from inventory_items where name = $1')) {
            const item = mockInventory.find(i => i.name.toLowerCase() === (params[0] || '').toLowerCase());
            return { rows: item ? [item] : [] };
        }

        // 8. Patient history for allergy check
        if (queryStr.includes('select history_json from patients')) {
            return { rows: [{ history_json: { allergies: [] } }] };
        }

        // 9. Update inventory item stock
        if (queryStr.includes('update inventory_items set stock_quantity = stock_quantity - $1')) {
            const qty = params[0];
            const name = params[1];
            const item = mockInventory.find(i => i.name.toLowerCase() === name.toLowerCase() && i.stock_quantity >= qty);
            if (item) {
                item.stock_quantity -= qty;
                return { rows: [{ stock_quantity: item.stock_quantity, price_per_unit: item.price_per_unit, id: item.id }] };
            }
            return { rows: [] }; // Insufficient stock
        }

        // 10. Discharge: check pending care tasks
        if (queryStr.includes("from care_tasks") || queryStr.includes("from clinical_tasks") || queryStr.includes("status = 'pending'")) {
            const pending = mockCareTasks.filter(t => t.status === 'Pending');
            return { rows: pending };
        }

        // 11. Discharge: fetch admission record
        if (queryStr.includes('from admissions where id = $1')) {
            const adm = mockAdmissions.find(a => a.id === params[0]);
            return { rows: adm ? [adm] : [] };
        }

        // 12. Discharge: update admission to Discharged
        if (queryStr.includes("update admissions set status = 'discharged'")) {
            return { rows: [{ id: params[params.length - 2] || 1, status: 'Discharged' }] };
        }

        // 13. Bed update on discharge
        if (queryStr.includes('update beds set status =')) {
            return { rows: [] };
        }

        return { rows: [] };
    })
};

jest.mock('../config/db', () => mockDb);
jest.mock('../db', () => ({ pool: mockDb }));

// Mock helper functions
jest.mock('../controllers/chargesController', () => ({
    createChargeHelper: jest.fn().mockResolvedValue({})
}));

// Mock InsuranceWorkflowService to prevent external DB calls
jest.mock('../services/insurance/InsuranceWorkflowService', () => ({
    triggerPreAuthDraft: jest.fn().mockResolvedValue(null)
}));

const { admitPatient, dischargePatient } = require('../controllers/admissionController');
const { dispense } = require('../controllers/pharmacyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

describe('🛑 Hospital Edge Cases (Safety & RBAC Negative Testing)', () => {
    let app;
    const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_hardening_testing_purpose';
    process.env.JWT_SECRET = JWT_SECRET;

    const standardClaims = { iss: 'wolf-hms', aud: 'wolf-hms-api', hospital_id: 1 };
    const nurseToken = jwt.sign({ id: 2, role: 'nurse', ...standardClaims }, JWT_SECRET);
    const adminToken = jwt.sign({ id: 1, role: 'admin', ...standardClaims }, JWT_SECRET);
    const pharmacistToken = jwt.sign({ id: 3, role: 'pharmacist', ...standardClaims }, JWT_SECRET);
    const validPatientId = '12345678-1234-1234-1234-123456789012';

    beforeAll(() => {
        app = express();
        app.use(express.json());

        // Routes
        app.post('/api/admissions/admit', (req, res, next) => { req.hospital_id = 1; next(); }, admitPatient);
        app.post('/api/pharmacy/dispense', protect, authorize('pharmacist', 'admin'), (req, res, next) => { req.hospital_id = 1; next(); }, dispense);
        app.post('/api/admissions/discharge', (req, res, next) => { req.hospital_id = 1; next(); }, dischargePatient);
        app.get('/api/admin/users', protect, authorize('admin', 'super_admin'), (req, res) => {
            res.status(200).json({ success: true, users: [] });
        });
    });

    beforeEach(() => {
        mockAdmissions = [];
        mockCareTasks = [];
        mockInventory = [
            { id: 1, name: 'Paracetamol 500mg', stock_quantity: 10, price_per_unit: 5, category: 'Analgesic' }
        ];
    });

    test('🛏️ 1. The Bed Conflict (Occupied Bed Prevention)', async () => {
        // Admit Patient A to ICU-Bed-1
        const res1 = await request(app)
            .post('/api/admissions/admit')
            .send({ patient_id: validPatientId, ward: 'ICU', bed_number: 'ICU-Bed-1' });

        expect(res1.statusCode).toBe(201);
        expect(res1.body.success).toBe(true);

        // Try to Admit Patient B to the SAME occupied Bed
        const res2 = await request(app)
            .post('/api/admissions/admit')
            .send({ patient_id: '87654321-4321-4321-4321-210987654321', ward: 'ICU', bed_number: 'ICU-Bed-1' });

        expect(res2.statusCode).toBe(400);
        expect(res2.body.message).toMatch(/occupied/i);
    });

    test('💊 2. The Stockout (Inventory Limit Enforcement)', async () => {
        // Current stock is 10, try to dispense 50
        const res = await request(app)
            .post('/api/pharmacy/dispense')
            .set('Authorization', `Bearer ${pharmacistToken}`)
            .send({ patient_id: validPatientId, item: 'Paracetamol 500mg', quantity: 50 });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/insufficient stock/i);
    });

    test('🔒 3. The Blocked Discharge (Pending Tasks Safety Lock)', async () => {
        // Pre-create admission
        mockAdmissions.push({
            id: 101,
            patient_id: validPatientId,
            ward: 'ICU',
            bed_number: 'ICU-Bed-1',
            status: 'Admitted',
            hospital_id: 1
        });

        // Add a pending care task for this patient
        mockCareTasks.push({
            id: 501,
            patient_id: validPatientId,
            admission_id: 101,
            type: 'Medication',
            description: 'Pending IV dose',
            status: 'Pending'
        });

        // Attempt discharge with pending tasks
        const res = await request(app)
            .post('/api/admissions/discharge')
            .send({ admission_id: 101 });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/pending/i);
    });

    test('🚫 4. The Unauthorized Access (RBAC Enforcement)', async () => {
        // Nurse tries to access Admin route -> 403 Forbidden
        const resNurse = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${nurseToken}`);

        expect(resNurse.statusCode).toBe(403);

        // Admin accesses Admin route -> 200 OK
        const resAdmin = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(resAdmin.statusCode).toBe(200);
        expect(resAdmin.body.success).toBe(true);
    });
});
