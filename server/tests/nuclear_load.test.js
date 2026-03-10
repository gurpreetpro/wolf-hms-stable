const request = require('supertest');
const { pool, app } = require('../server');
const { generateLicense } = require('../utils/licenseUtil');
const fs = require('fs');
const path = require('path');

let adminToken, doctorToken, nurseToken, pharmacistToken, receptionistToken;
let patientIds = []; // Array to store 10 patient IDs

describe('☢️ NUCLEAR LOAD TESTS (Concurrency & Race Conditions)', () => {

    beforeAll(async () => {
        // 1. Setup License
        const licenseKey = generateLicense('Chaos Hospital', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
        const licensePath = path.join(__dirname, '../license.key');
        fs.writeFileSync(licensePath, licenseKey);
        await request(app).post('/api/license/activate').send({ key: licenseKey });

        // 2. Login Users
        const adminRes = await request(app).post('/api/auth/login').send({ username: 'admin_user', password: 'password123' });
        if (adminRes.statusCode !== 200) console.error('Admin Login Failed:', adminRes.body);
        adminToken = adminRes.body.token;

        const doctorRes = await request(app).post('/api/auth/login').send({ username: 'doctor_user', password: 'password123' });
        if (doctorRes.statusCode !== 200) console.error('Doctor Login Failed:', doctorRes.body);
        doctorToken = doctorRes.body.token;

        const nurseRes = await request(app).post('/api/auth/login').send({ username: 'nurse_user', password: 'password123' });
        if (nurseRes.statusCode !== 200) console.error('Nurse Login Failed:', nurseRes.body);
        nurseToken = nurseRes.body.token;

        const pharmRes = await request(app).post('/api/auth/login').send({ username: 'pharmacist_user', password: 'password123' });
        if (pharmRes.statusCode !== 200) console.error('Pharmacist Login Failed:', pharmRes.body);
        pharmacistToken = pharmRes.body.token;

        const recepRes = await request(app).post('/api/auth/login').send({ username: 'receptionist_user', password: 'password123' });
        if (recepRes.statusCode !== 200) console.error('Receptionist Login Failed:', recepRes.body);
        receptionistToken = recepRes.body.token;

        // 3. Clear relevant tables - REMOVED to prevent interfering with parallel hospital_simulation
        // await pool.query('TRUNCATE TABLE admissions, bed_history, care_tasks RESTART IDENTITY CASCADE');
        // await pool.query('UPDATE beds SET status = \'Available\'');

        // Instead, ensure specific test resources are available
        await pool.query("UPDATE beds SET status = 'Available' WHERE bed_number = 'ICU-1'");
        // Clean up any existing admissions for ICU-1 to avoid foreign key issues or false positives (soft cleanup)
        await pool.query("DELETE FROM admissions WHERE bed_number = 'ICU-1'");

        // 4. Create 10 Patients for the stampede
        for (let i = 0; i < 10; i++) {
            const res = await request(app).post('/api/opd/register').set('Authorization', `Bearer ${receptionistToken}`).send({
                name: ` racer_${i}`, age: 25, gender: 'Male', phone: `999000${i}`, complaint: 'Racing Heart'
            });
            if (res.statusCode !== 201) console.error('Registration Failed:', res.statusCode, JSON.stringify(res.body));
            patientIds.push(res.body.patient_id);
        }
        console.log('Patient IDs:', patientIds);

    });

    afterAll(async () => {
        await pool.end();
    });

    test('🏃 1. The Bed Stampede (10 Nurses -> 1 Bed)', async () => {
        // Target Bed: ICU-1
        const targetWard = 'ICU';
        const targetBed = 'ICU-1';

        console.log(`⚡ Launching 10 concurrent admission requests for ${targetBed}...`);

        // Prepare 10 promises
        const promises = patientIds.map(pid => {
            return request(app).post('/api/admissions/admit').set('Authorization', `Bearer ${receptionistToken}`).send({
                patient_id: pid,
                ward: targetWard,
                bed_number: targetBed
            });
        });

        // FIRE!
        const results = await Promise.all(promises);

        console.log('Status Codes:', results.map(r => r.statusCode));

        // Analyze results
        const successes = results.filter(r => r.statusCode === 201);
        const failures = results.filter(r => r.statusCode === 400); // 400 Bed Occupied
        if (failures.length > 0) {
            console.log('First Failure Body:', failures[0].body);
        }
        const errors = results.filter(r => r.statusCode === 500);

        console.log(`📊 Result: ${successes.length} Successes, ${failures.length} Rejections, ${errors.length} Errors`);

        // Verification
        // ONLY 1 should succeed
        expect(successes.length).toBe(1);
        // 9 should fail
        expect(failures.length).toBe(9);

        // DB Verification
        const dbCheck = await pool.query(
            "SELECT * FROM admissions WHERE ward = $1 AND bed_number = $2 AND status = 'Admitted'",
            [targetWard, targetBed]
        );
        expect(dbCheck.rows.length).toBe(1);
    });

    test('💊 2. The Last Vial (10 Pharmacists -> 1 Item)', async () => {
        // Setup: Create "Unobtanium" with stock 1
        const itemName = 'Unobtanium';
        await pool.query(
            "INSERT INTO inventory_items (name, stock_quantity, price_per_unit, expiry_date) VALUES ($1, 1, 1000, '2030-01-01') ON CONFLICT (name) DO UPDATE SET stock_quantity = 1",
            [itemName]
        );

        // We use the first patient for all requests (doesn't matter for this test)
        const pid = patientIds[0];

        console.log(`⚡ Launching 10 concurrent dispense requests for ${itemName} (Stock: 1)...`);

        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(
                request(app).post('/api/pharmacy/dispense').set('Authorization', `Bearer ${pharmacistToken}`).send({
                    patient_id: pid,
                    item: itemName,
                    quantity: 1
                })
            );
        }

        const results = await Promise.all(promises);

        const successes = results.filter(r => r.statusCode === 201 || r.statusCode === 200);
        const failures = results.filter(r => r.statusCode === 400); // Insufficient stock

        console.log(`📊 Result: ${successes.length} Successes, ${failures.length} Rejections`);

        // ONLY 1 should succeed
        expect(successes.length).toBe(1);
        expect(failures.length).toBe(9);

        // DB Verification
        const dbCheck = await pool.query("SELECT stock_quantity FROM inventory_items WHERE name = $1", [itemName]);
        expect(dbCheck.rows[0].stock_quantity).toBe(0); // Should not be negative
    });

});
