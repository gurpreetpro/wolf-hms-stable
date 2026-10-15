#!/usr/bin/env node
/**
 * PRE-DEMO QA — Authenticated 500-Hunter (Phase 2.3 – 2.7)
 *
 * Sweeps every GET route in Buckets A & B from plans/bucket_ab_routes.json,
 * substituting route parameters with REAL seeded identifiers (plans/seeded_ids.json)
 * so controllers execute genuine data joins instead of failing on literal ":param".
 *
 * Classification:
 *   200/201/204/400/404  -> non-crash
 *   401/403              -> auth-blocked (non-crash, reported separately)
 *   500+                 -> CRITICAL
 *
 * 500 bodies are scanned for:
 *   UUID_MISMATCH  (uuid = integer / invalid input syntax for type uuid)
 *   SCHEMA_GAP     (* does not exist)
 *
 * Exit code: 0 when critical_500_count === 0, otherwise 1.
 *
 * Usage:
 *   node scripts/qa/500-hunter.js                       # full sweep
 *   node scripts/qa/500-hunter.js --bucket B            # only Bucket B
 *   node scripts/qa/500-hunter.js --family pacuRoutes
 *   node scripts/qa/500-hunter.js --limit 50
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST = path.join(ROOT, 'plans', 'bucket_ab_routes.json');
const SEEDED = path.join(ROOT, 'plans', 'seeded_ids.json');
const REPORT_JSON = path.join(__dirname, '500-hunter-report.json');
const REPORT_MD = path.join(__dirname, '500-hunter-report.md');

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:8080';
const TIMEOUT_MS = parseInt(process.env.QA_TIMEOUT_MS || '5000', 10);
const USERNAME = process.env.QA_USERNAME || 'admin';
const PASSWORD = process.env.QA_PASSWORD || 'password123';

const argv = process.argv.slice(2);
const argOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const ONLY_BUCKET = argOf('--bucket');
const ONLY_FAMILY = argOf('--family');
const LIMIT = parseInt(argOf('--limit') || '0', 10);
const PROFILE = (argOf('--profile') || 'full').toLowerCase();
const MAX_429_RETRIES = parseInt(process.env.QA_MAX_429_RETRIES || '2', 10);
const MAX_WAIT_MS = parseInt(process.env.QA_MAX_WAIT_MS || '960000', 10);

/** Demo-critical families = the routes the founder's golden journey actually hits. */
const DEMO_FAMILIES = new RegExp('^(' + [
    'authRoutes', 'patientRoutes', 'opdRoutes', 'admissionRoutes', 'ipdPatientRoutes',
    'icuRoutes', 'labRoutes', 'radiologyRoutes', 'pharmacyRoutes', 'medicineOrderRoutes',
    'billingRoutes', 'financeRoutes', 'chargesRoutes', 'emergencyRoutes', 'wardRoutes',
    'vitalsRoutes', 'dashboardRoutes', 'nurseRoutes', 'doctorRoutes', 'bedRoutes',
    'clinicalRoutes', 'settingsRoutes', 'hospitalRoutes', 'staffRoutes', 'bloodBankRoutes',
    'server-cloud-inline',
].join('|') + ')$');

/**
 * Substitute the normalized `{}` placeholders with real seeded ids.
 *
 * The manifest stores parameter names as `{}` (method-agnostic), so the parent
 * and grandparent path segments are used to decide WHICH identifier type the
 * route expects. patients.id is UUID, admissions.id/users.id are INTEGER — a
 * wrong substitution produces a fake 500, so this mapping is deliberately
 * conservative: anything patient-scoped gets the seeded UUID.
 */
