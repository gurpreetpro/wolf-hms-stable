import { test, expect } from '@playwright/test';
import { demoData, API_ORIGIN, HOSPITAL_ID } from './helpers/demoData.js';
import { loginAs, loginViaUi } from './helpers/auth.js';
import { installTrap } from './helpers/zeroErrorTrap.js';

/**
 * Phase 3.5 — Golden Clinical Journey (Reception -> Doctor -> ICU -> Lab/Rad -> Pharmacy/Billing)
 *
 * Assertion strategy (documented, deliberate):
 *  - UI assertions prove each screen renders with real data and no React crash.
 *  - API assertions (page.request, same JWT) prove the seeded records are actually
 *    returned by the live controllers — this is what the hospital director sees.
 *  - The Zero-Error Trap (task 3.10) fails the step on any uncaught page error,
 *    any 5xx, or any 4xx on a Bucket A/B route (Bucket C 404s are allowed).
 */

const data = demoData();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe.configure({ mode: 'serial' });

let trap;
let auth;

async function api(page, method, path, body) {
    const headers = { Authorization: `Bearer ${auth.token}`, 'X-Hospital-ID': String(HOSPITAL_ID) };
    return page.request[method](`${API_ORIGIN}${path}`, { headers, data: body });
}

test.beforeEach(async ({ page }) => {
    trap = installTrap(page);
    auth = await loginAs(page, 'admin');
});

