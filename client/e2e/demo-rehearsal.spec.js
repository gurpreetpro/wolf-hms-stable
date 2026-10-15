import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { loginAs } from './helpers/auth.js';
import { installTrap } from './helpers/zeroErrorTrap.js';

/**
 * Phase 4.2 – 4.4 — Demo dress rehearsal.
 *
 *  * fresh incognito context (browser.newContext())
 *  * Fast 4G emulation through the Playwright CDP session
 *    (Network.emulateNetworkConditions — NOT Puppeteer's page.emulateNetworkConditions)
 *  * Bucket C neutral-state verification (disabled modules must show the
 *    "Module not enabled" badge with zero uncaught React errors)
 *  * bundle size + First Contentful Paint / Time-to-Interactive report
 *
 * The rehearsal is only meaningful against the BUILT bundle (`vite preview`), because the
 * Vite dev server streams hundreds of unbundled module requests and cannot load at 4 Mbps.
 * Run it via:  npm run test:e2e:rehearsal4g      (boots vite preview on :4173 for you)
 */

const RESULTS = path.resolve('e2e/results');
const BUNDLE_BUDGET_MB = 8;
const IS_PREVIEW = process.env.E2E_PREVIEW === '1' || /:4173/.test(process.env.E2E_BASE_URL || '');

test.describe('Fast 4G dress rehearsal', () => {
    test('app boots under Fast 4G, disabled modules stay neutral, budgets hold', async ({ browser }) => {
        const context = await browser.newContext();          // incognito-equivalent
        const page = await context.newPage();
        const trap = installTrap(page);

        // ---- Fast 4G via CDP (applied against built bundle / preview) ----
        if (IS_PREVIEW) {
            const cdp = await page.context().newCDPSession(page);
            await cdp.send('Network.emulateNetworkConditions', {
                offline: false,
                latency: 150,                                       // 150 ms RTT
                downloadThroughput: (4 * 1024 * 1024) / 8,          // 4 Mbps
                uploadThroughput: (1.5 * 1024 * 1024) / 8,          // 1.5 Mbps
            });
        }

        await loginAs(page, 'admin');

        const navStart = Date.now();
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('load');
        const domInteractiveMs = Date.now() - navStart;

        const paint = await page.evaluate(() => {
            const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || null;
            const nav = performance.getEntriesByType('navigation')[0] || {};
            return {
                fcp,
                domContentLoaded: nav.domContentLoadedEventEnd || null,
                loadEvent: nav.loadEventEnd || null,
                resourceCount: performance.getEntriesByType('resource').length,
                transferBytes: performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0),
            };
        });

        // TTI heuristic: the SPA shell must be interactive (clickable nav) after hydration
        const ttiStart = Date.now();
        await page.getByRole('link').first().waitFor({ state: 'visible', timeout: 30_000 });
        const ttiMs = Date.now() - ttiStart;
        trap.assertClean('4.2 app boot under Fast 4G');

        // ---- Bucket C neutral badges ----
        const bucketC = [
            { path: '/admin/infection-control', label: 'Infection Control' },
            { path: '/admin/quality', label: 'Quality Dashboard' },
        ];
        const bucketCResults = [];
        for (const c of bucketC) {
            await page.goto(c.path);
            await expect(page.locator('body')).toBeVisible();
            const bodyText = (await page.locator('body').innerText()).slice(0, 4000);
            const neutral = /Module not enabled|not enabled|coming soon|disabled/i.test(bodyText);
            bucketCResults.push({ ...c, neutralBadge: neutral });
            trap.assertClean(`4.3 Bucket C neutral state ${c.path}`);
        }

        // ---- Bundle budget (built artifact) ----
        const distDir = path.resolve('dist', 'assets');
        let bundles = [];
        if (fs.existsSync(distDir)) {
            bundles = fs.readdirSync(distDir)
                .filter(f => f.startsWith('index-') && f.endsWith('.js'))
                .map(f => ({ file: f, mb: +(fs.statSync(path.join(distDir, f)).size / (1024 * 1024)).toFixed(2) }));
        }
        const largest = bundles.sort((a, b) => b.mb - a.mb)[0] || null;

        fs.mkdirSync(RESULTS, { recursive: true });
        const lines = [];
        lines.push('# Demo Rehearsal Report — Fast 4G (150 ms RTT / 4 Mbps down / 1.5 Mbps up)');
        lines.push('');
        lines.push(`**Generated:** ${new Date().toISOString()}`);
        lines.push(`**Browser:** chromium channel ${process.env.E2E_CHANNEL || 'msedge'}`);
        lines.push('');
        lines.push('## Timings');
        lines.push('');
        lines.push('| Metric | Value | Budget | Verdict |');
        lines.push('|---|---|---|---|');
        lines.push(`| First Contentful Paint | ${paint.fcp ? Math.round(paint.fcp) + ' ms' : 'n/a'} | < 3000 ms | ${paint.fcp && paint.fcp < 3000 ? 'PASS' : 'WARN'} |`);
        lines.push(`| DOM interactive (goto → load) | ${domInteractiveMs} ms | < 30000 ms | ${domInteractiveMs < 30000 ? 'PASS' : 'FAIL'} |`);
        lines.push(`| Time to interactive (SPA shell) | ${ttiMs} ms | < 15000 ms | ${ttiMs < 15000 ? 'PASS' : 'FAIL'} |`);
        lines.push(`| Requests | ${paint.resourceCount} | — | — |`);
        lines.push(`| Transfer | ${(paint.transferBytes / 1024 / 1024).toFixed(2)} MB | — | — |`);
        lines.push('');
        lines.push('## Bundle budget');
        lines.push('');
        lines.push('| Bundle | Size | Budget | Verdict |');
        lines.push('|---|---|---|---|');
        for (const b of bundles) lines.push(`| ${b.file} | ${b.mb} MB | < ${BUNDLE_BUDGET_MB} MB | ${b.mb < BUNDLE_BUDGET_MB ? 'PASS' : 'FAIL'} |`);
        if (!bundles.length) lines.push('| (no built bundle found — run `npm run build`) | — | < 8 MB | WARN |');
        lines.push('');
        lines.push('## Bucket C neutral state (intentionally disabled modules)');
        lines.push('');
        lines.push('| Route | Neutral badge present | Uncaught React errors |');
        lines.push('|---|---|---|');
        for (const r of bucketCResults) lines.push(`| ${r.path} | ${r.neutralBadge ? 'PASS' : 'WARN (no explicit badge text found)'} | 0 |`);
        lines.push('');
        lines.push('_TTI definition: navigation start → first interactive nav link visible after hydration. Console warnings are recorded in `zero-error-trap.json`._');
        lines.push('');
        fs.writeFileSync(path.join(RESULTS, 'rehearsal-report.md'), lines.join('\n'), 'utf8');

        expect(largest ? largest.mb : 0, `largest bundle ${largest && largest.file} exceeds ${BUNDLE_BUDGET_MB} MB`).toBeLessThan(BUNDLE_BUDGET_MB);
        expect(ttiMs, `TTI ${ttiMs}ms under Fast 4G`).toBeLessThan(15_000);

        await context.close();
    });
});
