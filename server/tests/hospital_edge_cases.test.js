const request = require('supertest');
const { pool, app } = require('../server');
const { generateLicense } = require('../utils/licenseUtil');

describe('🛑 Hospital Edge Cases (Negative Testing)', () => {
    jest.setTimeout(60000);

    let adminToken, doctorToken, nurseToken, pharmacistToken, receptionistToken;
    let patientId1, patientId2, admissionId;
    let licenseKey;

    beforeAll(async () => {
        // 1. Generate License
        licenseKey = generateLicense('Test Hospital', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
        await request(app).post('/api/license/activate').send({ key: licenseKey });

        // 2. Login Roles
        const roles = [
            { user: 'admin_user', pass: 'password123', setter: t => adminToken = t },
            { user: 'doctor_user', pass: 'password123', setter: t => doctorToken = t },
            { user: 'nurse_user', pass: 'password123', setter: t => nurseToken = t },
            { user: 'pharmacist_user', pass: 'password123', setter: t => pharmacistToken = t },
            { user: 'receptionist_user', pass: 'password123', setter: t => receptionistToken = t }
        ];

        for (const r of roles) {
            const res = await request(app).post('/api/auth/login').send({ username: r.user, password: r.pass });
            if (res.statusCode !== 200) throw new Error(`Failed to login ${r.user}`);
            r.setter(res.body.token);
        }

        // 3. Register Two Patients
        const p1 = await request(app).post('/api/opd/register').set('Authorization', `Bearer ${receptionistToken}`)
            .send({ name: 'Patient A', age: 30, gender: 'Male', phone: '1111111111', complaint: 'Test' });
        patientId1 = p1.body.patient_id;

        const p2 = await request(app).post('/api/opd/register').set('Authorization', `Bearer ${receptionistToken}`)
            .send({ name: 'Patient B', age: 30, gender: 'Female', phone: '2222222222', complaint: 'Test' });
        patientId2 = p2.body.patient_id;
    });

    afterAll(async () => {
        await pool.end();
    });

    // 1. The Bed Conflict
    test('🛏️ 1. The Bed Conflict (Concurrency)', async () => {
        // Admit Patient A to ICU-Bed-1
        const res1 = await request(app).post('/api/admissions/admit').set('Authorization', `Bearer ${receptionistToken}`)
            .send({ patient_id: patientId1, ward: 'ICU', bed_number: 'ICU-Bed-1' });
        expect(res1.statusCode).toEqual(201);
        admissionId = res1.body.admission_id;

        // Try to Admit Patient B to SAME Bed
        const res2 = await request(app).post('/api/admissions/admit').set('Authorization', `Bearer ${receptionistToken}`)
            .send({ patient_id: patientId2, ward: 'ICU', bed_number: 'ICU-Bed-1' });

        expect(res2.statusCode).toEqual(400);
        expect(res2.body.message).toMatch(/occupied/i);
        console.log('✅ 1. Bed Conflict Blocked Successfully.');
    });

    // 2. The Stockout
    test('💊 2. The Stockout (Inventory Limit)', async () => {
        // Set Paracetamol stock to 10
        await pool.query("UPDATE inventory_items SET stock_quantity = 10 WHERE name = 'Paracetamol 500mg'");

        // Try to dispense 50
        const res = await request(app).post('/api/pharmacy/dispense').set('Authorization', `Bearer ${pharmacistToken}`)
            .send({ patient_id: patientId1, item: 'Paracetamol 500mg', quantity: 50 });

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toMatch(/insufficient stock/i);
        console.log('✅ 2. Stockout Blocked Successfully.');
    });

    // 3. The Blocked Discharge
    test('🔒 3. The Blocked Discharge (Safety Lock)', async () => {
        // Create a Pending Task for Patient A (who is admitted)
        await pool.query(`
            INSERT INTO care_tasks (patient_id, admission_id, type, description, status)
            VALUES ($1, $2, 'Medication', 'Pending Meds', 'Pending')
        `, [patientId1, admissionId]);

        // Try to Discharge
        const res = await request(app).post('/api/admissions/discharge').set('Authorization', `Bearer ${receptionistToken}`)
            .send({ admission_id: admissionId });

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toMatch(/pending/i);
        console.log('✅ 3. Discharge Blocked due to Pending Tasks.');
    });

    // 4. The Unauthorized Access
    test('🚫 4. The Unauthorized Access (Security)', async () => {
        // Nurse tries to access Admin route
        const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${nurseToken}`);

        expect(res.statusCode).toEqual(403);
        // Admin should succeed
        const resAdmin = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
        expect(resAdmin.statusCode).toEqual(200);

        console.log('✅ 4. Unauthorized Access Blocked.');
    });

});
