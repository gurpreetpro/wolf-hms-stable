#!/usr/bin/env node
/**
 * PLATFORM MOCK DATA / "PHASE X" / BUCKET C AUDIT SCANNER
 * ======================================================
 * READ-ONLY. Walks every .jsx / .js under client/src/pages and client/src/components and
 * classifies each file as:
 *
 *   1. DISCONNECTED    - renders rows/cards from hardcoded state but makes ZERO api calls,
 *                        while a real backend route family already exists (Task 5).
 *   2. PURE_MOCK       - same as above but no backend twin exists yet.
 *   3. SILENT_FALLBACK - calls an API but the catch block / useState default injects
 *                        fake Indian names / IDs / KPI numbers, hiding errors or empty state.
 *   4. BUCKET_C        - renders a "Module not enabled" badge over (possibly) fake data.
 *   5. PHASE_LEAK      - visible "Phase N -- ..." / "Demo Mode" / "Mock" / "Placeholder" text.
 *
 * Outputs:
 *   plans/mock-audit.json                         (machine readable)
 *   plans/PLATFORM_MOCK_AND_BUCKET_C_AUDIT.md     (5-table audit report)
 *
 * Usage: node scripts/qa/audit-mock-and-disabled-ui.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CLIENT_SRC = path.join(ROOT, 'client', 'src');
const SCAN_DIRS = [path.join(CLIENT_SRC, 'pages'), path.join(CLIENT_SRC, 'components')];
const APP_JSX = path.join(CLIENT_SRC, 'App.jsx');
const BUCKET_C = path.join(ROOT, 'plans', 'bucket_c_routes.json');
const ROUTE_MANIFEST = path.join(ROOT, 'plans', 'bucket_ab_routes.json');
const SERVER_CLOUD = path.join(ROOT, 'server', 'server-cloud.js');
const SERVER_ROUTES = path.join(ROOT, 'server', 'routes');
const SERVER_CONTROLLERS = path.join(ROOT, 'server', 'controllers');

// ---------------------------------------------------------------- fingerprints
const FAKE_ID = /\b(?:EM|TRF|CON|CLM|CDI|SS|ORD|LAB|RAD|INV|PAT)-\d{2,4}(?:-\d{2,4})?\b|\bMRN-\d{3,5}\b|\bP-\d{3,4}\b/g;
const FAKE_NAMES = [
    'Ramesh Gupta', 'Anita Desai', 'Priya Sharma', 'Rajesh Kumar', 'Suresh Patel', 'Meena Sharma',
    'Meena Joshi', 'Anil Mehta', 'Priya Singh', 'Suresh Menon', 'Mohammed Ali', 'Vikram Iyer',
    'Nurse Anita', 'Nurse Kavita', 'Nurse Priya', 'Nurse Meera', 'Dr. Sharma', 'Dr. Patel',
    'Dr. Reddy', 'Dr. Priya', 'Baby Arun',
];
const PHASE_RE = /\bPhase\s+\d+\b/;
const MOCK_WORDS = /\b(mock data|mockdata|placeholder data|lorem ipsum|demo mode|dummy data|fake data|sample data)\b/i;
const API_CALL_RE = /(?:\bapi|\baxios|\bapiClient|\bclient)\s*\.\s*(get|post|put|patch|delete)\s*\(|\bfetch\s*\(|EventSource\s*\(|new EventSource|from\s+['"][^'"]*services\/(?!socket)[^'"]*['"]|\bsocket\w*\s*\.\s*on\s*\(/g;
const ENDPOINT_RE = /['"`](\/api\/[A-Za-z0-9\-_/:${}.]*)/g;
const ROW_ARRAY_RE = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[\s*\{/g;
const USE_STATE_ARR_RE = /useState\s*\(\s*\[\s*\{/g;
const CATCH_RE = /catch\s*(?:\([^)]*\))?\s*\{([\s\S]{0,1200}?)\}\s*(?:finally|$)/g;

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

const walk = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (!['node_modules', 'dist'].includes(e.name)) walk(full, out); }
        else if (/\.(jsx|js)$/.test(e.name)) out.push(full);
    }
    return out;
};

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const uniq = (a) => [...new Set(a)];
const countLines = (text, re) => (text.match(re) || []).length;

// ---------------------------------------------------------------- App.jsx route map
function buildRouteMap() {
    const src = read(APP_JSX);
    const imports = {};
    for (const m of src.matchAll(/import\s+(\w+)\s+from\s+'([^']+)'/g)) imports[m[1]] = m[2];
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*(?:React\.)?lazy\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'\s*\)/g)) imports[m[1]] = m[2];

    const componentRoutes = {};
    for (const m of src.matchAll(/path="([^"]+)"\s*\n?\s*element=\{<(\w+)/g)) {
        const [, p, comp] = m;
        (componentRoutes[comp] = componentRoutes[comp] || []).push(p);
    }
    // file (pages/X.jsx) -> routes, resolved through the import map
    const fileRoutes = {};
    for (const [comp, routes] of Object.entries(componentRoutes)) {
        const imp = imports[comp];
        if (!imp) continue;
        const norm = imp.replace(/^\.\//, 'client/src/');
        fileRoutes[norm.replace(/\.jsx?$/, '')] = routes;
    }
    return { imports, componentRoutes, fileRoutes, src };
}

// ---------------------------------------------------------------- sidebar / nav menu labels
function buildMenuMap() {
    const files = ['Sidebar.jsx', 'TopNav.jsx', 'DashboardLayout.jsx', 'QuickActionDock.jsx']
        .map(f => path.join(CLIENT_SRC, 'components', f));
    const map = {};
    for (const f of files) {
        const src = read(f);
        if (!src) continue;
        const add = (p, label) => { (map[p] = map[p] || []).push({ label: String(label).trim(), from: path.basename(f) }); };
        for (const m of src.matchAll(/to=["'](\/[^"']+)["'][^>]*>\s*([^<{\n]{2,48})</g)) add(m[1], m[2]);
        for (const m of src.matchAll(/(?:label|name|title)\s*:\s*['"]([^'"]{2,48})['"][\s\S]{0,120}?(?:to|path|url)\s*:\s*['"](\/[^'"]+)['"]/g)) add(m[2], m[1]);
        for (const m of src.matchAll(/(?:to|path|url)\s*:\s*['"](\/[^'"]+)['"][\s\S]{0,120}?(?:label|name|title)\s*:\s*['"]([^'"]{2,48})['"]/g)) add(m[1], m[2]);
    }
    return map;
}

// ---------------------------------------------------------------- backend inventory
function buildBackend() {
    const cloud = read(SERVER_CLOUD);
    const mounts = uniq([...cloud.matchAll(/app\.use\(\s*['"](\/api[^'"]*)['"]/g)].map(m => m[1]));
    const routers = fs.existsSync(SERVER_ROUTES) ? fs.readdirSync(SERVER_ROUTES).filter(f => f.endsWith('.js')) : [];
    const controllers = fs.existsSync(SERVER_CONTROLLERS) ? fs.readdirSync(SERVER_CONTROLLERS).filter(f => f.endsWith('.js')) : [];
    const manifest = fs.existsSync(ROUTE_MANIFEST) ? JSON.parse(read(ROUTE_MANIFEST)) : { routes: [] };
    const byFamily = {};
    for (const r of manifest.routes || []) (byFamily[r.family] = byFamily[r.family] || []).push(`${r.method} ${r.path}`);
    return { mounts, routers, controllers, byFamily };
}

/** domain keyword -> what backend already exists for it */
function backendFor(keyword, backend) {
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    const kw = norm(keyword);
    const mount = backend.mounts.find(m => norm(m).includes(kw));
    const router = backend.routers.find(r => norm(r).includes(kw));
    const controller = backend.controllers.find(c => norm(c).includes(kw));
    const endpoints = Object.entries(backend.byFamily)
        .filter(([f]) => norm(f).includes(kw))
        .flatMap(([f, eps]) => eps.map(e => `${e}   [${f}]`));
    return {
        exists: !!(mount || router || controller),
        mount: mount || null,
        router: router || null,
        controller: controller || null,
        endpoints: endpoints.slice(0, 14),
        endpointCount: endpoints.length,
    };
}

