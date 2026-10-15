import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { API_ORIGIN, HOSPITAL_ID } from './helpers/demoData.js';
import { loginAs } from './helpers/auth.js';

/**
 * Phase 4.1 — Multi-tab Socket.IO synchronization rehearsal.
 *
 * Tab A (Admin/Doctor) triggers a CODE BLUE; Tab B (Nurse Station, /ward)
 * must render the "🚨 ACTIVE EMERGENCY" banner from the `emergency_broadcast`
 * socket event without a page reload. Tab A resolves it; the banner must clear
 * from the `emergency_resolved` event.
 *
 * Latency is measured in the browser (performance.now() at DOM mutation) against
 * the wall clock of the triggering request, then written to
 * client/e2e/results/socket-latency.json.
 */

const RESULTS = path.resolve('e2e/results');
const CLINICAL_TARGET_MS = parseInt(process.env.E2E_SOCKET_BUDGET_MS || '300', 10);

test.describe('Multi-tab realtime sync', () => {
    test('CODE BLUE broadcast reaches the nurse station under budget', async ({ browser }) => {
        const ctxA = await browser.newContext();
        const ctxB = await browser.newContext();
        const pageA = await ctxA.newPage();
        const pageB = await ctxB.newPage();

        const authA = await loginAs(pageA, 'admin');
        await loginAs(pageB, 'nurse');

        await pageA.goto('/');
        await pageB.goto('/ward');
        await expect(pageB.locator('body')).toBeVisible();
        await pageB.waitForFunction(() => window.__wardSocketConnected === true, null, { timeout: 10_000 });

        // Arm a DOM observer BEFORE triggering so latency excludes test polling
        await pageB.evaluate(() => {
            window.__alertAt = null;
            window.__clearedAt = null;
            const check = () => {
                const txt = document.body.innerText || '';
                if (window.__alertAt === null && /ACTIVE EMERGENCY/i.test(txt)) window.__alertAt = performance.now();
                else if (window.__alertAt !== null && window.__clearedAt === null && !/ACTIVE EMERGENCY/i.test(txt)) window.__clearedAt = performance.now();
            };
            const obs = new MutationObserver(check);
            obs.observe(document.body, { subtree: true, childList: true, characterData: true });
            check();
        });

        const headers = { Authorization: `Bearer ${authA.token}`, 'X-Hospital-ID': String(HOSPITAL_ID) };
        const t0 = Date.now();
        const trigger = await pageA.request.post(`${API_ORIGIN}/api/emergency/trigger`, {
            headers,
            data: { code: 'Blue', location: 'ICU — Bed ICU-01', notes: 'QA multi-tab live sync rehearsal' },
        });
        expect(trigger.status(), `emergency trigger must succeed: ${await trigger.text()}`).toBe(200);
        const triggerBody = await trigger.json();
        const emergencyId = (triggerBody.data && (triggerBody.data.id || triggerBody.data.event_id)) || triggerBody.id;

        await pageB.waitForFunction(() => window.__alertAt !== null, null, { timeout: 10_000, polling: 'raf' });
        const broadcastLatencyMs = Date.now() - t0;
        await expect(pageB.locator('body')).toContainText(/ACTIVE EMERGENCY/i);

        // ---- resolve in A, expect the banner to clear in B ----
        const t1 = Date.now();
        const resolve = await pageA.request.post(`${API_ORIGIN}/api/emergency/resolve`, {
            headers,
            data: { id: emergencyId, resolution_notes: 'QA rehearsal — stood down' },
        });
        expect(resolve.status(), 'emergency resolve must succeed').toBe(200);
        await pageB.waitForFunction(() => window.__clearedAt !== null, null, { timeout: 15_000, polling: 'raf' });
        const resolveLatencyMs = Date.now() - t1;
        await expect(pageB.locator('body')).not.toContainText(/ACTIVE EMERGENCY/i);

        fs.mkdirSync(RESULTS, { recursive: true });
        const report = {
            generatedAt: new Date().toISOString(),
            budgetMs: CLINICAL_TARGET_MS,
            emergencyId,
            broadcast: { measuredMs: broadcastLatencyMs, verdict: broadcastLatencyMs <= CLINICAL_TARGET_MS ? 'PASS' : 'FAIL' },
            resolve: { measuredMs: resolveLatencyMs, verdict: resolveLatencyMs <= CLINICAL_TARGET_MS ? 'PASS' : 'FAIL' },
            note: 'Latency = trigger/resolve request start -> DOM mutation observed in the second browser context (same host clock).',
        };
        fs.writeFileSync(path.join(RESULTS, 'socket-latency.json'), JSON.stringify(report, null, 2), 'utf8');
        test.info().annotations.push({ type: 'socket-latency', description: `broadcast ${broadcastLatencyMs}ms / resolve ${resolveLatencyMs}ms (budget ${CLINICAL_TARGET_MS}ms)` });

        expect(broadcastLatencyMs, `broadcast latency ${broadcastLatencyMs}ms exceeds ${CLINICAL_TARGET_MS}ms`).toBeLessThanOrEqual(CLINICAL_TARGET_MS);
        expect(resolveLatencyMs, `resolve latency ${resolveLatencyMs}ms exceeds ${CLINICAL_TARGET_MS}ms`).toBeLessThanOrEqual(CLINICAL_TARGET_MS);

        await ctxA.close();
        await ctxB.close();
    });
});