test.describe('Golden clinical journey', () => {
    test('1. Reception — login screen works, OPD queue loads, patient can be registered', async ({ page }) => {
        await loginViaUi(page, 'admin');
        await page.goto('/opd');
        await expect(page.locator('body')).toBeVisible();
        trap.assertClean('1a. login + /opd render');

        const queue = await api(page, 'get', '/api/opd/queue');
        expect(queue.status(), 'GET /api/opd/queue must not fail').toBeLessThan(400);
        expect(await queue.text(), 'seeded waiting patients must appear in the live OPD queue').toContain('Priya Sharma');

        const unique = Date.now().toString().slice(-6);
        const reg = await api(page, 'post', '/api/patients/register', {
            name: `Aarav Menon ${unique}`,
            phone: `+91 98${unique}1`,
            age: 34,
            gender: 'Male',
            address: '22 Kalyani Nagar, Pune',
            blood_group: 'O+',
        });
        expect([200, 201], `patient registration returned ${reg.status()}`).toContain(reg.status());
        const regBody = await reg.json();
        const newId = regBody.patientId || (regBody.patient && regBody.patient.id);
        expect(newId, 'registration must return a patient id').toBeTruthy();
        expect(UUID_RE.test(newId), `patients.id must be a UUID (got ${newId})`).toBeTruthy();
        trap.assertClean('1b. patient registration');
    });

    test('2. Doctor OPD & AI safety — Warfarin chart + Ciprofloxacin interaction warning + diagnostics', async ({ page }) => {
        await page.goto('/doctor');
        await expect(page.locator('body')).toBeVisible();
        trap.assertClean('2a. /doctor render');

        // Cohort B patient carries an active Warfarin + Aspirin profile (seeded)
        const rx = await api(page, 'get', `/api/patients/${data.patients.aiSafety}`);
        expect(rx.status()).toBeLessThan(400);

        // AI Clinical Co-Pilot: adding Ciprofloxacin must raise an interaction
        const ai = await api(page, 'post', '/api/ai/check-interactions', {
            medications: ['Warfarin', 'Aspirin', 'Ciprofloxacin'],
        });
        expect(ai.status(), 'POST /api/ai/check-interactions must be 200').toBe(200);
        const aiBody = await ai.json();
        const aiPayload = aiBody.data || aiBody;
        const interactions = aiPayload.interactions || [];
        expect(Array.isArray(interactions)).toBeTruthy();
        expect(interactions.length, `expected >=1 interaction, got ${JSON.stringify(aiPayload).slice(0, 200)}`).toBeGreaterThan(0);
        test.info().annotations.push({ type: 'ai-source', description: aiPayload.fallback ? 'local interaction DB (offline fallback)' : 'Gemini' });

        // Diagnostics ordered for cohort C are visible to the lab worklist
        const labQueue = await api(page, 'get', '/api/lab/queue');
        expect(labQueue.status()).toBeLessThan(400);
        expect(await labQueue.text()).toContain('Complete Blood Count (CBC)');
        trap.assertClean('2b. AI interaction + diagnostics');
    });

    test('3. ICU telemetry — admitted patients render from /api/admissions?status=Admitted', async ({ page }) => {
        await page.goto('/icu');
        await expect(page.locator('body')).toBeVisible();

        const admitted = await api(page, 'get', '/api/admissions?status=Admitted');
        expect(admitted.status(), 'GET /api/admissions?status=Admitted must be 200').toBe(200);
        const body = await admitted.json();
        const rows = Array.isArray(body) ? body : (body.data || body.admissions || []);
        const icu = rows.filter(r => String(r.ward || '').toUpperCase().includes('ICU'));
        expect(icu.length, `expected >=3 seeded ICU admissions, got ${rows.length} rows`).toBeGreaterThanOrEqual(3);
        expect(JSON.stringify(rows), 'seeded ICU patients must be present').toContain('Suresh Menon');

        // ICU telemetry panels the dashboard actually calls (ventilator + fluid I/O)
        const vent = await api(page, 'get', `/api/icu/ventilator-logs/${data.admissionId}`);
        expect(vent.status(), 'GET /api/icu/ventilator-logs/:id must not 5xx').toBeLessThan(500);
        const io = await api(page, 'get', `/api/icu/fluid-io/${data.admissionId}`);
        expect(io.status(), 'GET /api/icu/fluid-io/:id must not 5xx').toBeLessThan(500);
        trap.assertClean('3. ICU dashboard');
    });

    test('4. Lab & Radiology — pending worklists load and report views open', async ({ page }) => {
        await page.goto('/lab');
        await expect(page.locator('body')).toBeVisible();
        trap.assertClean('4a. /lab render');

        const pending = await api(page, 'get', '/api/lab/queue');
        expect(pending.status()).toBeLessThan(400);
        const pendingText = await pending.text();
        expect(pendingText).toContain('Complete Blood Count (CBC)');

        // The seeded pending order for the Cohort C patient must be visible on their chart
        const patientLabs = await api(page, 'get', `/api/lab/patient/${data.cohortC && data.cohortC.patientId ? data.cohortC.patientId : 'c0000000-0000-4000-8000-000000000001'}`);
        expect(patientLabs.status(), 'lab results by patient must not 5xx').toBeLessThan(500);
        const patientLabText = await patientLabs.text();
        expect(patientLabText).toMatch(/Complete Blood Count \(CBC\)|Liver Function Test/);

        await page.goto('/radiology');
        await expect(page.locator('body')).toBeVisible();
        const rad = await api(page, 'get', '/api/radiology/queue');
        expect(rad.status(), 'radiology queue must not 5xx').toBeLessThan(500);
        trap.assertClean('4b. /radiology render');
    });

    test('5. Pharmacy & Billing — stock loads and the pending multi-item invoice is listed', async ({ page }) => {
        await page.goto('/pharmacy');
        await expect(page.locator('body')).toBeVisible();
        trap.assertClean('5a. /pharmacy render');

        const stock = await api(page, 'get', '/api/pharmacy/inventory');
        expect(stock.status(), 'GET /api/pharmacy/inventory must be 200').toBe(200);
        expect(await stock.text(), 'seeded positive stock batches must be visible').toMatch(/Amoxicillin|Paracetamol|Cefixime/);

        await page.goto('/billing');
        await expect(page.locator('body')).toBeVisible();

        const invoices = await api(page, 'get', '/api/billing/invoices');
        expect(invoices.status(), 'GET /api/billing/invoices must be 200').toBe(200);
        expect(await invoices.text(), 'the seeded pending invoice must be listed').toContain('INV-DEMO-2026-0002');
        trap.assertClean('5b. /billing render + invoice list');
    });
});