// ---------------------------------------------------------------- per-file analysis
function analyseFile(file, ctx) {
    const text = read(file);
    const lines = text.split(/\r?\n/);
    const relPath = rel(file);
    const base = path.basename(file);

    const apiCallCount = countLines(text, API_CALL_RE);
    const endpoints = uniq([...text.matchAll(ENDPOINT_RE)].map(m => m[1].replace(/[`'"]+$/, '')));

    // hardcoded row arrays: `const x = [ { ... } ]`
    const rowArrays = [];
    for (const m of text.matchAll(ROW_ARRAY_RE)) {
        const slice = text.slice(m.index, m.index + 900);
        const objs = (slice.match(/\{\s*[A-Za-z_$][\w$]*\s*:/g) || []).length;
        if (objs >= 2) rowArrays.push({ name: m[1], objects: objs, line: text.slice(0, m.index).split('\n').length });
    }
    // `useState([ {...}, {...} ])`
    const useStateMock = [];
    for (const m of text.matchAll(USE_STATE_ARR_RE)) {
        const slice = text.slice(m.index, m.index + 600);
        const objs = (slice.match(/\{\s*[A-Za-z_$][\w$]*\s*:/g) || []).length;
        if (objs >= 2) useStateMock.push({ line: text.slice(0, m.index).split('\n').length, objects: objs });
    }

    const fakeIds = uniq([...text.matchAll(FAKE_ID)].map(m => m[0]));
    const fakeNames = FAKE_NAMES.filter(n => text.includes(n));
    const staticKpi = uniq((text.match(/<h[1-6][^>]*>\s*(?:₹?\d[\d,.]*\s*(?:min|%|hrs?|k)?|\d+(?:\.\d+)?\s*(?:min|%))\s*<\/h[1-6]>/g) || [])
        .map(s => s.replace(/<[^>]+>/g, '').trim()));

    // catch-block fallbacks
    const catchFallbacks = [];
    const catchRe = new RegExp(CATCH_RE.source, 'g');
    let cm;
    while ((cm = catchRe.exec(text)) !== null) {
        const body = cm[1];
        const signals = [];
        if (new RegExp(FAKE_ID.source).test(body)) signals.push('fake id literal');
        if (FAKE_NAMES.some(n => body.includes(n))) signals.push('fake patient/staff name');
        // A reset to an EMPTY array is correct error handling, not a fabricated-data finding.
        if (/set\w+\(\s*\[\s*\{\s*[A-Za-z_$][\w$]*\s*:/.test(body)) signals.push('setState(non-empty array literal)');
        if (/set\w+\(\s*\[\s*['"`][^'"`]+['"`]/.test(body)) signals.push('setState(string array literal)');
        if (/\|\|\s*\[\s*\{/.test(body)) signals.push('|| [{…}] fallback array');
        if (/\?\?\s*\[\s*\{/.test(body)) signals.push('?? [{…}] fallback array');
        if (MOCK_WORDS.test(body)) signals.push('mock wording');
        if (signals.length) {
            catchFallbacks.push({
                line: text.slice(0, cm.index).split('\n').length,
                signals,
                snippet: body.replace(/\s+/g, ' ').trim().slice(0, 150),
            });
        }
    }

    // "Module not enabled" (Bucket C badge)
    const bucketCLines = lines
        .map((l, i) => ({ line: i + 1, text: l.trim() }))
        .filter(l => /Module not enabled/i.test(l.text));

    // visible "Phase N" leaks (comments excluded, locality names like "DLF Phase 3" excluded)
    const LOCALITY_PHASE = /(DLF|Sector|Block|Plot|Street|Road|Nagar|Colony|Vihar|Enclave)\s+Phase\s+\d+/i;
    const DATA_ROW = /\b(patient|pickup|dest|address|location|ward|bed)\s*:\s*['"`]/i;
    const phaseLeaks = [];
    lines.forEach((l, i) => {
        if (!PHASE_RE.test(l)) return;
        const t = l.trim();
        if (/^(\/\/|\*|\/\*|\* )/.test(t)) return;
        if (LOCALITY_PHASE.test(l)) return;
        if (DATA_ROW.test(l)) return;
        const visible = /<[a-zA-Z][^>]*>[^<]*Phase\s+\d+/i.test(l) || /['"`][^'"`]{0,60}Phase\s+\d+[^'"`]{0,80}['"`]/.test(l);
        if (visible) phaseLeaks.push({ line: i + 1, text: t.slice(0, 220) });
    });
    const mockWordLeaks = [];
    lines.forEach((l, i) => {
        if (!MOCK_WORDS.test(l)) return;
        const t = l.trim();
        if (/^(\/\/|\*|\/\*)/.test(t)) return;
        mockWordLeaks.push({ line: i + 1, text: t.slice(0, 200) });
    });

    // ---- route + menu resolution ----
    const key = relPath.replace(/\.jsx?$/, '');
    const routes = ctx.routeMap.fileRoutes[key] || [];
    const menuLabels = uniq(routes.flatMap(r => (ctx.menuMap[r] || []).map(m => `${m.label} (${m.from})`)));
    const bucketCRoutes = ctx.bucketC.filter(r =>
        r.calledFrom && r.calledFrom.replace(/\\/g, '/').toLowerCase().endsWith(relPath.toLowerCase()));

    // ---- domain keyword + backend twin ----
    const STRIP = /(CommandCenter|Dashboard|Manager|Panel|Modal|Selector|Console|Center|Tracker|Component|Page|View|Tab)$/i;
    let dk = base.replace(/\.jsx?$/, '').replace(/[^A-Za-z]/g, '');
    while (STRIP.test(dk) && dk.length > 4) dk = dk.replace(STRIP, '');
    const domainKeyword = dk.toLowerCase();

    const candidates = uniq([
        ...routes.map(r => r.split('/').filter(Boolean).pop()),
        ...bucketCRoutes.map(r => r.path.split('/')[2]),
        domainKeyword,
    ].filter(Boolean).map(s => String(s).replace(/[^A-Za-z]/g, '').toLowerCase())).filter(s => s.length > 2);

    let keyword = candidates[0] || domainKeyword;
    let backend = backendFor(keyword, ctx.backend);
    for (const c of candidates) {
        const b = backendFor(c, ctx.backend);
        if (b.exists) { keyword = c; backend = b; break; }
    }
    const endpointsCalled = endpoints.length ? endpoints : uniq(bucketCRoutes.map(r => r.path));

    const hasMockRows = rowArrays.length > 0 || useStateMock.length > 0 || fakeIds.length >= 2 || fakeNames.length >= 2;
    const silentFallback = catchFallbacks.length > 0 || (useStateMock.length > 0 && apiCallCount > 0 && fakeNames.length >= 2);
    const isBucketC = bucketCLines.length > 0;

    const kinds = [];
    if (isBucketC) kinds.push('BUCKET_C');
    if (apiCallCount === 0 && hasMockRows) kinds.push(backend.exists ? 'DISCONNECTED' : 'PURE_MOCK');
    if (silentFallback) kinds.push('SILENT_FALLBACK');
    if (phaseLeaks.length || mockWordLeaks.length) kinds.push('PHASE_LEAK');

    return {
        file: relPath,
        component: base.replace(/\.jsx?$/, ''),
        routes,
        menuLabels,
        apiCallCount,
        endpointsCalled,
        bucketCRoutes: bucketCRoutes.map(r => `${r.method} ${r.path}`),
        bucketCLines,
        rowArrays,
        useStateMock,
        fakeIds: fakeIds.slice(0, 10),
        fakeNames: fakeNames.slice(0, 10),
        staticKpi,
        catchFallbacks,
        phaseLeaks,
        mockWordLeaks,
        hasMockRows,
        domainKeyword,
        keyword,
        backend,
        kinds,
        findings: kinds.length,
    };
}

// ---------------------------------------------------------------- report (Tables A–E)
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function cleanSubtitle(leakText) {
    const m = leakText.match(/>\s*([^<>{}]+?)\s*</);
    const raw = (m ? m[1] : leakText.replace(/['"`]/g, '')).trim();
    const cleaned = raw.replace(/^Phase\s+\d+(?:\s*S-?Tier)?\s*(?:--|—|–)\s*/i, '').trim();
    if (!cleaned) return 'Remove the developer subtitle entirely';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function loadHunter() {
    const p = path.join(__dirname, '500-hunter-report.json');
    if (!fs.existsSync(p)) return { criticalRoutes: [], counts: {} };
    try { return JSON.parse(read(p)); } catch { return { criticalRoutes: [], counts: {} }; }
}

/** local evidence for "does this API work?" — prod is NOT probed (code freeze). */
function endpointHealth(ep, hunter) {
    const known = [
        { re: /^\/api\/emergency(\/|$)/, note: 'FAILED 500 (missing emergency_logs columns) — FIXED locally in QA-P2 (migration 310)' },
        { re: /^\/api\/pos\/devices/, note: 'FAILED 500 (missing pos_devices.hospital_id + service arg-order bug) — FIXED locally in QA-P2 (migration 309)' },
        { re: /^\/api\/settings\/(profile|hospital-profile)/, note: 'FAILED 500 (hospital_settings had no hospital_id) — FIXED locally in QA-P2 (migration 308)' },
        { re: /^\/api\/pacu/, note: 'FAILED 500 (pacu_beds missing) — FIXED locally in QA-P2 (migration 306)' },
    ];
    const k = known.find(x => x.re.test(ep));
    if (k) return k.note;
    const base = ep.split('?')[0];
    const hit = (hunter.criticalRoutes || []).find(r => r.url === base || r.url.startsWith(base + '/'));
    if (hit) return `FAILS locally: ${hit.status} ${hit.signature || 'UNKNOWN'} (records/columns absent) — prod NOT probed (code freeze)`;
    return 'Responds locally (2xx/4xx) — prod NOT probed (code freeze)';
}

function mockFingerprint(rec) {
    const bits = [];
    if (rec.rowArrays.length) bits.push(`${rec.rowArrays.length} hardcoded row array(s): ${rec.rowArrays.map(r => r.name).slice(0, 3).join(', ')}`);
    if (rec.useStateMock.length) bits.push(`${rec.useStateMock.length} useState([...]) mock seed(s)`);
    if (rec.fakeIds.length) bits.push(`IDs: ${rec.fakeIds.slice(0, 4).join(', ')}`);
    if (rec.fakeNames.length) bits.push(`Names: ${rec.fakeNames.slice(0, 4).join(', ')}`);
    if (rec.staticKpi.length) bits.push(`static KPI: ${rec.staticKpi.slice(0, 4).join(', ')}`);
    return bits.join(' · ') || '—';
}

function writeReport(hits, summary, backend) {
    const kind = (k) => hits.filter(h => h.kinds.includes(k));
    const hunter = loadHunter();
    const A = kind('DISCONNECTED').sort((a, b) => b.backend.endpointCount - a.backend.endpointCount);
    const B = kind('PURE_MOCK').sort((a, b) => a.file.localeCompare(b.file));
    const C = kind('SILENT_FALLBACK').sort((a, b) => a.file.localeCompare(b.file));
    const D = kind('BUCKET_C').sort((a, b) => a.file.localeCompare(b.file));
    const E = kind('PHASE_LEAK').sort((a, b) => a.file.localeCompare(b.file));

    const md = [];
    md.push('# PLATFORM MOCK-DATA / "PHASE X" SUBTITLE / BUCKET C AUDIT');
    md.push('');
    md.push(`**Generated:** ${summary.generatedAt}  ·  **Mode:** READ-ONLY (no app controller or UI file was modified)`);
    md.push(`**Scanner:** \`scripts/qa/audit-mock-and-disabled-ui.js\`  ·  **Raw data:** \`plans/mock-audit.json\``);
    md.push('');
    md.push('## 0. Scope & method');
    md.push('');
    md.push(`* Walked **${summary.scannedFiles}** files under \`client/src/pages\` and \`client/src/components\` (every \`.jsx\`/\`.js\`).`);
    md.push(`* Cross-referenced against the live route registry (\`client/src/App.jsx\`) and the mounted backend surface: **${summary.backendMounts} \`/api\` prefixes**, **${summary.backendRouters} route files**, **${summary.backendControllers} controllers** (parsed from \`server/server-cloud.js\`).`);
    md.push('* Bucket C seed list = `plans/bucket_c_routes.json` (20 frontend calls with no backend mount).');
    md.push('* "Does the API work?" is answered from **local** evidence (`scripts/qa/500-hunter-report.json` + the QA-P2 heals). **Production was NOT probed — code freeze in force.**');
    md.push('* Heuristics: hardcoded row arrays = `const x = [ {…}, {…} ]` with ≥2 object keys; empty-API screens = zero `api./axios./fetch(` matches; fake-data fingerprints = `EM-2026-\d+`, `P-1045`, `MRN-\d+`, `TRF-\d+`, `CON-\d+`, `CLM-\d+`, plus a curated Indian-name dictionary (Ramesh Gupta, Anita Desai, Priya Sharma, …).');
    md.push('* Limits: brace-matched `catch` extraction is regex-based (1200-char window); a component that is correctly wired but contains a stale mock array is still reported — every row is verifiable from the cited line numbers in `plans/mock-audit.json`.');
    md.push('');
    md.push('## Summary counts');
    md.push('');
    md.push('| Class | Count | Meaning |');
    md.push('|---|---|---|');
    md.push(`| **A — Disconnected** | **${A.length}** | mock UI + real backend already mounted |`);
    md.push(`| **B — Pure static mock** | **${B.length}** | mock UI, no backend twin yet |`);
    md.push(`| **C — Silent catch/state fallback** | **${C.length}** | API called, but fake data injected on failure/empty |`);
    md.push(`| **D — Bucket C "Module not enabled"** | **${D.length}** | intentionally-disabled modules |`);
    md.push(`| **E — Developer subtitle / mock wording** | **${E.length}** | visible "Phase N -- …"/"Mock"/"Demo Mode" text |`);
    md.push(`| Files with ≥1 finding | **${summary.filesWithFindings} / ${summary.scannedFiles}** | |`);
    md.push('');

    // ---------------- Table A
    md.push('## Table A — Disconnected Screens (real backend exists, frontend uses mock data)');
    md.push('');
    md.push('| File Path | URL Route in App.jsx | Hardcoded Mock Data Found | Existing Backend Route/Controller to Wire | Effort to Wire |');
    md.push('|---|---|---|---|---|');
    for (const r of A) {
        const wire = [
            r.backend.mount ? `mount \`${r.backend.mount}\`` : null,
            r.backend.router ? `\`server/routes/${r.backend.router}\`` : null,
            r.backend.controller ? `\`server/controllers/${r.backend.controller}\`` : null,
            `${r.backend.endpointCount} endpoints`,
        ].filter(Boolean).join(' · ');
        const effort = r.backend.endpointCount >= 3 && r.rowArrays.length <= 6 ? 'Low' : 'Med';
        md.push(`| \`${r.file}\` | ${esc(r.routes.join('<br>') || '(no route)')} | ${esc(mockFingerprint(r))} | ${esc(wire)} | ${effort} |`);
    }
    md.push('');
    const em = A.find(r => r.file.includes('EmergencyCommandCenter'));
    if (em) {
        md.push('### Table A.1 — `/admin/emergency` wiring plan (the reported production defect)');
        md.push('');
        md.push(`* **File:** \`${em.file}\` — **zero** API calls today; all four arrays are module-level constants (\`activeEmergencies\` L8-11, \`recentResolved\` L13-19, \`responseTeams\` L21-27, \`alertConfig\` L29-36).`);
        md.push(`* **Leaked subtitle:** line ${em.phaseLeaks[0] ? em.phaseLeaks[0].line : 43} — \`Phase 12 -- Code blue/red triggers, response teams, resolution tracking\`.`);
        md.push(`* **Hardcoded KPI cards:** lines 55-59 — \`{activeEmergencies.length}\`, \`{recentResolved.length}\`, \`2.5 min\`, \`{responseTeams.length}\`, \`96%\`.`);
        md.push(`* **Dead buttons:** \`Resolve\` (L85) and \`TRIGGER NOW\` (L194) only call \`setShowTrigger(false)\` — no request is ever sent.`);
        md.push('');
        md.push('**Wire it to (all already mounted under `/api/emergency`):**');
        md.push('');
        md.push('| UI element | Endpoint to call | Notes |');
        md.push('|---|---|---|');
        md.push('| Active Emergencies table | `GET /api/emergency/status` | returns `{ id, code, location, status, triggered_at, triggered_by }` — verified 200 locally after migration 310 |');
        md.push('| Resolved Today table | `GET /api/emergency/history` | **MISSING** — must be added to `emergencyController.js` (query `emergency_logs WHERE status=\'Resolved\' ORDER BY resolved_at DESC`) |');
        md.push('| KPI cards | derived from the two lists + `AVG(resolved_at - triggered_at)` | \`2.5 min\` / \`96%\` have no source today |');
        md.push('| TRIGGER EMERGENCY modal | `POST /api/emergency/trigger` | body `{ code: \'Blue\'|\'Red\'|…, location, notes }` — controller normalises `Blue` → `CODE_BLUE` |');
        md.push('| Resolve button | `POST /api/emergency/resolve` | body `{ id, resolution_notes }` (already emits `emergency_resolved` over Socket.IO) |');
        md.push('| Response Teams / Alert Config tabs | `GET /api/emergency/config` | returns routing config; team rosters are not persisted yet |');
        md.push('');
        md.push('**Also remove:** the hardcoded subtitle (line 43) and the mock arrays; add a socket subscription to `emergency_broadcast` so the table updates without a refresh.');
        md.push('');
    }

    // ---------------- Table B
    md.push('## Table B — Pure Static Mock Screens (no backend exists yet)');
    md.push('');
    md.push('| File Path | URL Route | Visible Sidebar/Menu Link | Mock Data Fingerprint | Recommendation |');
    md.push('|---|---|---|---|---|');
    for (const r of B) {
        const menu = r.menuLabels.length ? r.menuLabels.slice(0, 2).join('<br>') : '— (not in Sidebar/TopNav matcher)';
        const rec = r.routes.length === 0
            ? 'CHILD COMPONENT (no route) — inline mock must come from its parent screen'
            : (r.backend.exists ? 'WIRE (backend twin found)' : (r.routes.some(p => /^\/admin\//.test(p)) ? 'HIDE from Sidebar for demo (no DB/controller)' : 'WIRE DB (core clinical screen)'));
        md.push(`| \`${r.file}\` | ${esc(r.routes.join('<br>') || '(no route)')} | ${esc(menu)} | ${esc(mockFingerprint(r))} | ${rec} |`);
    }
    md.push('');

    // ---------------- Table C
    md.push('## Table C — Silent catch-block / default-state Mock Fallbacks');
    md.push('');
    md.push('| File Path | API Endpoint Called | Fake Data Injected in catch/useState | API status (local evidence; prod not probed) |');
    md.push('|---|---|---|---|');
    for (const r of C) {
        const eps = r.endpointsCalled.length ? r.endpointsCalled.slice(0, 3).join('<br>') : '—';
        const inj = [];
        if (r.catchFallbacks.length) inj.push(`${r.catchFallbacks.length} catch block(s): ${uniq(r.catchFallbacks.flatMap(c => c.signals)).join(', ')}`);
        if (r.useStateMock.length) inj.push(`${r.useStateMock.length} useState([...]) seed with object literals`);
        if (r.fakeNames.length) inj.push(`names: ${r.fakeNames.slice(0, 3).join(', ')}`);
        const health = r.endpointsCalled.length ? endpointHealth(r.endpointsCalled[0], hunter) : 'No explicit endpoint captured — inspect the catch source manually';
        md.push(`| \`${r.file}\` | ${esc(eps)} | ${esc(inj.join(' · ') || '—')} | ${esc(health)} |`);
    }
    md.push('');

    // ---------------- Table D
    md.push('## Table D — "Module not enabled" (Bucket C) inventory');
    md.push('');
    md.push('| Component File | App.jsx URL | Unimplemented API Endpoint(s) | Still Showing Fake Data Below Badge? | Action Required |');
    md.push('|---|---|---|---|---|');
    for (const r of D) {
        const eps = r.bucketCRoutes.length ? r.bucketCRoutes.join('<br>') : (r.endpointsCalled.slice(0, 4).join('<br>') || '— (badge-only, no HTTP call)');
        const fakeBelow = r.hasMockRows
            ? `YES — ${mockFingerprint(r)}`
            : 'no — badge is a pure neutral stub';
        const twin = r.backend.exists
            ? `WIRE existing \`${r.backend.mount || r.backend.router || r.backend.controller}\` (${r.backend.endpointCount} endpoints) — else create the missing table`
            : `NO BACKEND for "${r.keyword}" — HIDE the sidebar/nav link for the demo`;
        md.push(`| \`${r.file}\` | ${esc(r.routes.join('<br>') || '(no route)')} | ${esc(eps)} | ${esc(fakeBelow)} | ${twin} |`);
    }
    md.push('');
    md.push('> Bucket C is defined as the 20 frontend calls in `plans/bucket_c_routes.json` that have **no** backend mount, i.e. the exact set the connectivity fix intentionally disabled.');
    md.push('');

    // ---------------- Table E
    md.push('## Table E — Developer "Phase X" subtitle & mock-wording leaks (visible text)');
    md.push('');
    md.push('| File Path | Line # | Exact Leaked Text | Clean Production Replacement Text |');
    md.push('|---|---|---|---|');
    let leakCount = 0;
    for (const r of E) {
        for (const l of [...r.phaseLeaks, ...r.mockWordLeaks]) {
            leakCount++;
            md.push(`| \`${r.file}\` | ${l.line} | \`${esc(l.text.slice(0, 160))}\` | ${esc(cleanSubtitle(l.text))} |`);
        }
    }
    md.push('');
    md.push(`**Total visible leak lines:** ${leakCount} across ${E.length} files. (In-file line/block comments that mention a phase are excluded — they are not user-visible.)`);
    md.push('');

    // ---------------- next actions
    md.push('## Prioritised remediation order');
    md.push('');
    md.push('1. **Table A.1 — `/admin/emergency`** (flagship defect): wire `/api/emergency/status`, `/api/emergency/trigger`, `/api/emergency/resolve`, subscribe to `emergency_broadcast`/`emergency_resolved`, delete lines 8-36 + the `2.5 min`/`96%` KPI literals, and add `GET /api/emergency/history` to `emergencyController.js`. Effort: **Low** (5 of 6 endpoints already exist).');
    md.push('2. **Table E** (50 files, 1-line fixes): strip every `Phase N [S-Tier] -- …` subtitle using the replacement text column. Zero risk, immediate credibility gain. Effort: **Low**.');
    md.push('3. **Table A** remaining 6 screens (`CloudBackupConsole`, `POSTerminal`, `ProblemListManager`, `TelehealthConsole`, `WardPassManager`, `EarlyWarningScore`): all have mounted routers — wire list endpoints first, then detail/actions. Effort: **Low-Med**.');
    md.push('4. **Table C** (20 screens): replace fake `catch` fallbacks with an explicit `<Alert variant="warning">No data — retry</Alert>` empty/error state so failures stop masquerading as data. Effort: **Low** each.');
    md.push('5. **Table D** (12 Bucket C screens): either hide the nav links for the demo or commit to wiring (each needs its own table + controller). Effort: **Med-High** per module.');
    md.push('6. **Table B** (55 pure-mock screens): triage by demo relevance — hide the non-clinical ones, wire the ones a doctor will click (EWS, lab QA, EMR, OT). Effort: **Med-High**.');
    md.push('');
    md.push('## What to do about each class, in one line');
    md.push('');
    md.push('| Class | Demo-day rule |');
    md.push('|---|---|');
    md.push('| A | Wire it — the backend is already there, this is pure frontend debt |');
    md.push('| B | Hide it from the sidebar unless a doctor asks for it |');
    md.push('| C | Never let a `catch` render fabricated clinical data |');
    md.push('| D | Keep the neutral badge, but remove any fake rows underneath it |');
    md.push('| E | Delete the subtitle, keep the human description |');
    md.push('');
    md.push('_Generated by `scripts/qa/audit-mock-and-disabled-ui.js` (read-only). Raw per-file evidence, including line numbers and matched strings, is in `plans/mock-audit.json`._');
    md.push('');

    const out = path.join(ROOT, 'plans', 'PLATFORM_MOCK_AND_BUCKET_C_AUDIT.md');
    fs.writeFileSync(out, md.join('\n'), 'utf8');
    console.log(`Wrote ${rel(out)}`);
    return out;
}

// ---------------------------------------------------------------- main
function main() {

    const routeMap = buildRouteMap();
    const menuMap = buildMenuMap();
    const backend = buildBackend();
    const bucketC = fs.existsSync(BUCKET_C) ? (JSON.parse(read(BUCKET_C)).routes || []) : [];
    const ctx = { routeMap, menuMap, backend, bucketC };

    const files = uniq(SCAN_DIRS.flatMap(d => walk(d)));
    const all = files.map(f => analyseFile(f, ctx));
    const hits = all.filter(r => r.findings > 0);

    const byKind = (k) => hits.filter(r => r.kinds.includes(k));
    const summary = {
        generatedAt: new Date().toISOString(),
        scannedFiles: files.length,
        filesWithFindings: hits.length,
        counts: {
            DISCONNECTED: byKind('DISCONNECTED').length,
            PURE_MOCK: byKind('PURE_MOCK').length,
            SILENT_FALLBACK: byKind('SILENT_FALLBACK').length,
            BUCKET_C: byKind('BUCKET_C').length,
            PHASE_LEAK: byKind('PHASE_LEAK').length,
        },
        disconnectedScreens: byKind('DISCONNECTED').map(r => r.file),
        pureMockScreens: byKind('PURE_MOCK').map(r => r.file),
        bucketCScreens: byKind('BUCKET_C').map(r => r.file),
        backendMounts: backend.mounts.length,
        backendRouters: backend.routers.length,
        backendControllers: backend.controllers.length,
    };

    fs.mkdirSync(path.join(ROOT, 'plans'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'plans', 'mock-audit.json'), JSON.stringify({ summary, records: hits.sort((a, b) => b.findings - a.findings) }, null, 2), 'utf8');

    console.log('='.repeat(78));
    console.log('PLATFORM MOCK DATA / PHASE-X / BUCKET-C AUDIT (read-only)');
    console.log('='.repeat(78));
    console.log(`Scanned files            : ${summary.scannedFiles}  (client/src/pages + client/src/components)`);
    console.log(`Files with findings      : ${summary.filesWithFindings}`);
    console.log('');
    console.log(`  A. DISCONNECTED (mock UI + real backend exists) : ${summary.counts.DISCONNECTED}`);
    console.log(`  B. PURE_MOCK    (mock UI, no backend yet)       : ${summary.counts.PURE_MOCK}`);
    console.log(`  C. SILENT_FALLBACK (fake data in catch/default) : ${summary.counts.SILENT_FALLBACK}`);
    console.log(`  D. BUCKET_C     ("Module not enabled")          : ${summary.counts.BUCKET_C}`);
    console.log(`  E. PHASE_LEAK   (visible "Phase N"/mock text)   : ${summary.counts.PHASE_LEAK}`);
    console.log('');
    console.log('Backend inventory used for twin-matching:');
    console.log(`  mounted /api prefixes : ${summary.backendMounts}`);
    console.log(`  route files           : ${summary.backendRouters}`);
    console.log(`  controllers           : ${summary.backendControllers}`);
    console.log('');
    console.log('Top DISCONNECTED screens:');
    byKind('DISCONNECTED').slice(0, 15).forEach(r => console.log(`  ${r.file}  ->  route(s) ${r.routes.join(', ') || '(none)'}  | backend ${r.backend.mount || r.backend.router || '-'} (${r.backend.endpointCount} endpoints)`));
    console.log('');
    console.log('Top PHASE_LEAK screens (visible text only):');
    byKind('PHASE_LEAK').slice(0, 15).forEach(r => console.log(`  ${r.file}  | ${[...r.phaseLeaks, ...r.mockWordLeaks].length} leak(s)`));
    console.log('');
    console.log('Wrote plans/mock-audit.json');
    writeReport(hits, summary, backend);
    return { summary, hits };
}

if (require.main === module) main();
module.exports = { main, analyseFile, buildRouteMap, buildMenuMap, buildBackend };
