#!/usr/bin/env node
/**
 * Runs the Fast-4G dress rehearsal against the BUILT bundle.
 * Boots `vite preview` on :4173 (Playwright webServer) and points the suite at it,
 * so the network-budget numbers reflect what the founder actually demos.
 *
 * Usage: npm run test:e2e:rehearsal4g
 */
const { spawnSync } = require('child_process');

const env = {
    ...process.env,
    E2E_BASE_URL: process.env.E2E_BASE_URL || 'http://localhost:4173',
    E2E_SERVER_CMD: process.env.E2E_SERVER_CMD || 'npm run preview -- --port 4173 --strictPort',
    E2E_PREVIEW: '1',
};

const res = spawnSync('npx',
    ['playwright', 'test', 'e2e/demo-rehearsal.spec.js', ...process.argv.slice(2)],
    { stdio: 'inherit', env, shell: true });

process.exit(res.status === null ? 1 : res.status);
