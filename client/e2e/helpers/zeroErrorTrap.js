import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANS = path.resolve(__dirname, '..', '..', '..', 'plans');
const RESULTS = path.resolve(__dirname, '..', 'results');

const normalize = (p) => (p || '')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/');

function loadRoutes() {
    const ab = [];
    const abFile = path.join(PLANS, 'bucket_ab_routes.json');
    if (fs.existsSync(abFile)) {
        const json = JSON.parse(fs.readFileSync(abFile, 'utf8'));
        for (const r of json.routes) ab.push({ path: normalize(r.path), bucket: r.bucket, family: r.family });
    }
    const c = [];
    const cFile = path.join(PLANS, 'bucket_c_routes.json');
    if (fs.existsSync(cFile)) {
        const json = JSON.parse(fs.readFileSync(cFile, 'utf8'));
        for (const r of json.routes) c.push(normalize(r.path));
    }
    return { ab, c };
}

const { ab: AB_ROUTES, c: BUCKET_C } = loadRoutes();

const toRegex = (template) => new RegExp('^' + template
    .split('{}')
    .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]+') + '$');

const AB_REGEXES = AB_ROUTES.map(r => ({ ...r, re: toRegex(r.path) }));
const C_REGEXES = BUCKET_C.map(p => ({ path: p, re: toRegex(p) }));

/** Bucket-C families are intentionally disabled: they may 404 without failing the run. */
export function isBucketC(pathname) {
    return C_REGEXES.some(r => r.re.test(normalize(pathname)));
}

export function routeInfo(pathname) {
    const u = normalize(pathname);
    return AB_REGEXES.find(r => r.re.test(u)) || null;
}

/**
 * Task 3.10 — Global Zero-Error Trap.
 *
 *  * any uncaught page error (React render crash) -> violation
 *  * ANY response with status >= 500              -> violation
 *  * 400/401/403/404 on a Bucket A or B route     -> violation
 *  * 404 on a documented Bucket C route           -> ALLOWED
 *
 * Violations are collected (Playwright listeners cannot throw into the test) and
 * asserted at every checkpoint via `assertClean()`, which fails the test with the
 * full evidence list.
 */
export class ZeroErrorTrap {
    constructor(page, options = {}) {
        this.page = page;
        this.violations = [];
        this.warnings = [];
        this.allowed5xx = options.allowKnown5xx || [];   // explicit opt-in only
        this.ignoredHosts = options.ignoredHosts || [/fonts\.googleapis/, /fonts\.gstatic/, /maps\./, /tile\./];

        page.on('pageerror', (err) => {
            this.violations.push({ kind: 'pageerror', message: err.message, stack: (err.stack || '').split('\n').slice(0, 4).join(' | ') });
        });

        page.on('console', (msg) => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            if (/net::ERR|Failed to load resource/i.test(text)) return; // covered by the response listener
            // Recorded as evidence but non-fatal: the kickoff defines the trap as
            // pageerror + HTTP status rules. Console noise (e.g. Socket.IO handshake
            // messages during login) must not fail an otherwise clean demo run.
            this.warnings.push({ kind: 'console.error', message: text.slice(0, 300) });
        });

        page.on('response', (response) => {
            const url = response.url();
            if (this.ignoredHosts.some(re => re.test(url))) return;
            let pathname;
            try { pathname = new URL(url).pathname; } catch { return; }
            if (!pathname.startsWith('/api/')) return;

            const status = response.status();
            const info = routeInfo(pathname);
            const bucketC = isBucketC(pathname);

            if (status >= 500) {
                if (this.allowed5xx.some(re => re.test(pathname))) return;
                this.violations.push({ kind: 'http-5xx', status, url: pathname, bucket: info ? info.bucket : 'unknown', family: info ? info.family : '-' });
                return;
            }
            if ([400, 401, 403, 404].includes(status)) {
                if (bucketC && status === 404) return;      // documented disabled module
                if (!info) return;                          // client-only endpoint, not in the manifest
                this.violations.push({ kind: 'http-4xx', status, url: pathname, bucket: info.bucket, family: info.family });
            }
        });
    }

    /** Fail the test if anything was captured since the last check. */
    assertClean(label) {
        if (this.violations.length === 0) return;
        const list = this.violations.map(v => `  [${v.kind}] ${v.status || ''} ${v.url || ''} ${v.message || ''}${v.family ? ` (${v.family}/${v.bucket})` : ''}`).join('\n');
        this.dump(label);
        this.violations = [];
        throw new Error(`Zero-Error Trap violation after "${label}":\n${list}`);
    }

    dump(label = 'run') {
        try {
            fs.mkdirSync(RESULTS, { recursive: true });
            const file = path.join(RESULTS, 'zero-error-trap.json');
            const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
            prior.push({ at: new Date().toISOString(), label, violations: this.violations, warnings: this.warnings });
            fs.writeFileSync(file, JSON.stringify(prior, null, 2), 'utf8');
        } catch { /* best effort */ }
    }
}

export function installTrap(page, options) {
    return new ZeroErrorTrap(page, options);
}
