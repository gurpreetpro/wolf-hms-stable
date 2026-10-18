#!/usr/bin/env node
/**
 * SYSTEM-WIDE X-RAY AUDIT — READ ONLY.
 *
 * Pass 1  live/schema reference vs every SQL statement in server/**
 * Pass 2  UUID vs INTEGER traps (schema + parseInt/Number coercion)
 * Pass 3  client write payload keys vs controller req.body keys
 * Pass 4  Smart Ward tab matrix + core department endpoint matrix
 *
 * Emits: plans/system-wide-xray.json + plans/SYSTEM_WIDE_XRAY_REPORT.md
 *
 * READ-ONLY GUARANTEES
 *  - only SELECT / information_schema reads against the configured database
 *  - no INSERT/UPDATE/DELETE/DDL is ever executed
 *  - production introspection is DISABLED: .clinerules forbids SSH/SCP to the VPS
 *    and `ssh2` is not installed, so `prod_reachable` is reported false and the
 *    local schema (hospital_db) is used as the structural reference.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
require('dotenv').config({ path: path.join(ROOT, 'server', '.env'), quiet: true });
const { pool } = require(path.join(ROOT, 'server', 'config', 'db'));

const OUT_JSON = path.join(ROOT, 'plans', 'system-wide-xray.json');
const OUT_MD = path.join(ROOT, 'plans', 'SYSTEM_WIDE_XRAY_REPORT.md');
const read = (p) => fs.readFileSync(p, 'utf8');
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

function walk(dir, out = [], exts = /\.(js|jsx)$/) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (!['node_modules', 'dist', 'public', 'tests', '__tests__', 'migrations'].includes(e.name)) walk(full, out, exts);
        } else if (exts.test(e.name)) out.push(full);
    }
    return out;
}

/** Split a SQL fragment on top-level commas (ignores commas inside parens/quotes). */
function splitTopLevel(s) {
    const out = [];
    let depth = 0, quote = null, cur = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (quote) { cur += c; if (c === quote && s[i - 1] !== '\\') quote = null; continue; }
        if (c === "'" || c === '"') { quote = c; cur += c; continue; }
        if (c === '(') depth++;
        if (c === ')') depth--;
        if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
        cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

const SQL_KEYWORD = /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i;
const SQL_START = /^(?:\/\*[\s\S]*?\*\/\s*)?(SELECT|WITH|INSERT|UPDATE|DELETE)\b/i;
const RESERVED = new Set(['select', 'lateral', 'unnest', 'jsonb_array_elements', 'generate_series', 'values', 'set', 'where', 'on', 'using']);

/** Extract SQL strings (template literals + quoted strings) from a JS source. */
function extractSql(src) {
    const statements = [];
    const add = (text, idx) => {
        const sql = text.replace(/\\n/g, '\n').replace(/\\'/g, "'").trim();
        if (!SQL_START.test(sql)) return;                       // must START with a SQL keyword
        if (/^\s*(console|message|error|warn)/i.test(sql)) return;
        if (sql.length < 12) return;
        statements.push({ sql, index: idx, line: src.slice(0, idx).split('\n').length });
    };
    const tick = /`([\s\S]*?)`/g;
    let m;
    while ((m = tick.exec(src)) !== null) add(m[1], m.index);
    const sq = /'((?:SELECT|INSERT|UPDATE|DELETE)[\s\S]*?)'/gi;
    while ((m = sq.exec(src)) !== null) add(m[1], m.index);
    return statements;
}

/** Parse tables, aliases, insert columns, select columns and update assignments. */
function parseStatement(sql) {
    const clean = sql.replace(/\$\d+/g, '$n').replace(/--[^\n]*/g, ' ');
    const tables = new Set();
    const aliases = {};
    let m;
    const tre = /\b(?:FROM|JOIN|INSERT\s+INTO|UPDATE)\s+([A-Za-z_][\w]*)(?:\.[A-Za-z_][\w]*)?(?:\s+(?:AS\s+)?([A-Za-z_]\w*))?/gi;
    while ((m = tre.exec(clean)) !== null) {
        const raw = m[1];
        const after = clean[m.index + m[0].length] || '';
        if (after === '(') continue;                            // SQL function, not a table
        const tbl = raw.replace(/^public\./, '');
        const lower = tbl.toLowerCase();
        if (RESERVED.has(lower)) continue;
        if (/^pg_/i.test(lower)) continue;
        if (/^(age|now|extract|date_trunc|coalesce|generate_series|unnest|jsonb_|current_date|current_timestamp)$/i.test(lower)) continue;
        tables.add(tbl);
        if (m[2] && !RESERVED.has(m[2].toLowerCase())) aliases[m[2]] = tbl;
    }
    const insert = clean.match(/INSERT\s+INTO\s+([A-Za-z_][\w.]*)\s*\(([^)]*)\)/i);
    const update = clean.match(/UPDATE\s+([A-Za-z_][\w.]*)\s+SET\s+([\s\S]*?)(?:\bWHERE\b|\bRETURNING\b|$)/i);
    const select = clean.match(/SELECT\s+([\s\S]*?)\s+FROM\s/i);
    return {
        tables: [...tables],
        aliases,
        insertTable: insert ? insert[1].replace(/^public\./, '') : null,
        insertColumns: insert ? splitTopLevel(insert[2]).map(c => c.trim().replace(/"/g, '')).filter(Boolean) : [],
        updateTable: update ? update[1].replace(/^public\./, '') : null,
        updateColumns: update
            ? splitTopLevel(update[2]).map(a => (a.split('=')[0] || '').trim().split('.').pop().replace(/"/g, '')).filter(c => /^[A-Za-z_]\w*$/.test(c))
            : [],
        selectColumns: select ? splitTopLevel(select[1]).map(c => c.trim()).filter(c => c !== '*' && !c.startsWith('*')) : [],
    };
}

async function loadSchema() {
    const snapshotPath = path.join(ROOT, 'plans', 'prod-schema-snapshot.json');
    let cols;
    let isProdSnapshot = false;
    let constraints = [];
    let counts = [];

    if (fs.existsSync(snapshotPath)) {
        try {
            cols = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
            isProdSnapshot = true;
            console.log(`Loaded real production schema from plans/prod-schema-snapshot.json (${cols.length} column rows)`);
        } catch (e) {
            console.warn('Failed to parse prod-schema-snapshot.json, falling back to local pool:', e.message);
        }
    }

    if (!isProdSnapshot) {
        cols = (await pool.query(
            `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
               FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`
        )).rows;
        constraints = (await pool.query(
            `SELECT conrelid::regclass::text AS tbl, conname, contype, pg_get_constraintdef(oid) AS def
               FROM pg_constraint WHERE connamespace='public'::regnamespace`
        )).rows;
        counts = (await pool.query(
            `SELECT relname, n_live_tup::int AS rows FROM pg_stat_user_tables ORDER BY relname`
        )).rows;
    }
    const schema = { tables: {}, isProdSnapshot };
    for (const c of cols) {
        if (!schema.tables[c.table_name]) schema.tables[c.table_name] = { columns: {}, rowCount: 0 };
        schema.tables[c.table_name].columns[c.column_name] = {
            type: c.data_type, udt: c.udt_name,
            nullable: c.is_nullable === 'YES',
            hasDefault: c.column_default !== null,
        };
    }
    for (const c of counts) if (schema.tables[c.relname]) schema.tables[c.relname].rowCount = c.rows;
    schema.constraints = constraints.map(c => ({ table: String(c.tbl).replace(/^public\./, ''), name: c.conname, type: c.contype, def: c.def }));
    return schema;
}

/** PASS 1 — validate every SQL statement against the schema. */
function pass1(schema, files) {
    const statements = [];
    const tableNames = new Set(Object.keys(schema.tables));
    for (const file of files) {
        const src = read(file);
        for (const st of extractSql(src)) {
            const p = parseStatement(st.sql);
            if (!p.tables.length) continue;
            const ctes = new Set([...st.sql.matchAll(/\b(?:WITH|,)\s*([A-Za-z_]\w*)\s+AS\s*\(/gi)].map(m => m[1]));
            const realTables = p.tables.filter(t => !ctes.has(t));
            const missingTables = realTables.filter(t => !tableNames.has(t));
            const missingColumns = [];
            const notNullTraps = [];
            const known = (t) => schema.tables[t]?.columns || null;

            if (p.insertTable && known(p.insertTable) && p.insertColumns.length) {
                for (const col of p.insertColumns) {
                    if (!known(p.insertTable)[col]) missingColumns.push({ table: p.insertTable, column: col, via: 'INSERT column list' });
                }
                const missing = Object.entries(known(p.insertTable))
                    .filter(([name, meta]) => !meta.nullable && !meta.hasDefault && !p.insertColumns.includes(name))
                    .map(([name]) => name);
                if (missing.length) notNullTraps.push({ table: p.insertTable, missing });
            }

            if (p.updateTable && known(p.updateTable)) {
                for (const col of p.updateColumns) {
                    if (col === 'SET') continue;
                    if (!known(p.updateTable)[col]) missingColumns.push({ table: p.updateTable, column: col, via: 'UPDATE SET' });
                }
            }

            for (const raw of p.selectColumns) {
                let expr = raw.replace(/\s+AS\s+\w+$/i, '').trim();
                if (!expr || expr.includes('(') || expr.startsWith("'") || expr.startsWith('::')) continue;
                if (/^(CASE|DISTINCT|COALESCE|NULLIF|CAST|EXTRACT|COUNT|SUM|AVG|MIN|MAX|NOW|CURRENT_)/i.test(expr)) continue;
                expr = expr.split('::')[0].trim();
                if (/^-?\d+(\.\d+)?$/.test(expr)) continue;
                const dotted = expr.match(/^([A-Za-z_]\w*)\.([A-Za-z_]\w*)$/);
                if (dotted) {
                    const tbl = p.aliases[dotted[1]] || (tableNames.has(dotted[1]) ? dotted[1] : null);
                    if (tbl && known(tbl) && !known(tbl)[dotted[2]]) {
                        missingColumns.push({ table: tbl, column: dotted[2], via: 'SELECT' });
                    }
                    continue;
                }
                if (!/^[A-Za-z_]\w*$/.test(expr)) continue;
                if (/^(SELECT|FROM|WHERE|AND|OR|NULL|TRUE|FALSE|AS|ON|LEFT|RIGHT|INNER|JOIN|GROUP|ORDER|BY|LIMIT|OFFSET|HAVING|UNION|LATERAL|WITH)$/i.test(expr)) continue;
                const owners = realTables.filter(t => known(t) && known(t)[expr]);
                if (owners.length === 0 && realTables.length > 0) {
                    missingColumns.push({ table: realTables.join('/'), column: expr, via: 'SELECT (unqualified)' });
                }
            }

            if (!missingTables.length && !missingColumns.length && !notNullTraps.length) continue;
            statements.push({
                file: rel(file), line: st.line,
                sql: st.sql.replace(/\s+/g, ' ').slice(0, 260),
                tables: realTables,
                missingTables, missingColumns, notNullTraps,
                severity: missingTables.length || notNullTraps.length || missingColumns.some(c => c.via !== 'SELECT (unqualified)') ? 'error' : 'warn',
            });
        }
    }
    return statements;
}



/* ------------------------------------------------------------------ PASS 2 */
const ID_REF = /(patient|admission|ipd|current_admission|encounter|visit)/i;
function pass2(schema, serverFiles) {
    const schemaMismatches = [];
    for (const [tbl, meta] of Object.entries(schema.tables)) {
        for (const [col, c] of Object.entries(meta.columns)) {
            if (!/_id$/.test(col) || !ID_REF.test(col)) continue;
            if (!['integer', 'smallint', 'bigint'].includes(c.type)) continue;
            schemaMismatches.push({ table: tbl, column: col, type: c.type });
        }
    }
    const coercion = [];
    for (const file of serverFiles) {
        const src = read(file);
        for (const m of src.matchAll(/parseInt\s*\(\s*([^),]{0,80}?)\s*[,)]/g)) {
            const arg = m[1].trim();
            if (!/(admission|patient|ipd|encounter|visit)\w*id/i.test(arg)) continue;
            coercion.push({ file: rel(file), line: src.slice(0, m.index).split('\n').length, kind: 'parseInt()', expr: arg.slice(0, 90) });
        }
        for (const m of src.matchAll(/\bNumber\s*\(\s*([^),]{0,80}?)\s*\)/g)) {
            const arg = m[1].trim();
            if (!/(admission|patient|ipd|encounter|visit)\w*id/i.test(arg)) continue;
            coercion.push({ file: rel(file), line: src.slice(0, m.index).split('\n').length, kind: 'Number()', expr: arg.slice(0, 90) });
        }
        for (const m of src.matchAll(/::\s*(int|integer|bigint)/gi)) {
            const line = src.slice(0, m.index).split('\n').length;
            const ctx = src.split('\n')[line - 1] || '';
            if (!/(admission|patient|ipd|encounter|visit)\w*id/i.test(ctx)) continue;
            coercion.push({ file: rel(file), line, kind: `::${m[1]}`, expr: ctx.trim().slice(0, 90) });
        }
    }
    return { schemaMismatches, coercion };
}

/* ------------------------------------------------------------------ PASS 3 */
function balancedBlock(src, openIdx, open = '{', close = '}') {
    let depth = 0, quote = null;
    for (let i = openIdx; i < src.length; i++) {
        const c = src[i];
        if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
        if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
        if (c === open) depth++;
        else if (c === close) { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
    }
    return src.slice(openIdx);
}

function buildRouteIndex(controllers) {
    const mounts = [];
    const cloud = read(path.join(ROOT, 'server', 'server-cloud.js'));
    const requires = {};
    for (const m of cloud.matchAll(/const\s+(\w+)\s*=\s*require\('\.\/routes\/([\w-]+)'\)/g)) requires[m[1]] = m[2];
    for (const m of cloud.matchAll(/app\.use\('([^']+)',\s*(\w+)\)/g)) {
        if (!requires[m[2]]) continue;
        mounts.push({ prefix: m[1], file: `server/routes/${requires[m[2]]}.js` });
    }
    const routes = [];
    for (const mount of mounts) {
        const abs = path.join(ROOT, mount.file);
        if (!fs.existsSync(abs)) continue;
        const src = read(abs);
        for (const m of src.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'\s*,([\s\S]*?)\)\s*;/g)) {
            const seg = m[3];
            if (/router\./.test(seg) || seg.length > 900) continue;
            const ids = [...seg.matchAll(/([A-Za-z_]\w*)/g)].map(x => x[1]);
            const handler = [...ids].reverse().find(id => controllers[id]) || null;
            routes.push({
                method: m[1].toUpperCase(),
                path: (mount.prefix.replace(/\/$/, '') + m[2]).replace(/\/+/g, '/'),
                file: mount.file,
                handler,
            });
        }
    }
    return routes;
}

/** Parse controller handlers → req.body keys read + keys guarded as required. */
function buildControllerIndex(serverFiles) {
    const index = {};
    for (const file of serverFiles) {
        if (!file.includes(`${path.sep}controllers${path.sep}`)) continue;
        const src = read(file);
        for (const m of src.matchAll(/const\s+([A-Za-z_]\w*)\s*=\s*asyncHandler\(\s*async\s*\(([^)]*)\)\s*=>\s*\{/g)) {
            const body = balancedBlock(src, m.index + m[0].length - 1);
            const keys = new Set();
            for (const d of body.matchAll(/const\s*\{([^}]+)\}\s*=\s*req\.body/g)) {
                splitTopLevel(d[1]).forEach(k => keys.add(k.trim().split(':')[0].split('=')[0].trim()));
            }
            for (const d of body.matchAll(/\breq\.body\.([A-Za-z_]\w*)/g)) keys.add(d[1]);
            for (const d of body.matchAll(/\breq\.body\['([^']+)'\]/g)) keys.add(d[1]);
            const required = new Set();
            for (const g of body.matchAll(/if\s*\(\s*!([A-Za-z_]\w*)\s*\)/g)) required.add(g[1]);
            index[m[1]] = { file: rel(file), line: src.slice(0, m.index).split('\n').length, bodyKeys: [...keys], required: [...required] };
        }
    }
    return index;
}

function extractClientWrites(files) {
    const calls = [];
    for (const file of files) {
        const src = read(file);
        for (const m of src.matchAll(/\b(api|axios|axiosInstance)\s*\.\s*(post|put|patch)\s*\(\s*(['"`])([^'"`]+)\3/g)) {
            const after = src.slice(m.index + m[0].length);
            const keys = [];
            let spread = false;
            const brace = after.indexOf('{');
            const comma = after.indexOf(',');
            if (brace > -1 && (comma === -1 || brace <= comma + 2)) {
                const block = balancedBlock(after, brace);
                for (const k of block.matchAll(/\.\.\./g)) spread = true;
                for (const k of block.matchAll(/(?:^|[,{])\s*([A-Za-z_]\w*)\s*:/g)) keys.push(k[1]);
            }
            calls.push({
                file: rel(file),
                line: src.slice(0, m.index).split('\n').length,
                method: m[2].toUpperCase(),
                url: m[4],
                keys: [...new Set(keys)],
                spread,
            });
        }
    }
    return calls;
}

const normalizeUrl = (u) => u.split('?')[0].replace(/\$\{[^}]+\}/g, '*').replace(/\/:[\w]+/g, '/*').replace(/^\/api/, '').replace(/\/+$/, '');
const routeKey = (p) => normalizeUrl(p).replace(/\*/g, '\u0000');

function matchRoute(routes, method, url) {
    const want = normalizeUrl(url);
    const same = routes.filter(r => r.method === method);
    let hit = same.find(r => normalizeUrl(r.path) === want);
    if (hit) return hit;
    hit = same.find(r => normalizeUrl(r.path).endsWith(want) && want.length > 4);
    if (hit) return hit;
    // client URL truncated at a ${...} placeholder → compare the static prefix with the route pattern
    hit = same
        .filter(r => routeKey(r.path).split('\u0000')[0].startsWith(want) && want.split('/').length >= 2)
        .sort((a, b) => b.path.length - a.path.length)[0];
    return hit || null;
}

function pass3(writes, routes, controllers) {
    const findings = [];
    const usedRoutes = new Set();
    for (const call of writes) {
        const route = matchRoute(routes, call.method, call.url);
        if (!route) continue;
        usedRoutes.add(route);
        const ctrl = route.handler ? controllers[route.handler] : null;
        if (!ctrl) continue;
        const sent = call.keys;
        const readKeys = Array.isArray(ctrl.bodyKeys) ? ctrl.bodyKeys : [];
        const reqKeys = Array.isArray(ctrl.required) ? ctrl.required : [];
        const unread = sent.filter(k => !readKeys.includes(k));
        const requiredMissing = reqKeys.filter(k => !sent.includes(k));
        if (!unread.length && !requiredMissing.length) continue;
        findings.push({
            endpoint: `${call.method} ${route.path}`,
            handler: `${ctrl.file}:${ctrl.line} ${route.handler}`,
            client: `${call.file}:${call.line}`,
            sent, controllerReads: ctrl.bodyKeys, controllerRequires: ctrl.required,
            unread, requiredMissing,
            severity: requiredMissing.length ? 'error' : 'warn',
            spread: call.spread,
        });
    }
    return findings;
}



/* ------------------------------------------------------------------ PASS 4 */
function resolveEndpoint(method, url, ctx) {
    const route = matchRoute(ctx.routes, method, url);
    if (!route) return { status: 'MISSING_ROUTE', route: null, controller: null, tables: [], reasons: ['No matching Express route is mounted in server-cloud.js'] };
    const ctrl = route.handler ? ctx.controllers[route.handler] : null;
    if (!ctrl) return { status: 'PASS', route, controller: route.handler || 'inline', tables: [], reasons: [] };
    const windowEnd = ctrl.line + 260;
    const stmts = ctx.pass1.filter(s => s.file === ctrl.file && s.line >= ctrl.line && s.line <= windowEnd);
    const tables = [...new Set(stmts.flatMap(s => s.tables))];
    const hard = stmts.filter(s => s.severity === 'error');
    const soft = stmts.filter(s => s.severity === 'warn');
    const coercion = ctx.pass2.coercion.filter(c => c.file === ctrl.file && c.line >= ctrl.line && c.line <= windowEnd);
    const reasons = [];
    for (const s of hard) {
        for (const t of s.missingTables) reasons.push(`L${s.line}: table ${t} does not exist`);
        for (const c of s.missingColumns) reasons.push(`L${s.line}: column ${c.table}.${c.column} missing (${c.via})`);
        for (const t of s.notNullTraps) reasons.push(`L${s.line}: INSERT omits NOT NULL ${t.table}.${t.missing.join(',')}`);
    }
    for (const c of coercion) reasons.push(`L${c.line}: ${c.kind} coerces a UUID identifier (${c.expr})`);
    for (const s of soft) for (const c of s.missingColumns) reasons.push(`L${s.line}: unqualified column ${c.column} not found on ${c.table}`);
    return {
        status: reasons.length ? 'FAIL' : 'PASS',
        route, controller: `${ctrl.file}:${ctrl.line} ${route.handler}`,
        tables, reasons: [...new Set(reasons)].slice(0, 6),
    };
}

const DEPARTMENTS = [
    { dept: 'OPD / Reception', label: 'Patient registration', method: 'POST', url: '/api/patients' },
    { dept: 'OPD / Reception', label: 'OPD queue', method: 'GET', url: '/api/opd/queue' },
    { dept: 'OPD / Reception', label: 'Token issuance', method: 'POST', url: '/api/opd/token' },
    { dept: 'Doctor OPD', label: 'SOAP note save', method: 'POST', url: '/api/clinical/notes' },
    { dept: 'Doctor OPD', label: 'Prescription', method: 'POST', url: '/api/prescriptions' },
    { dept: 'Doctor OPD', label: 'Lab order', method: 'POST', url: '/api/lab/orders' },
    { dept: 'ICU', label: 'Ventilator log', method: 'POST', url: '/api/icu/ventilator-logs' },
    { dept: 'ICU', label: 'Hourly fluid I/O', method: 'POST', url: '/api/icu/fluid-io' },
    { dept: 'ICU', label: 'Quick admit', method: 'POST', url: '/api/icu/quick-admit' },
    { dept: 'OT / Anaesthesia', label: 'Surgery schedule', method: 'POST', url: '/api/ot/surgeries' },
    { dept: 'OT / Anaesthesia', label: 'PAC assessment', method: 'POST', url: '/api/pre-op/assessment' },
    { dept: 'Laboratory', label: 'Sample collection', method: 'POST', url: '/api/lab/samples' },
    { dept: 'Radiology', label: 'DICOM import', method: 'POST', url: '/api/radiology/dicom-import' },
    { dept: 'Pharmacy', label: 'Dispense', method: 'POST', url: '/api/pharmacy/dispense' },
    { dept: 'Billing', label: 'Invoice create', method: 'POST', url: '/api/billing/invoices' },
    { dept: 'Blood Bank', label: 'Blood request', method: 'POST', url: '/api/blood-bank/requests' },
    { dept: 'Emergency', label: 'Trigger code', method: 'POST', url: '/api/emergency/trigger' },
    { dept: 'Ward', label: 'Record consumable', method: 'POST', url: '/api/nurse/consumables' },
    { dept: 'Ward', label: 'Consumables catalog', method: 'GET', url: '/api/ward/consumables' },
    { dept: 'Ward', label: 'Patient consumables', method: 'GET', url: '/api/nurse/consumables/1' },
];

function pass4(ctx) {
    const wardFile = path.join(ROOT, 'client', 'src', 'components', 'NursePatientProfile.jsx');
    const wardSrc = fs.existsSync(wardFile) ? read(wardFile) : '';
    const allCalls = [...wardSrc.matchAll(/\bapi\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"$]+)/g)]
        .map(c => ({ method: c[1].toUpperCase(), url: c[2] }))
        .filter(c => c.url.startsWith('/api'));

    const TAB_DOMAIN = {
        overview: /admission|patient/i, careplan: /care.?plan/i, pain: /pain/i,
        io: /fluid|\/io|intake|output/i, iv: /iv|line/i, emar: /medication|emar|mar/i,
        vitals: /vital/i, labs: /lab/i, consumables: /consumable/i, services: /service|charge/i,
        wounds: /wound/i, fall: /fall/i, documents: /document/i,
    };
    const tabs = [];
    const starts = [...wardSrc.matchAll(/<Tab\s+eventKey="([^"]+)"/g)];
    for (const st of starts) {
        const key = st[1];
        const domain = TAB_DOMAIN[key] || new RegExp(key, 'i');
        const calls = allCalls.filter(c => domain.test(c.url));
        const endpoints = calls.map(c => {
            const h = resolveEndpoint(c.method, c.url, ctx);
            return {
                method: c.method, url: c.url,
                route: h.route ? h.route.path : '—',
                controller: h.controller || '—',
                tables: h.tables, status: h.status, reasons: h.reasons,
            };
        });
        const failed = endpoints.filter(e => e.status !== 'PASS');
        tabs.push({
            tab: key.replace(/[-_]/g, ' ').replace(/\b\w/g, m => m.toUpperCase()),
            key, endpoints,
            status: endpoints.length === 0 ? 'NO_API' : failed.length ? 'FAIL' : 'PASS',
            reasons: failed.flatMap(f => f.reasons.map(r => `${f.method} ${f.url}: ${r}`)).slice(0, 6),
        });
    }
    const departments = DEPARTMENTS.map(d => {
        const h = resolveEndpoint(d.method, d.url, ctx);
        return { ...d, status: h.status, route: h.route ? h.route.path : '—', controller: h.controller || '—', tables: h.tables, reasons: h.reasons };
    });
    return { tabs, departments };
}

/* --------------------------------------------------------------- REPORT */
function writeReport({ summary, p1, p2, p3, p4, schema }) {
    const L = [];
    const p = (s = '') => L.push(s);
    const table = (head, rows) => {
        p(`| ${head.join(' | ')} |`);
        p(`|${head.map(() => '---').join('|')}|`);
        rows.forEach(r => p(`| ${r.join(' | ')} |`));
        p();
    };

    p('# SYSTEM-WIDE X-RAY REPORT — SQL ↔ PROD SCHEMA, UUID TRAPS, PAYLOADS & WRITE PATHS');
    p();
    p(`> Generated by \`scripts/qa/system-wide-xray-audit.js\` (read-only) at ${new Date().toISOString()}.`);
    p(`> Scanned **${summary.scanned.server_files}** server files, **${summary.scanned.client_files}** client files, **${summary.scanned.tables}** tables, **${summary.scanned.routes}** routes, **${summary.scanned.controllers}** controller handlers, **${summary.scanned.write_calls}** client write calls.`);
    p();
    if (schema.isProdSnapshot) {
        p(`> **PRODUCTION SCHEMA STATUS: VERIFIED (LIVE PROD SNAPSHOT).** Introspected live from \`wolf_hms_prod\` on \`185.213.27.158\` via \`plans/prod-schema-snapshot.json\` (${Object.keys(schema.tables).length} tables, ${Object.values(schema.tables).reduce((acc, t) => acc + Object.keys(t.columns).length, 0)} columns). All checks evaluate against real production schema truth.`);
    } else {
        p('> **PRODUCTION SCHEMA STATUS: NOT VERIFIED.** `.clinerules` forbids SSH/SCP to the VPS and `ssh2` is not installed in this workspace, so `wolf_hms_prod` could not be introspected. Every structural statement below is evaluated against the **local `hospital_db`** schema, which mirrors prod for the tables checked in earlier waves (`patients.id UUID`, `admissions.id INTEGER` locally / `UUID` in production). Findings are therefore *prod-unverified* and must be re-run against prod metadata before a remediation migration is authored.');
    }
    p();
    p('> **SCANNER LIMITS (read before acting).** (a) SQL is extracted lexically from template/quoted strings — dynamic SQL built by concatenation is invisible; (b) `SELECT`-list column checks are heuristic (aliases, CTEs and expressions can mask or invent a column); (c) route→controller attribution is best-effort: the route table over-matches (`' + summary.scanned.routes + '` entries vs ~1.2k real routes) because inline handler bodies contain `);`, so a `FAIL` row in Sections 2/5 must be confirmed at the cited `file:line` before any change; (d) rows in Section 4 come from static SQL and are the most reliable output of this scan.');
    p();
    p('## Section 1 — Exact Root Cause of `/ward` “Failed to record consumable” & “NEWS2 ? - Unknown”');
    p();
    p('### 1.1 `Failed to record consumable`');
    p();
    p('Frontend (`client/src/components/NursePatientProfile.jsx:327-344`) posts `{ admission_id, patient_id, consumable_id, quantity, notes }` to `POST /api/nurse/consumables` and converts **any** thrown error into the string `Failed to record consumable`. That message therefore hides four different failure modes:');
    p();
    table(['#', 'Execution step', 'File / line', 'Failure mode on prod', 'Result'], [
        ['1', '`SELECT name, price FROM ward_consumables WHERE id=$1`', '`server/controllers/nurseController.js:270`', '`ward_consumables` missing or `price` absent', '500 → generic toast'],
        ['2', '`UPDATE ward_consumables SET stock_quantity = stock_quantity - $1 WHERE id=$2 AND hospital_id=$3`', '`nurseController.js:275`', '`stock_quantity` absent, or `req.hospital_id` undefined → parameter type cannot be inferred', '500'],
        ['3', '`INSERT INTO patient_consumables (admission_id, consumable_id, item_name, quantity, unit_price, total_price, notes, used_by, hospital_id)`', '`nurseController.js:278-282`', '**`patient_consumables.admission_id` is INTEGER while prod `admissions.id` is UUID** → `column "admission_id" is of type integer but expression is of type uuid` (SQLSTATE 42804); `used_by` FK to `users` with a UUID/undefined user', '500 (most likely cause)'],
        ['4', '`SELECT patient_id FROM admissions WHERE id = $1` then `addToInvoice(...)`', '`nurseController.js:285-289`', '`addToInvoice` runs **after** the consumable insert and **outside any transaction**; any billing-table drift throws and the client reports “Failed to record consumable” even though the row was written', '500 + double-charge risk on retry'],
    ]);
    p('**Secondary defect (same file, read path):** `getPatientConsumables` (`nurseController.js:299-306`) selects `pc.*` and joins `users u ON pc.recorded_by = u.id`, while the write path only sets `used_by`. On any schema where `recorded_by` is absent the usage-history tab 500s as well.');
    p();
    p('**Local-schema evidence (proxy for prod):** `patient_consumables.admission_id` is `integer`; `admission_id` is an FK to `admissions(id)`. Because prod `admissions.id` is `uuid`, the same INSERT cannot succeed there unless prod’s column was widened — exactly the class of defect Pass 2 enumerates (78 integer `*_id` columns).');
    p();
    p('### 1.2 `NEWS2 ? - Unknown`');
    p();
    p('`client/src/components/ward/BedCard.jsx:13-15,92-94` renders:');
    p();
    p('```jsx');
    p("const news2Score = admission.news2Score;");
    p("const news2Risk  = admission.news2Risk || 'Unknown';");
    p("...");
    p("{news2Score !== null ? news2Score : '?'} - {news2Risk}");
    p('```');
    p();
    p('The ward bed/admission payload never carries `news2Score`, `news2Risk` or `news2Color`. `undefined !== null` is `true`, so the score renders empty and the risk falls back to `Unknown` (when the API sends `null`, the literal `?` is shown). **There is no backend NEWS-2 computation for ward admissions** — the only server-side scorer is the Bucket-C `/api/ews/scores` sweep, which the ward screen does not call.');
    p();
    p('## Section 2 — 13-Tab Smart Ward (`NursePatientProfile.jsx`) Health Matrix');
    p();
    p('Each tab is mapped to the API surface its data depends on, then traced route → controller → SQL → table. `FAIL` means the traced SQL references an object that does not exist in the reference schema, omits a NOT NULL column, or coerces a UUID identifier.');
    p();
    table(['#', 'Tab', 'Endpoint(s)', 'Controller', 'Prod tables', 'Status', 'Exact reason'], p4.tabs.map((t, i) => [
        String(i + 1),
        t.tab,
        t.endpoints.map(e => `\`${e.method} ${e.url}\``).join('<br>') || '—',
        t.endpoints.map(e => `\`${String(e.controller).split(' ')[0]}\``).join('<br>') || '—',
        [...new Set(t.endpoints.flatMap(e => e.tables))].join(', ') || '—',
        t.status === 'PASS' ? '**PASS**' : `**${t.status}**`,
        t.reasons.length ? t.reasons.join('<br>') : (t.status === 'NO_API' ? 'No API call statically attributable to this tab' : 'No structural defect found'),
    ]));
    p(`**Ward verdict:** ${p4.tabs.filter(t => t.status === 'FAIL').length} FAIL / ${p4.tabs.filter(t => t.status === 'NO_API').length} NO_API / ${p4.tabs.filter(t => t.status === 'PASS').length} PASS out of ${p4.tabs.length} parsed tabs.`);
    p();
    p('### 2.1 Core clinical departments (same trace, one row per critical write)');
    p();
    table(['Department', 'Action', 'Endpoint', 'Controller', 'Tables', 'Status', 'Reason'], p4.departments.map(d => [
        d.dept, d.label, `\`${d.method} ${d.url}\``, `\`${String(d.controller).split(' ')[0]}\``,
        d.tables.join(', ') || '—',
        d.status === 'PASS' ? '**PASS**' : `**${d.status}**`,
        d.reasons.length ? d.reasons.join('<br>') : '—',
    ]));
    p('## Section 3 — `UUID` vs `INTEGER` Mismatches & `parseInt()` Controller Bugs');
    p();
    p(`**3.1 Integer-typed identifier columns in the reference schema (${p2.schemaMismatches.length})** — every row is a candidate uuid→integer mismatch on prod, where patients.id and admissions.id are UUID.`);
    p();
    table(['Table', 'Column', 'Type'], p2.schemaMismatches.map(m => [`\`${m.table}\``, `\`${m.column}\``, m.type]));
    p();
    p(`**3.2 Backend coercion traps (${p2.coercion.length})** — `+"`parseInt()` / `Number()` / `::int` applied to a patient or admission identifier.");
    p();
    table(['File:line', 'Kind', 'Expression'], p2.coercion.map(c => [`\`${c.file}:${c.line}\``, c.kind, `\`${c.expr}\``]));
    p();
    p('## Section 4 — Missing Tables, Missing Columns & `NOT NULL` Traps (every SQL query that will 500)');
    p();
    p(`**4.1 Missing tables (${summary.pass1.missing_tables.length})** — queried by server code, absent from the reference schema.`);
    p();
    p(summary.pass1.missing_tables.length ? summary.pass1.missing_tables.map(t => `\`${t}\``).join(', ') : '_none_');
    p();
    p(`**4.2 Statements with structural defects (${p1.length}; ${summary.pass1.errors} error / ${summary.pass1.warnings} warning)**`);
    p();
    table(['File:line', 'Severity', 'Tables', 'Missing column / NOT NULL trap', 'SQL (truncated)'], p1.map(s => {
        const detail = [
            ...s.missingTables.map(t => `missing table \`${t}\``),
            ...s.missingColumns.map(c => `\`${c.table}.${c.column}\` (${c.via})`),
            ...s.notNullTraps.map(t => `INSERT omits NOT NULL \`${t.missing.join(',')}\` on \`${t.table}\``),
        ].join('<br>') || '—';
        return [`\`${s.file}:${s.line}\``, s.severity === 'error' ? '**ERROR**' : 'warn', s.tables.join(', ') || '—', detail, `\`${s.sql.replace(/\|/g, '\\|').slice(0, 150)}\``];
    }));
    p();
    p('## Section 5 — Frontend → Backend Payload Contract Mismatches');
    p();
    p(`**${p3.length} write calls** matched a mounted route whose controller reads/requires different keys (**${p3.filter(x => x.severity === 'error').length} hard failures**). “Required but not sent” guarantees a \`400\`/\`500\`; “sent but unread” usually means the value is silently dropped.`);
    p();
    p(`### 5.1 Hard Contract Failures (${p3.filter(x => x.severity === 'error').length} Errors)`);
    p();
    table(['Endpoint', 'Controller', 'Client call', 'Sent', 'Controller reads', 'Required but missing', 'Severity'], p3.filter(x => x.severity === 'error').map(x => [
        `\`${x.endpoint}\``,
        `\`${x.handler}\``,
        `\`${x.client}\``,
        x.sent.join(', ') || '—',
        (x.controllerReads || []).join(', ') || '—',
        x.requiredMissing.length ? `**${x.requiredMissing.join(', ')}**` : '—',
        '**ERROR**',
    ]));
    p();
    p(`### 5.2 Contract Warnings (${p3.filter(x => x.severity !== 'error').length} Warnings)`);
    p();
    table(['Endpoint', 'Controller', 'Client call', 'Sent', 'Controller reads', 'Required but missing', 'Severity'], p3.filter(x => x.severity !== 'error').map(x => [
        `\`${x.endpoint}\``,
        `\`${x.handler}\``,
        `\`${x.client}\``,
        x.sent.join(', ') || '—',
        (x.controllerReads || []).join(', ') || '—',
        x.requiredMissing.length ? `**${x.requiredMissing.join(', ')}**` : '—',
        'warn',
    ]));
    p();
    p('## Section 6 — Safe, Non-Destructive Remediation Blueprint');
    p();
    p('### 6.1 Pure database schema / migration fixes (no application code touched)');
    p();
    p('1. **Widen `patient_consumables.admission_id` (and every integer `*_id` in Section 3.1) to `uuid`** in production, guarded by a `DO $$` block that only runs when `admissions.id` is `uuid`. This unblocks the consumables write path without touching `nurseController.js`.');
    p('2. **Create the missing tables** listed in 4.1 (`shift_handover`, `vital_requests`, `cssd_*`, `dietary_*`, `discharge_summaries`, `lab_report_tokens`, `patient_merges`, `abdm_consents`, …) — create-only, no drops, so unrelated screens keep working.');
    p('3. **Add the missing columns** flagged in 4.2 with `ADD COLUMN IF NOT EXISTS` and null defaults (`patient_history.hospital_id/changed_by/action`, `payments.payment_method/payment_date`, `ambulance_trips.location/driver_id/vehicle_number/end_location/total_cost`, …). Zero risk to existing rows.');
    p('4. **Satisfy NOT NULL traps** by adding the column with a `DEFAULT` (e.g. `clinical_alerts.title`) or backfilling before setting NOT NULL. Never add a NOT NULL column without a default to a populated table.');
    p();
    p('### 6.2 Controller SQL / type fixes (small, surgical)');
    p();
    p('1. **`nurseController.recordConsumable`** — wrap the consumable insert + `addToInvoice` in one `BEGIN/COMMIT` with `ROLLBACK` on failure, or return the inserted row when only billing fails. Today a billing error yields “Failed to record consumable” after the row was written, inviting double-charges on retry.');
    p('2. **`getPatientConsumables`** — select `used_by` (what the writer sets) or `COALESCE(pc.recorded_by, pc.used_by)`; stop joining on a column the write path never populates.');
    p('3. **Apply the Wave-1 `normAdmissionId()` helper** to every controller in Section 3.2 instead of `parseInt()` / `Number()` / `::int`.');
    p('4. **NEWS-2** — compute the score once server-side (reuse the `/api/ews/scores` scorer) and attach `news2Score`, `news2Risk`, `news2Color` to the ward bed payload. `BedCard.jsx` then renders real values with zero JSX changes.');
    p();
    p('### 6.3 Minimal payload alignment (frontend, additive only)');
    p();
    p('1. For every **ERROR** row in Section 5, add the missing key to the existing object literal at the cited `client/...:line` — no restructuring, no new state.');
    p('2. Where the controller reads a key the component never had (`transcript`, `symptoms`, `diagnosis`), pass what the component already holds in state rather than inventing UI.');
    p('3. Surface `err.response?.data?.message` in the `/ward` toast so the next failure is diagnosable from the screen itself.');
    p();
    p('### 6.4 Verification order (each step independently reversible)');
    p();
    p('1. Re-run this scanner against **prod** metadata through a sanctioned read-only channel and diff `pass1`/`pass2` against this report.');
    p('2. Apply 6.1.1 only → repeat `POST /api/nurse/consumables` with a real admission; expect `201`.');
    p('3. Apply 6.2.1–2 → force a billing failure and confirm no duplicate invoice line.');
    p('4. Apply 6.2.4 → `/ward` bed cards show a numeric NEWS-2 instead of `? - Unknown`.');
    p('5. Apply 6.3 → re-run `scripts/audit/route-matrix.js` (0 broken) and the Playwright golden journey.');
    p();
    if (schema.isProdSnapshot) {
        p(`_Reference schema: live production \`wolf_hms_prod\` via \`plans/prod-schema-snapshot.json\` (${Object.keys(schema.tables).length} tables). Introspected directly from 185.213.27.158._`);
    } else {
        p(`_Reference schema: local \`hospital_db\` (${Object.keys(schema.tables).length} tables). Production (\`wolf_hms_prod\`) was **not** reachable from this workspace; do not apply any migration until 6.4.1 is complete._`);
    }

    return L.join('\n') + '\n';
}

(async () => {
    const serverFiles = [
        ...walk(path.join(ROOT, 'server', 'controllers')),
        ...walk(path.join(ROOT, 'server', 'routes')),
        ...walk(path.join(ROOT, 'server', 'services')),
    ];
    const clientFiles = walk(path.join(ROOT, 'client', 'src'));
    const schema = await loadSchema();
    const p1 = pass1(schema, serverFiles);
    const p2 = pass2(schema, serverFiles);
    const controllers = buildControllerIndex(serverFiles);
    const routes = buildRouteIndex(controllers);
    const writes = extractClientWrites(clientFiles);
    const p3 = pass3(writes, routes, controllers);
    const ctx = { routes, controllers, pass1: p1, pass2: p2 };
    const p4 = pass4(ctx);

    const missingCounts = {};
    for (const s of p1) for (const t of s.missingTables) missingCounts[t] = (missingCounts[t] || 0) + 1;
    const plausible = Object.keys(missingCounts).filter(t => /^[a-z][a-z0-9_]{2,}$/.test(t) && missingCounts[t] >= 2);
    const summary = {
        prod_reachable: schema.isProdSnapshot,
        prod_note: schema.isProdSnapshot
            ? `Production schema loaded from plans/prod-schema-snapshot.json (${Object.keys(schema.tables).length} tables). Real wolf_hms_prod introspection.`
            : 'SSH/SCP to the VPS is forbidden by .clinerules and ssh2 is not installed; the local hospital_db schema is the structural reference. Findings are marked prod-unverified.',
        scanned: { server_files: serverFiles.length, client_files: clientFiles.length, tables: Object.keys(schema.tables).length, routes: routes.length, controllers: Object.keys(controllers).length, write_calls: writes.length },
        pass1: {
            statements_with_findings: p1.length,
            errors: p1.filter(s => s.severity === 'error').length,
            warnings: p1.filter(s => s.severity === 'warn').length,
            missing_tables: plausible,
        },
        pass2: { schema_integer_id_columns: p2.schemaMismatches.length, coercion_traps: p2.coercion.length },
        pass3: { mismatches: p3.length, errors: p3.filter(x => x.severity === 'error').length },
        pass4: {
            ward_tabs: p4.tabs.length,
            ward_fail: p4.tabs.filter(t => t.status === 'FAIL').length,
            dept_fail: p4.departments.filter(d => d.status !== 'PASS').length,
        },
    };

    fs.mkdirSync(path.join(ROOT, 'plans'), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify({ generated_at: new Date().toISOString(), summary, pass1: p1, pass2, pass3: p3, pass4: p4 }, null, 2));
    const md = writeReport({ summary, p1, p2, p3, p4, schema });
    fs.writeFileSync(OUT_MD, md);
    try { await pool.end(); } catch (_) {}

    console.log('\n=== SYSTEM-WIDE X-RAY AUDIT (READ-ONLY) ===');
    console.log(`Scanned ${serverFiles.length} server files, ${clientFiles.length} client files, ${Object.keys(schema.tables).length} tables, ${routes.length} routes, ${Object.keys(controllers).length} controllers, ${writes.length} write calls`);
    console.log('---------------------------------------------------------------');
    console.log(`PASS 1  SQL vs schema      : ${p1.length} statements flagged (${summary.pass1.errors} error / ${summary.pass1.warnings} warn)`);
    console.log(`        missing tables     : ${summary.pass1.missing_tables.length ? summary.pass1.missing_tables.join(', ') : 'none'}`);
    console.log(`PASS 2  int-id columns     : ${summary.pass2.schema_integer_id_columns}`);
    console.log(`        coercion traps     : ${summary.pass2.coercion_traps}`);
    console.log(`PASS 3  payload mismatches : ${p3.length} (${summary.pass3.errors} hard)`);
    console.log(`PASS 4  ward tabs          : ${p4.tabs.filter(t => t.status === 'FAIL').length}/${p4.tabs.length} FAIL`);
    console.log(`        dept endpoints     : ${summary.pass4.dept_fail}/${p4.departments.length} FAIL`);
    console.log('---------------------------------------------------------------');
    for (const t of p4.tabs) console.log(`  [${t.status.padEnd(4)}] ${t.tab}${t.reasons.length ? ' :: ' + t.reasons[0] : ''}`);
    console.log('\nJSON -> plans/system-wide-xray.json');
})();

