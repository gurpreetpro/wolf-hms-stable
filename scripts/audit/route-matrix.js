/**
 * Route Reconciliation Matrix — Phase 1 of System-Wide Connectivity Fix
 * Compares frontend HTTP calls (client/src) against backend routes
 * registered in server/server-cloud.js (production entry).
 * Usage: node scripts/audit/route-matrix.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_CLOUD = path.join(ROOT, 'server', 'server-cloud.js');
const CLIENT_SRC = path.join(ROOT, 'client', 'src');

const readDirRecursive = (dir, exts) => {
    let out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', 'dist', '.git', 'public'].includes(entry.name)) continue;
            out = out.concat(readDirRecursive(full, exts));
        } else if (exts.includes(path.extname(entry.name))) {
            out.push(full);
        }
    }
    return out;
};

const normalize = (p) => p
    .replace(/\?.*$/, '')            // strip query strings
    .replace(/\$\{[^}]*\}/g, '{}')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '{}')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/');

const patternToRegex = (p) => new RegExp('^' + normalize(p).split('{}').map(s =>
    s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+') + '$');

// ---- 1. Parse server-cloud.js mounts ----
const cloudSrc = fs.readFileSync(SERVER_CLOUD, 'utf8');
const requireMap = {};
const reqRe = /(?:const|let|var)\s+(\w+)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
let m;
while ((m = reqRe.exec(cloudSrc)) !== null) requireMap[m[1]] = m[2];

const mounts = [];
const useRe = /app\.use\(\s*['"](\/api[^'"]*)['"]\s*,([^)]*)\)/g;
while ((m = useRe.exec(cloudSrc)) !== null) {
    const mount = m[1];
    const expr = m[2];
    const inlineReq = expr.match(/require\(\s*['"]([^'"]+)['"]/);
    const identMatch = expr.match(/([A-Za-z_$][\w$]*)\s*\)?\s*$/);
    let file = null;
    if (inlineReq) file = inlineReq[1];
    else if (identMatch && requireMap[identMatch[1]]) file = requireMap[identMatch[1]];
    mounts.push({ mount, expr: expr.trim(), file });
}


// ---- 2. Parse route files ----
const backendRoutes = [];
const mountIssues = [];
const METHOD_RE = /(?:router|app|[A-Za-z_$][\w$]*)\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]*)['"`]/gi;

for (const mt of mounts) {
    if (!mt.file) { mountIssues.push({ mount: mt.mount, reason: 'unresolved expr: ' + mt.expr }); continue; }
    let filePath = path.join(ROOT, 'server', mt.file);
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.js')) filePath += '.js';
    if (!fs.existsSync(filePath)) { mountIssues.push({ mount: mt.mount, file: mt.file, reason: 'FILE NOT FOUND' }); continue; }
    const src = fs.readFileSync(filePath, 'utf8');
    let r;
    while ((r = METHOD_RE.exec(src)) !== null) {
        const sub = r[2];
        if (!sub.startsWith('/')) continue;
        backendRoutes.push({
            method: r[1].toUpperCase() === 'ALL' ? '*' : r[1].toUpperCase(),
            fullPath: normalize(mt.mount + sub),
            file: path.basename(filePath)
        });
    }
}

// ---- 3. Scan frontend calls ----
const clientFiles = readDirRecursive(CLIENT_SRC, ['.js', '.jsx']);
const FE_CALL_RE = /(?:api|axios|axiosInstance|apiClient|client)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[`'"](\/api[^`'"]*)[`'"`]/gi;
const FETCH_RE = /fetch\s*\(\s*[`'"](\/api[^`'"]*)[`'"`]/gi;

const frontendCalls = [];
for (const f of clientFiles) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(ROOT, f);
    let c;
    const push = (method, url, idx) => {
        frontendCalls.push({ method: method.toUpperCase(), url: normalize(url), file: rel, line: src.slice(0, idx).split('\n').length });
    };
    while ((c = FE_CALL_RE.exec(src)) !== null) push(c[1], c[2], c.index);
    while ((c = FETCH_RE.exec(src)) !== null) push('GET', c[1], c.index);
}

const seen = new Set();
const uniqCalls = frontendCalls.filter(c => {
    const k = c.method + ' ' + c.url;
    if (seen.has(k)) return false;
    seen.add(k); return true;
});

// ---- 4. Reconcile ----
const routeIndex = backendRoutes.map(r => ({ ...r, regex: patternToRegex(r.fullPath) }));
const broken = [];
let okCount = 0;
for (const call of uniqCalls) {
    const hit = routeIndex.find(r => (r.method === '*' || r.method === call.method) && r.regex.test(call.url));
    if (hit) okCount++;
    else broken.push(call);
}
broken.sort((a, b) => a.url.localeCompare(b.url));

// ---- 5. Report ----
console.log('='.repeat(80));
console.log('ROUTE RECONCILIATION MATRIX - server-cloud.js vs client/src');
console.log('='.repeat(80));
console.log(`Backend mounts parsed : ${mounts.length}`);
console.log(`Backend routes indexed: ${backendRoutes.length}`);
console.log(`Frontend unique calls : ${uniqCalls.length}`);
console.log(`Matched OK            : ${okCount}`);
console.log(`BROKEN (no backend)   : ${broken.length}\n`);

if (mountIssues.length) {
    console.log('--- MOUNT ISSUES (server-cloud.js) ---');
    mountIssues.forEach(i => console.log(`  [!] ${i.mount} -> ${i.file || ''} ${i.reason}`));
    console.log('');
}

console.log('--- BROKEN FRONTEND CALLS (no matching route in server-cloud.js) ---');
let lastPrefix = '';
for (const b of broken) {
    const prefix = b.url.split('/').slice(0, 3).join('/');
    if (prefix !== lastPrefix) { console.log(`\n[${prefix}]`); lastPrefix = prefix; }
    console.log(`  ${b.method.padEnd(6)} ${b.url}`);
    console.log(`         at ${b.file}:${b.line}`);
}

fs.writeFileSync(
    path.join(ROOT, 'scripts', 'audit', 'route-matrix-report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), mounts: mounts.length, backendRoutes: backendRoutes.length, frontendCalls: uniqCalls.length, matched: okCount, broken, mountIssues }, null, 2)
);
console.log('\nJSON report written to scripts/audit/route-matrix-report.json');
