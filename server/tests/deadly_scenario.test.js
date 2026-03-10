const request = require('supertest');
const { pool, app } = require('../server');
const { generateLicense } = require('../utils/licenseUtil');
const fs = require('fs');
const path = require('path');

// MOCK Gemini AI
jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: jest.fn().mockImplementation(async (prompt) => {
                    const p = prompt.toLowerCase();
                    let text = '';
                    if (p.includes('sql result')) {
                        // Summary call - return the friendly answer with BP info
                        text = "The latest vitals show BP: 120/80, Pulse: 72 bpm. The patient is stable.";
                    } else if (p.includes('convert') || p.includes('postgresql') || p.includes('database')) {
                        // SQL generation call
                        text = "SELECT * FROM vitals_logs ORDER BY recorded_at DESC LIMIT 1";
                    } else {
                        text = "I don't understand.";
                    }
                    return { response: { text: () => text } };
                })
            })
        }))
    };
});

describe('🔥 Deadly Extreme System Test', () => {
    jest.setTimeout(120000); // 2 minutes for chaos

    let adminToken, doctorToken, nurseToken, pharmacistToken, receptionistToken;
    let licenseKey;
    let patientId, admissionId;

    beforeAll(async () => {
        console.log('🚀 [Setup] Starting Deadly Scenario...');

        // License
        licenseKey = generateLicense('Chaos Hospital', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
        const licensePath = path.join(__dirname, '../license.key');
        fs.writeFileSync(licensePath, licenseKey);
        await request(app).post('/api/license/activate').send({ key: licenseKey });

        // Login Roles
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
        console.log('✅ [Setup] All Roles Logged In.');
    });

    afterAll(async () => {
        await pool.end();
    });

    // 1. The Double Emergency
    test('🚨 1. The Double Emergency (Reception -> Emergency)', async () => {
        // Register Patient
        const regRes = await request(app).post('/api/opd/register').set('Authorization', `Bearer ${receptionistToken}`).send({
            name: 'Senator X', age: 60, gender: 'Male', phone: '9999999999', complaint: 'Chest Pain', doctor_id: 1
        });
        expect(regRes.statusCode).toBe(201);
        patientId = regRes.body.patient_id;

        // Trigger Code Red
        const redRes = await request(app).post('/api/emergency/trigger').set('Authorization', `Bearer ${nurseToken}`).send({
            code: 'Red', location: 'Reception'
        });
        expect(redRes.statusCode).toBe(201);

        // Trigger Code Blue
        const blueRes = await request(app).post('/api/emergency/trigger').set('Authorization', `Bearer ${nurseToken}`).send({
            code: 'Blue', location: 'Reception'
        });
        expect(blueRes.statusCode).toBe(201);

        // Verify Logs
        const logs = await pool.query("SELECT * FROM emergency_logs WHERE location = 'Reception' ORDER BY created_at DESC LIMIT 2");
        expect(logs.rows.length).toBe(2);
        expect(logs.rows.some(l => l.code === 'Red')).toBe(true);
        expect(logs.rows.some(l => l.code === 'Blue')).toBe(true);

        console.log('✅ Status Report: Double Emergency Triggered & Logged.');
    });

    // 2. The Crash Admission
    test('🏥 2. The Crash Admission (Admissions)', async () => {
        const res = await request(app).post('/api/admissions/admit').set('Authorization', `Bearer ${doctorToken}`).send({
            patient_id: patientId, ward: 'ICU', bed_number: 'ICU-Bed-99'
        });
        expect(res.statusCode).toBe(201);
        admissionId = res.body.admission_id;

        // Check Bed Status
        const bedCheck = await pool.query("SELECT * FROM admissions WHERE bed_number = 'ICU-Bed-99' AND status = 'Admitted'");
        expect(bedCheck.rows.length).toBe(1);

        console.log('✅ Status Report: Senator X Admitted to ICU-Bed-99.');
    });

    // 3. The "Surge" Order
    test('⚡ 3. The "Surge" Order (Doctor -> Multiple Depts)', async () => {
        // Labs (using actual seeded test names)
        const labs = ['Hemoglobin (Hb)', 'SGOT (AST)', 'Blood Urea', 'Chest X-Ray', 'CT Scan'];
        for (const test of labs) {
            await request(app).post('/api/lab/order').set('Authorization', `Bearer ${doctorToken}`).send({
                admission_id: admissionId, patient_id: patientId, test_type: test
            });
        }
        const labCount = await pool.query("SELECT * FROM lab_requests WHERE admission_id = $1", [admissionId]);
        expect(labCount.rows.length).toBe(5);

        // Task (Care Task via clinical routes)
        await request(app).post('/api/clinical/tasks').set('Authorization', `Bearer ${doctorToken}`).send({
            patient_id: patientId, admission_id: admissionId, type: 'Instruction', description: 'Emergency Craniotomy - NPO', scheduled_time: new Date().toISOString()
        });

        // Meds (Create dummy items first if needed, use ON CONFLICT to avoid duplicates)
        // We'll create 5 items to be safe
        for (let i = 1; i <= 5; i++) {
            await pool.query(
                "INSERT INTO inventory_items (name, stock_quantity, price_per_unit, expiry_date) VALUES ($1, 100, 10, '2030-01-01') ON CONFLICT (name) DO UPDATE SET stock_quantity = inventory_items.stock_quantity + 100",
                [`Med-${i}`]
            );
            await request(app).post('/api/pharmacy/dispense').set('Authorization', `Bearer ${pharmacistToken}`).send({
                patient_id: patientId, item: `Med-${i}`, quantity: 1
            });
        }

        console.log('✅ Status Report: Surge Orders (Labs, Surgery, Meds) Created.');
    });

    // 4. The Inventory Fail
    test('💊 4. The Inventory Fail (Pharmacy)', async () => {
        // Setup Rare Injection (use ON CONFLICT to handle reruns)
        await pool.query(
            "INSERT INTO inventory_items (name, stock_quantity, price_per_unit, expiry_date) VALUES ($1, 0, 5000, '2030-01-01') ON CONFLICT (name) DO UPDATE SET stock_quantity = 0",
            ['Rare Injection']
        );

        // Try to dispense
        const res = await request(app).post('/api/pharmacy/dispense').set('Authorization', `Bearer ${pharmacistToken}`).send({
            patient_id: patientId, item: 'Rare Injection', quantity: 1
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/Insufficient stock/i);

        console.log('✅ Inventory Safety Lock Verified.');
    });

    // 5. The AI Consultant
    test('🤖 5. The AI Consultant (Intelligence)', async () => {
        const res = await request(app).post('/api/chat').set('Authorization', `Bearer ${doctorToken}`).send({
            question: "Show me the latest vitals for Senator X."
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.answer).toContain('BP: 120/80');

        console.log('✅ Status Report: AI Consultant queried successfully.');
    });

    // 6. The Double Transfer
    test('🔄 6. The Double Transfer (ADT Logic Stress)', async () => {
        // Move 1: ICU -> OT
        await request(app).post('/api/admissions/transfer').set('Authorization', `Bearer ${nurseToken}`).send({
            admission_id: admissionId, to_ward: 'OT', to_bed: 'OT-1'
        });

        // Move 2: OT -> Private Suite
        await request(app).post('/api/admissions/transfer').set('Authorization', `Bearer ${nurseToken}`).send({
            admission_id: admissionId, to_ward: 'Private Suite', to_bed: 'Suite-1'
        });

        // Verify History
        const history = await pool.query("SELECT * FROM bed_history WHERE admission_id = $1 ORDER BY id ASC", [admissionId]);
        // Should have: ICU (closed), OT (closed), Private (open)
        // Wait, admitPatient inserts 1. Transfer 1 updates it? No, Transfer closes current and inserts new.
        // So:
        // 1. Admit -> Insert ICU.
        // 2. Transfer 1 -> Close ICU, Insert OT.
        // 3. Transfer 2 -> Close OT, Insert Private.
        // Total rows: 3.
        expect(history.rows.length).toBe(3);
        expect(history.rows[0].ward).toBe('ICU');
        expect(history.rows[1].ward).toBe('OT');
        expect(history.rows[2].ward).toBe('Private Suite');
        expect(history.rows[0].end_time).not.toBeNull();
        expect(history.rows[1].end_time).not.toBeNull();
        expect(history.rows[2].end_time).toBeNull(); // Current

        console.log('✅ Status Report: Double Transfer verified in Bed History.');
    });

    // 7. The Million Dollar Bill
    test('💰 7. The Million Dollar Bill (Finance)', async () => {
        const res = await request(app).post('/api/finance/generate').set('Authorization', `Bearer ${adminToken}`).send({
            admission_id: admissionId,
            patient_id: patientId
        });

        expect(res.statusCode).toBe(201);
        const invoice = res.body.invoice;
        const items = res.body.items;

        // Verify Invoice was generated with some total
        // The actual amount depends on room charges + services
        expect(Number(invoice.total_amount)).toBeGreaterThan(0);

        console.log(`✅ Status Report: Million Dollar Bill Generated. Total: ${invoice.total_amount}`);

        // Final Discharge (Pay & Discharge)
        // We need to clear tasks first?
        // dischargePatient checks for pending tasks.
        // "Surge Order" created tasks. They are "Pending".
        // So discharge will FAIL unless we complete them.
        // Let's complete them.
        await pool.query("UPDATE care_tasks SET status = 'Completed' WHERE admission_id = $1", [admissionId]);
        await pool.query("UPDATE lab_requests SET status = 'Completed' WHERE admission_id = $1", [admissionId]);

        const disRes = await request(app).post('/api/admissions/discharge').set('Authorization', `Bearer ${adminToken}`).send({
            admission_id: admissionId
        });
        expect(disRes.statusCode).toBe(200);

        console.log('✅ Status Report: Patient Discharged.');
    });

});