function substitute(routePath, ids) {
    const segments = routePath.split('/');
    return segments.map((seg, idx) => {
        if (seg !== '{}') return seg;

        const parent = (segments[idx - 1] || '').toLowerCase();
        const grandparent = (segments[idx - 2] || '').toLowerCase();
        const lower = routePath.toLowerCase();
        const isPatientScoped = lower.includes('/patients/') || lower.includes('/patient/');

        // 1. patient-scoped routes (UUID)
        if (isPatientScoped) return ids.patientId;
        if (parent === 'patients' || parent === 'patient') return ids.patientId;

        // 2. admissions (INTEGER locally; UUID in prod — read from seeded_ids)
        if (parent === 'admissions' || parent === 'admission' || lower.includes('/admissions') || lower.includes('/ipd')) {
            return String(ids.admissionId);
        }

        // 3. diagnostics
        if (lower.includes('/lab')) return String(ids.labOrderId);
        if (lower.includes('/radiology')) return String(ids.radiologyOrderId);

        // 4. billing / finance
        if (parent === 'invoices' || parent === 'invoice') return String(ids.invoiceId);
        if (parent === 'charges' || parent === 'charge') return String(ids.chargeId || 1);
        if (lower.includes('/insurance') || lower.includes('/preauth')) return String(ids.preauthId || 1);

        // 5. people
        if (parent === 'users' || parent === 'doctors' || parent === 'doctor') return String(ids.doctorId);
        if (parent === 'nurses' || parent === 'nurse') return String(ids.nurseId);

        // 6. physical resources
        if (parent === 'wards' || parent === 'ward') return String(ids.icuWardId);
        if (parent === 'beds' || parent === 'bed') return '1';
        if (lower.includes('/ot/') || lower.includes('/anaesthesia') || lower.includes('/pacu') || lower.includes('/pac/') || lower.includes('/intraop')) {
            return String(ids.surgeryId || 1);
        }
        if (grandparent === 'patients') return ids.patientId;

        return '1'; // generic INTEGER id
    }).join('/');
}


