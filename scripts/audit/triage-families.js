/**
 * Triage broken frontend calls into 3 buckets:
 *  A) Route mounted in server.js (dev) but NOT in server-cloud.js -> FIX: mount in server-cloud
 *  B) Route file exists in server/routes but not mounted anywhere -> FIX: create mount
 *  C) No route file exists -> genuinely unimplemented (UI placeholder / dead button)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/audit/route-matrix-report.json'), 'utf8'));
const serverJs = fs.readFileSync(path.join(ROOT, 'server', 'server.js'), 'utf8');
const routeFiles = fs.readdirSync(path.join(ROOT, 'server', 'routes')).join('\n').toLowerCase();

const families = [...new Set(report.broken.map(b => b.url.split('/')[2]))];

const triage = { A_devOnly: [], B_fileExists: [], C_unimplemented: [] };

for (const fam of families) {
    const devMount = serverJs.includes(`'/api/${fam}'`) || serverJs.includes(`"/api/${fam}"`);
    // family -> candidate filename fragments
    const needle = fam.replace(/-/g, '');
    const hasFile = routeFiles.includes(needle) || routeFiles.includes(fam);
    if (devMount) triage.A_devOnly.push(fam);
    else if (hasFile) triage.B_fileExists.push(fam);
    else triage.C_unimplemented.push(fam);
}

console.log('=== A) MOUNTED IN server.js ONLY (quick fix: mount in server-cloud.js) ===');
triage.A_devOnly.forEach(f => console.log('  /api/' + f));
console.log('\n=== B) ROUTE FILE EXISTS BUT NOT MOUNTED anywhere ===');
triage.B_fileExists.forEach(f => console.log('  /api/' + f));
console.log('\n=== C) NO ROUTE FILE (unimplemented UI / placeholder) ===');
triage.C_unimplemented.forEach(f => console.log('  /api/' + f));

fs.writeFileSync(path.join(ROOT, 'scripts/audit/triage-families.json'), JSON.stringify(triage, null, 2));
console.log('\nSaved -> scripts/audit/triage-families.json');
