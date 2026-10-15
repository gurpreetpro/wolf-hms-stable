/**
 * QA Phase 0.3 — Bucket A/B Route Manifest Builder
 *
 * Parses every router mounted in server/server-cloud.js (the production entry)
 * plus inline `app.<verb>('/api/...')` handlers, and emits a flat manifest of
 * { method, path, family, bucket, hasParams, sourceFile }.
 *
 * Bucket A = routers restored/ported in the connectivity fix (dev parity + sub-route ports)
 * Bucket B = the 13 late-mounted routers (anaesthesia, branding, charges, dicom, intraop,
 *            license, migration, orthopedic(s), pac, pacu, pos, preauth, test)
 * Bucket C = documented-missing families (frontend calls with no backend mount) -> emitted to
 *            plans/bucket_c_routes.json for E2E 404 exemptions.
 *
 * Usage: node scripts/qa/build-route-manifest.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_CLOUD = path.join(ROOT, 'server', 'server-cloud.js');
const PLANS = path.join(ROOT, 'plans');

const BUCKET_B_FAMILIES = /^(anaesthesia|branding|charges|dicom|dicomMock|intraop|intraOp|license|migration|orthopedic|orthopedics|pac|pacu|pos|preauth|test)Routes$/i;

const normalizePath = (p) => p
    .replace(/\?.*$/, '')
    .replace(/\$\{[^}]*\}/g, '{}')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '{}')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/');

const src = fs.readFileSync(SERVER_CLOUD, 'utf8');

// ---- require map: ident -> relative module path ----
const requireMap = {};
{
    const reqRe = /(?:const|let|var)\s+(\w+)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = reqRe.exec(src)) !== null) requireMap[m[1]] = m[2];
}

// ---- mounts: app.use('/api/x', ..., routerIdent) ----
const mounts = [];
{
    const useRe = /app\.use\(\s*['"](\/api[^'"]*)['"]\s*,([^)]*)\)/g;
    let m;
    while ((m = useRe.exec(src)) !== null) {
        const mount = m[1];
        const expr = m[2];
        const idents = expr.match(/[A-Za-z_$][\w$]*/g) || [];
        let file = null;
        for (const id of idents) {
            if (requireMap[id] && !/middleware/i.test(id)) { file = requireMap[id]; }
        }
        if (!file) continue; // middleware-only app.use(limiter) etc.
        mounts.push({ mount, file });
    }
}

// ---- inline routes declared directly in server-cloud.js ----
const manifest = [];
const METHOD_RE = /(?:router|app|[A-Za-z_$][\w$]*)\s*\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]*)['"`]/gi;
{
    let m;
    while ((m = METHOD_RE.exec(src)) !== null) {
        const sub = m[2];
        if (!sub.startsWith('/api')) continue;
        const method = m[1].toUpperCase() === 'ALL' ? 'ALL' : m[1].toUpperCase();
        manifest.push({
            method,
            path: normalizePath(sub),
            family: 'server-cloud-inline',
            bucket: 'A',
            hasParams: /:|\{/.test(sub.replace(/\?.*$/, '')),
            sourceFile: 'server/server-cloud.js',
        });
    }
}

// ---- routes inside each mounted router ----
for (const mt of mounts) {
    let filePath = path.join(ROOT, 'server', mt.file);
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.js')) filePath += '.js';
    if (!fs.existsSync(filePath)) continue;
    const routerSrc = fs.readFileSync(filePath, 'utf8');
    const family = path.basename(filePath, '.js');
    const bucket = BUCKET_B_FAMILIES.test(family) ? 'B' : 'A';
    let m;
    const re = new RegExp(METHOD_RE.source, 'gi');
    while ((m = re.exec(routerSrc)) !== null) {
        const sub = m[2];
        if (!sub.startsWith('/')) continue;
        const method = m[1].toUpperCase() === 'ALL' ? 'ALL' : m[1].toUpperCase();
        manifest.push({
            method,
            path: normalizePath(mt.mount + sub),
            family,
            bucket,
            hasParams: /:|\{/.test(sub) || /:/.test(mt.mount),
            sourceFile: `server/${mt.file.endsWith('.js') ? mt.file : mt.file + '.js'}`,
        });
    }
}

// dedupe by method+path (a router can be mounted twice)
const seen = new Set();
const deduped = manifest.filter(r => {
    const k = r.method + ' ' + r.path;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
}).sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

// ---- Bucket C: frontend calls with no backend route (from route matrix report) ----
const matrixReport = path.join(ROOT, 'scripts', 'audit', 'route-matrix-report.json');
let bucketC = [];
if (fs.existsSync(matrixReport)) {
    const rep = JSON.parse(fs.readFileSync(matrixReport, 'utf8'));
    bucketC = (rep.broken || []).map(b => ({ method: b.method, path: normalizePath(b.url), calledFrom: b.file, line: b.line }));
}

fs.mkdirSync(PLANS, { recursive: true });
const counts = {
    generatedAt: new Date().toISOString(),
    mounts: mounts.length,
    total: deduped.length,
    byBucket: deduped.reduce((acc, r) => { acc[r.bucket] = (acc[r.bucket] || 0) + 1; return acc; }, {}),
    byMethod: deduped.reduce((acc, r) => { acc[r.method] = (acc[r.method] || 0) + 1; return acc; }, {}),
    getWithParams: deduped.filter(r => r.method === 'GET' && r.hasParams).length,
};

fs.writeFileSync(path.join(PLANS, 'bucket_ab_routes.json'), JSON.stringify({ meta: counts, routes: deduped }, null, 2));
fs.writeFileSync(path.join(PLANS, 'bucket_c_routes.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: bucketC.length, routes: bucketC }, null, 2));

console.log('='.repeat(70));
console.log('BUCKET A/B ROUTE MANIFEST');
console.log('='.repeat(70));
console.log(`Mounts with resolvable routers : ${counts.mounts}`);
console.log(`Total routes in manifest       : ${counts.total}`);
console.log(`  Bucket A                     : ${counts.byBucket.A || 0}`);
console.log(`  Bucket B                     : ${counts.byBucket.B || 0}`);
console.log(`GET routes with params         : ${counts.getWithParams}`);
console.log(`Bucket C (no backend) calls    : ${bucketC.length}`);
console.log('\nWritten: plans/bucket_ab_routes.json');
console.log('Written: plans/bucket_c_routes.json');
