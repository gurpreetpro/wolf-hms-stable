/**
 * Test script for OPD Duplicate Patient Check
 * Verifies duplicate detection rules (same phone + same name -> reuse; same phone + different name -> 400).
 */

const request = require('supertest');
const express = require('express');

// Mock notification service
jest.mock('../services/notificationService', () => ({
    sendSMS: jest.fn().mockResolvedValue(true),
    sendWhatsApp: jest.fn().mockResolvedValue(true)
}));

// Mock EMPI service to prevent background unhandled async calls
jest.mock('../services/EmpiService', () => ({
    processPatientRegistration: jest.fn().mockResolvedValue({})
}));

// In-memory DB state prefixed with 'mock' for Jest scope rule
let mockPatients = [];
let mockVisits = [];

// Mock db pool
jest.mock('../db', () => ({
    pool: {
        query: jest.fn(async (sql, params = []) => {
            const queryStr = sql.toLowerCase();

            // 1. Check patient by phone
            if (queryStr.includes('from patients where phone = $1 and hospital_id = $2')) {
                const phone = params[0];
                const hospitalId = params[1];
                const matched = mockPatients.filter(p => p.phone === phone && p.hospital_id === hospitalId);
                return { rows: matched };
            }

            // 2. Fuzzy duplicate check
            if (queryStr.includes('select id, name, phone, uhid, dob, gender from patients')) {
                return { rows: [] };
            }

            // 3. Hospital settings
            if (queryStr.includes('from hospitals where id = $1')) {
                return { rows: [{ code: 'TEST', settings: {} }] };
            }

            // 4. UHID search
            if (queryStr.includes('select uhid from patients where uhid like $1')) {
                return { rows: [] };
            }

            // 5. Hub-and-spoke check
            if (queryStr.includes('parent_hospital_id, branch_type from hospitals')) {
                return { rows: [{ branch_type: 'STANDALONE' }] };
            }

            // 6. Insert new patient
            if (queryStr.includes('insert into patients')) {
                const newId = `a1b2c3d4-0000-0000-0000-${String(mockPatients.length + 1).padStart(12, '0')}`;
                const newPatient = {
                    id: newId,
                    name: params[0],
                    dob: params[1],
                    gender: params[2],
                    phone: params[3],
                    history_json: params[4],
                    hospital_id: params[5],
                    uhid: params[6],
                    abha_id: params[7],
                    global_uhid: params[8]
                };
                mockPatients.push(newPatient);
                return { rows: [{ id: newId, uhid: newPatient.uhid, global_uhid: null, abha_id: null }] };
            }

            // 7. Fetch full patient
            if (queryStr.includes('from patients where id = $1')) {
                const patient = mockPatients.find(p => p.id === params[0]);
                return { rows: patient ? [patient] : [] };
            }

            // 8. Doctor lookup
            if (queryStr.includes('from users where role =') || queryStr.includes("role = 'doctor'")) {
                return {
                    rows: [{
                        id: 10,
                        username: 'Dr. John Watson',
                        department: 'General Medicine',
                        consultation_fee: 500
                    }]
                };
            }

            // 9. Token calculation
            if (queryStr.includes('max(v.token_number)')) {
                return { rows: [{ max_token: mockVisits.length }] };
            }

            // 10. Existing visit check
            if (queryStr.includes('from opd_visits where patient_id = $1')) {
                const existing = mockVisits.filter(v => v.patient_id === params[0] && v.doctor_id === params[1]);
                return { rows: existing };
            }

            // 11. Insert opd_visit
            if (queryStr.includes('insert into opd_visits')) {
                const newVisit = {
                    id: mockVisits.length + 1,
                    patient_id: params[0],
                    doctor_id: params[1],
                    token_number: params[2],
                    status: params[3],
                    consultation_type: params[4],
                    hospital_id: params[5],
                    complaint: params[6]
                };
                mockVisits.push(newVisit);
                return { rows: [newVisit] };
            }

            // 12. Default fallback
            return { rows: [] };
        })
    }
}));

const { registerOPD } = require('../controllers/opdController');

describe('Duplicate Patient Check', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        // Middleware setting tenant hospital_id and mock user
        app.use((req, res, next) => {
            req.hospital_id = 1;
            req.user = { id: 1, role: 'receptionist', name: 'Test Receptionist' };
            next();
        });
        app.post('/api/opd/register', registerOPD);
    });

    beforeEach(() => {
        mockPatients = [];
        mockVisits = [];
    });

    test('1. Register New Patient (John, 5550001)', async () => {
        const res = await request(app)
            .post('/api/opd/register')
            .send({
                name: 'John Doe',
                age: 30,
                gender: 'Male',
                phone: '5550001',
                complaint: 'Fever'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('patient');
        expect(res.body.data.patient.name).toBe('John Doe');
        expect(mockPatients.length).toBe(1);
    });

    test('2. Register Same Patient (John, 5550001) -> Should Reuse', async () => {
        // First registration
        await request(app)
            .post('/api/opd/register')
            .send({
                name: 'John Doe',
                age: 30,
                gender: 'Male',
                phone: '5550001',
                complaint: 'Fever'
            });

        const initialPatientId = mockPatients[0].id;

        // Second registration with same name and same phone
        const res = await request(app)
            .post('/api/opd/register')
            .send({
                name: 'John Doe',
                age: 30,
                gender: 'Male',
                phone: '5550001',
                complaint: 'Cough'
            });

        // Reuses existing patient record (no new patient created)
        expect(mockPatients.length).toBe(1);
        expect(mockPatients[0].id).toBe(initialPatientId);
        expect(res.statusCode).toBe(200);
    });

    test('3. Register Different Patient (Mary, 5550001) -> Should Block with 400', async () => {
        // First register John Doe with 5550001
        await request(app)
            .post('/api/opd/register')
            .send({
                name: 'John Doe',
                age: 30,
                gender: 'Male',
                phone: '5550001',
                complaint: 'Fever'
            });

        // Try to register Mary Jane with the SAME phone 5550001
        const res = await request(app)
            .post('/api/opd/register')
            .send({
                name: 'Mary Jane',
                age: 25,
                gender: 'Female',
                phone: '5550001',
                complaint: 'Headache'
            });

        // Expect 400 Bad Request
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/already registered to John Doe/i);
        // Ensure Mary Jane was NOT added as a duplicate
        expect(mockPatients.length).toBe(1);
    });

    test('4. Register Same Name, Diff Phone (John, 5550002) -> Should Create New', async () => {
        // First registration
        await request(app)
            .post('/api/opd/register')
            .send({
                name: 'John Doe',
                age: 30,
                gender: 'Male',
                phone: '5550001',
                complaint: 'Cold'
            });

        // Second registration with same name but different phone
        const res = await request(app)
            .post('/api/opd/register')
            .send({
                name: 'John Doe',
                age: 30,
                gender: 'Male',
                phone: '5550002',
                complaint: 'Cold'
            });

        expect(res.statusCode).toBe(201);
        expect(mockPatients.length).toBe(2);
        expect(mockPatients[1].phone).toBe('5550002');
    });
});
