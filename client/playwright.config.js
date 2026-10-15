import { defineConfig, devices } from '@playwright/test';

/**
 * WOLF HMS — Pre-Demo QA Playwright configuration (Phase 3.2)
 *
 * Browser strategy: the Playwright CDN download is blocked on this network
 * (SELF_SIGNED_CERT_IN_CHAIN from the TLS-inspecting proxy), so the suite runs
 * against the installed system browser via `channel`. Override with:
 *   E2E_CHANNEL=chrome|msedge|chromium   (default: msedge)
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const CHANNEL = process.env.E2E_CHANNEL || 'msedge';

export default defineConfig({
    testDir: './e2e',
    timeout: 120_000,
    expect: { timeout: 15_000 },
    fullyParallel: false,          // one worker: clinical journey is stateful + rate-limited API
    workers: 1,
    retries: 1,
    forbidOnly: !!process.env.CI,
    reporter: [
        ['list'],
        ['json', { outputFile: 'e2e/results/results.json' }],
        ['html', { outputFolder: 'e2e/results/html', open: 'never' }],
    ],
    use: {
        baseURL: BASE_URL,
        headless: true,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
        viewport: { width: 1440, height: 900 },
        actionTimeout: 15_000,
        navigationTimeout: 45_000,
        channel: CHANNEL,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], channel: CHANNEL },
        },
    ],
    webServer: process.env.E2E_NO_WEBSERVER
        ? undefined
        : {
            command: process.env.E2E_SERVER_CMD || 'npm run dev',
            url: BASE_URL,
            reuseExistingServer: true,
            timeout: 180_000,
            stdout: 'ignore',
            stderr: 'pipe',
        },
});