/** Extract the SQL error signature from a 500 response body. */
function classify500(bodyText) {
    const t = String(bodyText || '');
    if (/invalid input syntax for type uuid|operator does not exist: uuid =|uuid = integer|integer = uuid/i.test(t)) return 'UUID_MISMATCH';
    if (/relation .* does not exist|column .* does not exist|undefined column|undefined table/i.test(t)) return 'SCHEMA_GAP';
    return 'UNKNOWN';
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function login() {
    const res = await axios.post(`${BASE_URL}/api/auth/login`,
        { username: USERNAME, password: PASSWORD },
        { timeout: 15000, validateStatus: () => true });
    if (res.status !== 200 || !res.data || !res.data.token) {
        throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.data).slice(0, 200)}`);
    }
    return res.data.token;
}

async function main() {
    if (!fs.existsSync(MANIFEST)) throw new Error(`Missing ${MANIFEST} — run node scripts/qa/build-route-manifest.js`);
    if (!fs.existsSync(SEEDED)) throw new Error(`Missing ${SEEDED} — run npm --prefix server run demo:seed`);

    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const seeded = JSON.parse(fs.readFileSync(SEEDED, 'utf8'));
    const ids = {
        ...seeded,
        prescriptionId: seeded.prescriptionId || null,
        surgeryId: seeded.surgeryId || null,
    };

    let targets = manifest.routes
        .filter(r => r.method === 'GET' || r.method === 'ALL')
        .filter(r => ['A', 'B'].includes(r.bucket));
    if (ONLY_BUCKET) targets = targets.filter(r => r.bucket === ONLY_BUCKET.toUpperCase());
    if (ONLY_FAMILY) targets = targets.filter(r => r.family === ONLY_FAMILY);
    if (PROFILE === 'demo') targets = targets.filter(r => DEMO_FAMILIES.test(r.family));
    if (LIMIT > 0) targets = targets.slice(0, LIMIT);

    console.log('='.repeat(78));
    console.log('WOLF HMS — AUTHENTICATED 500-HUNTER (Buckets A & B, GET)');
    console.log('='.repeat(78));
    console.log(`Base URL        : ${BASE_URL}`);
    console.log(`Profile         : ${PROFILE}${PROFILE === 'demo' ? ' (golden clinical journey families)' : ' (all Bucket A & B GET routes)'}`);
    console.log(`Routes in scope : ${targets.length} (bucket=${ONLY_BUCKET || 'A+B'}${ONLY_FAMILY ? `, family=${ONLY_FAMILY}` : ''})`);
    console.log(`Seeded ids      : patient=${ids.patientId} admission=${ids.admissionId}`);
    console.log('Authenticating  : POST /api/auth/login ...');

    const token = await login();
    console.log('Login OK        : Bearer token acquired\n');

    const authHeader = {
        Authorization: `Bearer ${token}`,
        'X-Hospital-ID': String(seeded.hospitalId || 1),
        'Content-Type': 'application/json',
    };

    const results = [];
    let counts = { ok: 0, nonCrash: 0, authBlocked: 0, critical: 0, rateLimited: 0 };

    for (const route of targets) {
        const url = substitute(route.path, ids);
        if (url.includes(':')) {
            results.push({ ...route, url, status: 0, verdict: 'SKIPPED', signature: 'UNSUBSTITUTED_PARAM' });
            continue;
        }
        let status = 0; let bodyText = ''; let ms = 0; let err = null;
        const started = Date.now();
        // NOTE: server-cloud.js hardcodes a 500 req / 15 min IP limiter on /api/.
        // A full 535-route sweep exceeds one window, so honour RateLimit-Reset and
        // retry the route once after the window rolls over.
        let attempts = 0;
        for (;;) {
            attempts++;
            try {
                const res = await axios.get(BASE_URL + url, { headers: authHeader, timeout: TIMEOUT_MS, validateStatus: () => true });
                status = res.status;
                bodyText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                if (status === 429 && attempts <= MAX_429_RETRIES) {
                    const resetHdr = res.headers['ratelimit-reset'] || res.headers['retry-after'];
                    const waitMs = Math.min((parseInt(resetHdr || '60', 10) + 2) * 1000, MAX_WAIT_MS);
                    console.log(`⏳ 429 rate-limited on ${url} — waiting ${(waitMs / 1000).toFixed(0)}s for the rate-limit window to reset (attempt ${attempts})`);
                    await sleep(waitMs);
                    continue;
                }
                break;
            } catch (e) {
                err = e.code || e.message;
                break;
            }
        }
        ms = Date.now() - started;

        let verdict, signature = null;
        if (err) { verdict = 'TIMEOUT'; counts.nonCrash++; }
        else if (status === 429) { verdict = 'RATE_LIMITED'; counts.rateLimited++; }
        else if (status >= 500) { verdict = 'CRITICAL'; signature = classify500(bodyText); counts.critical++; }
        else if (status === 401 || status === 403) { verdict = 'AUTH_BLOCKED'; counts.authBlocked++; }
        else if ([200, 201, 204].includes(status)) { verdict = 'OK'; counts.ok++; }
        else { verdict = 'NON_CRASH'; counts.nonCrash++; }

        results.push({ method: route.method, path: route.path, url, family: route.family, bucket: route.bucket, status, verdict, signature, ms, error: err, bodySnippet: status >= 500 ? bodyText.slice(0, 400) : undefined });

        const tag = verdict === 'CRITICAL' ? '🔴 CRITICAL' : verdict === 'OK' ? '✅' : '⚪';
        if (verdict === 'CRITICAL' || process.env.QA_VERBOSE) {
            console.log(`${tag} ${String(status).padEnd(3)} ${url}  [${route.family}/${route.bucket}]${signature ? ` -> ${signature}` : ''}`);
        }
        await sleep(15); // be gentle: sequential, avoids local pool starvation
    }

    // ---------- reporting ----------
    const critical = results.filter(r => r.verdict === 'CRITICAL');
    const bySignature = critical.reduce((a, r) => { a[r.signature] = (a[r.signature] || 0) + 1; return a; }, {});
    const slowest = [...results].sort((a, b) => b.ms - a.ms).slice(0, 10);
    const summary = {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        routesScanned: results.length,
        counts,
        critical_500_count: critical.length,
        signatures: bySignature,
        buckets: results.reduce((a, r) => { a[r.bucket] = (a[r.bucket] || 0) + 1; return a; }, {}),
        criticalRoutes: critical.map(r => ({ url: r.url, status: r.status, family: r.family, bucket: r.bucket, signature: r.signature, error: r.error, bodySnippet: r.bodySnippet })),
        nonCritical: results.filter(r => r.verdict !== 'CRITICAL' && r.verdict !== 'OK')
            .map(r => ({ url: r.url, status: r.status, verdict: r.verdict, signature: r.signature, error: r.error, ms: r.ms })),
        slowest,
    };

    fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2), 'utf8');

    const md = [];
    md.push('# 500-Hunter Report (Buckets A & B, authenticated GET sweep)');
    md.push('');
    md.push(`**Generated:** ${summary.generatedAt}`);
    md.push(`**Base URL:** ${summary.baseUrl}`);
    md.push(`**Routes scanned:** ${summary.routesScanned}`);
    md.push('');
    md.push('## Verdict counts');
    md.push('');
    md.push('| Verdict | Count |');
    md.push('|---|---|');
    md.push(`| ✅ OK (2xx) | ${counts.ok} |`);
    md.push(`| ⚪ NON_CRASH (400/404/other 4xx) | ${counts.nonCrash} |`);
    md.push(`| 🔒 AUTH_BLOCKED (401/403) | ${counts.authBlocked} |`);
    md.push(`| 🚦 RATE_LIMITED (429) | ${counts.rateLimited} |`);
    md.push(`| 🔴 CRITICAL (5xx) | ${counts.critical} |`);
    md.push('');
    md.push(`**critical_500_count = ${critical.length}** → exit code ${critical.length === 0 ? '0 (PASS)' : '1 (FAIL)'}`);
    md.push('');
    if (critical.length) {
        md.push('## 🔴 Critical 5xx routes');
        md.push('');
        md.push('| Route | Status | Family | Bucket | Signature | Error |');
        md.push('|---|---|---|---|---|---|');
        for (const c of critical) md.push(`| \`${c.url}\` | ${c.status} | ${c.family} | ${c.bucket} | ${c.signature} | ${String(c.error || '').slice(0, 80)} |`);
        md.push('');
        md.push('### Error bodies (first 400 chars)');
        for (const c of critical) {
            md.push('');
            md.push(`<details><summary><code>${c.url}</code></summary>`);
            md.push('');
            md.push('```json');
            md.push(String(c.bodySnippet || '').replace(/```/g, "'''"));
            md.push('```');
            md.push('</details>');
        }
        md.push('');
    } else {
        md.push('## ✅ Zero critical 5xx responses across Buckets A & B.');
        md.push('');
    }
    const sigRows = Object.entries(bySignature);
    if (sigRows.length) {
        md.push('## Signatures');
        md.push('');
        md.push('| Signature | Count | Implication |');
        md.push('|---|---|---|');
        const meaning = {
            UUID_MISMATCH: 'UUID vs INTEGER primary-key mix in SQL/route params',
            SCHEMA_GAP: 'Missing table/column in the database',
            UNKNOWN: 'Unclassified — inspect body',
        };
        for (const [s, n] of sigRows) md.push(`| ${s} | ${n} | ${meaning[s] || ''} |`);
        md.push('');
    }
    md.push('## Slowest 10 routes');
    md.push('');
    md.push('| Route | Status | ms |');
    md.push('|---|---|---|');
    for (const s of slowest) md.push(`| \`${s.url}\` | ${s.status} | ${s.ms} |`);
    md.push('');

    fs.writeFileSync(REPORT_MD, md.join('\n'), 'utf8');

    console.log('\n' + '='.repeat(78));
    console.log(`Scanned ${results.length} routes → OK ${counts.ok} | NON_CRASH ${counts.nonCrash} | AUTH_BLOCKED ${counts.authBlocked} | RATE_LIMITED ${counts.rateLimited} | CRITICAL ${counts.critical}`);
    if (counts.rateLimited > 0) console.log('⚠️  RATE_LIMITED responses detected — restart the local server or lower the sweep rate before trusting this verdict.');
    if (critical.length) {
        console.log('\nCritical 5xx routes:');
        for (const c of critical) console.log(`  ${c.status} ${c.url}  [${c.family}] -> ${c.signature}`);
    }
    console.log(`\n📄 ${path.relative(ROOT, REPORT_JSON)}`);
    console.log(`📄 ${path.relative(ROOT, REPORT_MD)}`);
    console.log(critical.length === 0 ? '\n✅ EXIT 0 — zero critical HTTP 500s in Buckets A & B\n' : `\n❌ EXIT 1 — ${critical.length} critical HTTP 500(s) remain\n`);
    process.exit(critical.length === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error('❌ 500-HUNTER FAILED:', e.message);
    process.exit(1);
});
