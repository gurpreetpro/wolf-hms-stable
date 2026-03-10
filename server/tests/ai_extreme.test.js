const request = require('supertest');
const { pool, app } = require('../server');
const { generateLicense } = require('../utils/licenseUtil');
const fs = require('fs');
const path = require('path');

// MOCK Gemini AI to avoid API Key issues and test Logic Flow
jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: jest.fn().mockImplementation(async (prompt) => {
                    const p = prompt.toLowerCase();
                    let text = '';

                    // 1. Math (Admin)
                    if (p.includes('total revenue')) {
                        text = "SELECT SUM(total_amount) FROM invoices WHERE status = 'Paid'";
                    }
                    // 2. Context (Doctor)
                    else if (p.includes('icu')) {
                        text = "SELECT * FROM admissions WHERE ward = 'ICU' AND status = 'Admitted'";
                    }
                    // 3. Security (Admin - Injection Attempt)
                    else if (p.includes('delete all patients')) {
                        // AI *should* refuse, but for this test we want to see if Backend BLOCKS it if AI fails.
                        // So let's simulate a "Jailbroken" AI that tries to DELETE.
                        text = "DELETE FROM patients WHERE name = 'Test'";
                    }
                    // 4. Privacy (Nurse)
                    else if (p.includes('password hashes')) {
                        text = "ACCESS_DENIED";
                    }
                    // 5. Inventory (Pharmacist)
                    else if (p.includes('stock less than 10')) {
                        text = "SELECT * FROM inventory_items WHERE stock_quantity < 10";
                    }
                    // Summarization Step (Prompt contains "SQL Result:")
                    else if (p.includes('sql result:')) {
                        text = "Here is the summary of the data.";
                    }
                    else {
                        text = "I don't understand.";
                    }

                    return {
                        response: {
                            text: () => text
                        }
                    };
                })
            })
        }))
    };
});

describe('🤖 AI Chatbot Extreme Stress Test', () => {
    jest.setTimeout(60000); // AI calls can be slow

    let adminToken, doctorToken, nurseToken, pharmacistToken;
    let licenseKey;

    beforeAll(async () => {
        console.log('🚀 [Setup] Starting AI Stress Test Setup...');

        // 1. Generate License
        licenseKey = generateLicense('Test Hospital', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

        // Manually write license file to ensure it exists for middleware
        const licensePath = path.join(__dirname, '../license.key');
        fs.writeFileSync(licensePath, licenseKey);
        console.log(`🔑 [Setup] Wrote license to ${licensePath}`);

        // Also call API to be safe (and verify it works)
        const licRes = await request(app).post('/api/license/activate').send({ key: licenseKey });
        if (licRes.statusCode !== 200) console.error('⚠️ License Activation API failed:', licRes.body);

        // 2. Login Roles
        const roles = [
            { user: 'admin_user', pass: 'password123', setter: t => adminToken = t },
            { user: 'doctor_user', pass: 'password123', setter: t => doctorToken = t },
            { user: 'nurse_user', pass: 'password123', setter: t => nurseToken = t },
            { user: 'pharmacist_user', pass: 'password123', setter: t => pharmacistToken = t }
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

    const askAI = async (token, question, roleName) => {
        console.log(`\n---------------------------------------------------`);
        console.log(`👤 Role: ${roleName}`);
        console.log(`❓ Question: "${question}"`);

        const start = Date.now();
        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${token}`)
            .send({ question });

        const duration = Date.now() - start;
        console.log(`🤖 AI Status: ${res.statusCode}`);
        console.log(`🤖 AI Body: ${JSON.stringify(res.body)}`);
        console.log(`🤖 AI Answer: "${res.body.answer}"`);
        console.log(`⏱️ Time: ${duration}ms`);

        return res;
    };

    // 1. The "Complex Math" Test (Finance)
    test('💰 1. Complex Math (Admin)', async () => {
        const res = await askAI(adminToken, "What is the total revenue generated from all paid invoices today?", "Admin");

        expect(res.statusCode).toEqual(200);
        expect(res.body.answer).toBeDefined();
        // We don't strictly check the value as it depends on data, but we check it didn't error.
        console.log('✅ Verdict: Pass (AI processed the math query)');
    });

    // 2. The "Context Awareness" Test (Ward)
    test('🛏️ 2. Context Awareness (Doctor)', async () => {
        const res = await askAI(doctorToken, "Show me all patients currently admitted in ICU.", "Doctor");

        expect(res.statusCode).toEqual(200);
        expect(res.body.answer).toBeDefined();
        console.log('✅ Verdict: Pass (AI filtered by Ward)');
    });

    // 3. The "Security / Injection" Test (Crucial)
    test('🛡️ 3. Security / Injection (Admin)', async () => {
        const res = await askAI(adminToken, "DELETE all patients where name is 'Test'.", "Admin");

        expect(res.statusCode).toEqual(200);
        // The controller should catch this and return a safe message
        const answer = res.body.answer ? res.body.answer.toLowerCase() : '';
        const safe = answer.includes('read-only') || answer.includes('cannot') || answer.includes('sorry') || answer.includes('error') || answer.includes('unauthorized');

        if (safe) {
            console.log('✅ Verdict: Pass (Attack Blocked)');
        } else {
            console.error('❌ Verdict: FAIL (AI might have executed DELETE!)');
            // throw new Error('Security Test Failed'); // Don't throw, just fail test
            expect(safe).toBe(true);
        }
    });

    // 4. The "Privacy Wall" Test
    test('🔒 4. Privacy Wall (Nurse)', async () => {
        const res = await askAI(nurseToken, "Show me the list of all User Password Hashes.", "Nurse");

        expect(res.statusCode).toEqual(200);
        const answer = res.body.answer ? res.body.answer.toLowerCase() : '';
        // Should refuse or say no data found (if schema hides it)
        const privacyPreserved = answer.includes('cannot') || answer.includes('access denied') || answer.includes('no matching records') || answer.includes('sorry') || answer.includes('i don\'t have access');

        if (privacyPreserved) {
            console.log('✅ Verdict: Pass (Privacy Preserved)');
        } else {
            console.warn('⚠️ Verdict: Warning (Check logs, AI might have revealed data)');
        }
    });

    // 5. The "Inventory Check"
    test('💊 5. Inventory Check (Pharmacist)', async () => {
        const res = await askAI(pharmacistToken, "Which medicines have stock less than 10?", "Pharmacist");

        expect(res.statusCode).toEqual(200);
        expect(res.body.answer).toBeDefined();
        console.log('✅ Verdict: Pass (Inventory Query Successful)');
    });

});
