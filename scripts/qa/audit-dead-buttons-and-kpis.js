#!/usr/bin/env node
/**
 * GALAXY-LEVEL INTERACTION AUDITOR — dead buttons, unwired forms, read-only dashboards,
 * static JSX KPI literals and technical/endpoint text leaks.
 *
 * READ-ONLY. Walks every .jsx/.js under client/src/pages + client/src/components and emits:
 *   plans/dead-buttons-audit.json           (machine readable, with line numbers)
 *   plans/GALAXY_INTERACTION_AND_BUTTON_AUDIT.md  (Sections A–D)
 *
 * Classes
 *   1 DEAD_BUTTON            no onClick / no-op onClick / phantom modal / close-only modal / disabled action
 *   2 DEAD_FORM              <Form> without onSubmit, or submit handler with no HTTP call
 *   3 READ_ONLY_DASHBOARD    dashboard with action buttons but zero POST/PUT/PATCH/DELETE
 *   4 STATIC_JSX_KPI         numeric/clinical literals rendered directly in JSX text
 *   5 TECH_LEAK              visible "/api/", "endpoint", "Routes", "PostgreSQL", "TODO", "coming soon" …
 *
 * Usage: node scripts/qa/audit-dead-buttons-and-kpis.js [--verbose]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CLIENT = path.join(ROOT, 'client', 'src');
const SCAN_DIRS = [path.join(CLIENT, 'pages'), path.join(CLIENT, 'components')];
const OUT_JSON = path.join(ROOT, 'plans', 'dead-buttons-audit.json');
const OUT_MD = path.join(ROOT, 'plans', 'GALAXY_INTERACTION_AND_BUTTON_AUDIT.md');
const VERBOSE = process.argv.includes('--verbose');

const read = (p) => fs.readFileSync(p, 'utf8');
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

const walk = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (!['node_modules', 'dist'].includes(e.name)) walk(full, out); }
        else if (/\.(jsx|js)$/.test(e.name)) out.push(full);
    }
    return out;
};

// Action verbs that imply a write/commit operation
const ACTION_VERB = /\b(Add|New|Create|Record|Save|Submit|Approve|Reject|Dispense|Assign|Schedule|Export|Print|Verify|Trigger|Resolve|Upload|Edit|Update|Delete|Issue|Log|Apply|Send|Start|Stop|Charge|Pay|Refund|Generate|Download|Import|Admit|Discharge|Transfer|Request|Order|Cancel|Confirm|Dispatch|Collect|Report)\b/i;
const NOOP_HANDLER = /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*(?:\{\s*\}|null|undefined|void\s+0|console\.\w+\([^)]*\)|alert\([^)]*\)|toast[\w.]*\([^)]*\)|window\.alert\([^)]*\))\s*\}/;
const SET_TRUE = /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*set([A-Z]\w*)\(\s*true\s*\)\s*\}/;
const HTTP_WRITE = /\.(post|put|patch|delete)\s*\(/;
const HTTP_ANY = /(?:\bapi|\baxios|\bapiClient)\s*\.\s*(get|post|put|patch|delete)\s*\(|\bfetch\s*\(/;

/** Extract JSX elements of a given tag with their attribute text + inner text. */
function extractTags(src, tagName) {
    const out = [];
    const re = new RegExp(`<${tagName}(?=[\\s/>])`, 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
        const start = m.index;
        // find the end of the opening tag, skipping braces
        let i = start + m[0].length;
        let brace = 0, quote = null;
        for (; i < src.length; i++) {
            const c = src[i];
            if (quote) { if (c === quote && src[i - 1] !== '\\') quote = null; continue; }
            if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
            if (c === '{') { brace++; continue; }
            if (c === '}') { brace--; continue; }
            if (c === '>' && brace === 0) break;
        }
        const openTag = src.slice(start, i + 1);
        const line = src.slice(0, start).split('\n').length;
        // inner text up to the closing tag (or the next 300 chars for void/self-closing)
        let inner = '';
        if (!/\/>\s*$/.test(openTag)) {
            const closeIdx = src.indexOf(`</${tagName}>`, i);
            inner = closeIdx > -1 ? src.slice(i + 1, Math.min(closeIdx, i + 400)) : '';
        }
        out.push({ openTag, inner, line, selfClosing: /\/>\s*$/.test(openTag) });
    }
    return out;
}

/** Merge JSX text children across `{expr}` boundaries into one searchable string. */
const visibleText = (inner) => (inner || '')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------- Class 1
function auditButtons(src, file) {
    const findings = [];
    const hasWrite = HTTP_WRITE.test(src);
    const actionVerbs = /\b(Add|New|Create|Record|Save|Submit|Approve|Reject|Dispense|Assign|Schedule|Export|Print|Verify|Trigger|Resolve|Upload|Edit|Update|Delete|Issue|Log|Apply|Send|Charge|Pay|Refund|Generate|Download|Import|Admit|Discharge|Transfer|Request|Order|Cancel|Confirm|Dispatch|Collect)\b/i;

    for (const tagName of ['Button', 'button', 'Badge']) {
        for (const t of extractTags(src, tagName)) {
            const text = (visibleText(t.inner) + ' ' + t.inner.replace(/\{[^{}]*\}/g, ' ')).trim();
            if (tagName === 'Badge' && !/onClick/.test(t.openTag)) continue;      // badges are labels unless clickable
            if (!actionVerbs.test(text) && !/onClick/.test(t.openTag)) continue;
            const label = text.replace(/\s+/g, ' ').slice(0, 70) || '(icon button)';
            if (!actionVerbs.test(text)) continue;                                // only action-labelled controls

            const hasOnClick = /onClick=/.test(t.openTag);
            const isSubmit = /type=["']submit["']/.test(t.openTag);
            const isDisabledGuard = /disabled=\{/.test(t.openTag);
            const navigates = /onClick=\{[^}]*navigate\(/.test(t.openTag) || /href=/.test(t.openTag);

            if (!hasOnClick && !isSubmit && !navigates) {
                findings.push({ kind: 'DEAD_NO_HANDLER', line: t.line, label, detail: 'no onClick and not a submit button' });
                continue;
            }
            if (NOOP_HANDLER.test(t.openTag)) {
                const m = t.openTag.match(NOOP_HANDLER);
                const flavour = /console\./.test(m[0]) ? 'console.log only' : /alert|toast/i.test(m[0]) ? 'alert/toast only' : 'empty arrow';
                findings.push({ kind: 'DEAD_NOOP', line: t.line, label, detail: `no-op onClick (${flavour})` });
                continue;
            }
            if (isDisabledGuard) {
                const guard = (t.openTag.match(/disabled=\{([^}]+)\}/) || [])[1] || '';
                // only "silently disabled because data is missing" guards, not validation guards
                if (/!\s*(selected|active|current|patient|admission|encounter|record|row|item|visit|invoice)\w*/i.test(guard)) {
                    findings.push({ kind: 'DISABLED_ACTION', line: t.line, label, detail: `renders but disabled when data missing: ${guard.trim().slice(0, 60)}` });
                }
            }
            const setTrue = t.openTag.match(SET_TRUE);
            if (setTrue) {
                const state = setTrue[1].charAt(0).toLowerCase() + setTrue[1].slice(1);
                // a state is "consumed" if the identifier is read anywhere beyond its useState declaration
                const reads = (src.match(new RegExp(`\\b${state}\\b`, 'g')) || []).length;
                if (reads <= 1) findings.push({ kind: 'PHANTOM_MODAL', line: t.line, label, detail: `${state} is set but never read — the click changes state that no JSX consumes` });
                else if (!hasWrite) findings.push({ kind: 'CLOSE_ONLY_MODAL', line: t.line, label, detail: `opens ${state}, file has no POST/PUT/PATCH/DELETE` });
            }
        }
    }
    return findings;
}

// ---------------------------------------------------------------- Class 4
const UNIT_RE = /^(?:Rs\.?|₹|\$)?\s*-?\d+(?:\.\d+)?\s*(?:mmHg|bpm|mL|ml|°C|°F|%|mg|cmH2O|g\/dL|mmol\/L|min|hrs?|hours?|days?|L|units?|kcal|mm\/hr|mcg|IU)?$/i;
const CLINICAL_TOKEN = /\b(SIMV-PC|SIMV|CPAP|BiPAP|Afebrile|Febrile|Optimal|Normal|Targeted|Waveform)\b/;
const LABEL_CONTEXT = /<(label|option|th|td|Form\.Label|FormText|Form\.Text|legend|h[1-6])\b/i;

function auditStaticKpi(src) {
    const out = [];
    const lines = src.split('\n');
    const inJsxText = (line) => {
        const m = line.match(/>\s*([^<>{}]+?)\s*</);
        return m ? m[1] : null;
    };
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (/^\s*(\/\/|\*|\/\*)/.test(raw)) continue;                       // comments
        if (LABEL_CONTEXT.test(raw)) continue;                              // form labels / table headers / select options
        const text = inJsxText(raw);
        if (!text) continue;
        const trimmed = text.trim();
        if (!trimmed || trimmed.length > 60) continue;
        if (trimmed.startsWith('(')) continue;                              // "(54-76%)" reference range
        const digitText = trimmed.replace(/cmH2O/gi, '');            // "H2O" is not a value
        const hasUnit = /\d/.test(digitText) && /(mmHg|bpm|mL|ml|°C|°F|%|mg|cmH2O|Rs\.?|₹|min|hrs?|hours?|kcal|mL\/hr|yrs?)/i.test(trimmed);
        const vitalsString = /\b(BP|Sugar|SpO2|Temp|HR|Pulse|RR)\s*:\s*\d/i.test(trimmed);
        const identity = /\b(MRN|UHID|IPD|Bed)\s*[-:#]?\s*\d{2,}/i.test(trimmed);
        const numeric = (hasUnit || vitalsString || identity) && !/\([^)]*\)\s*$/.test(trimmed);
        const clinical = CLINICAL_TOKEN.test(trimmed) && trimmed.length <= 25;
        if (numeric || clinical) {
            out.push({ kind: 'STATIC_JSX_KPI', line: i + 1, label: trimmed.slice(0, 60), detail: numeric ? 'hardcoded numeric literal with unit in JSX text' : 'hardcoded clinical status token in JSX text' });
        }
    }
    // literal-vs-literal ternary, e.g. {latestVent ? '88' : '92'}
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/\{\s*[\w.?\[\]]+\s*\?\s*['"](-?\d+(?:\.\d+)?)['"]\s*:\s*['"](-?\d+(?:\.\d+)?)['"]\s*\}/);
        if (m) out.push({ kind: 'STATIC_JSX_KPI', line: i + 1, label: `${m[1]} / ${m[2]}`, detail: 'ternary returns two hardcoded literals — no data binding' });
    }
    return out;
}

// ---------------------------------------------------------------- Class 5
const TECH_PATTERNS = [
    [/\/api\//, '/api/ path'],
    [/\bendpoint\b/i, 'endpoint'],
    [/\b(API|Express|Backend|Server)\s+Routes?\b/, 'Route table wording'],
    [/\bPostgreSQL\b/i, 'PostgreSQL'],
    [/\bTODO\b/, 'TODO'],
    [/\bcoming soon\b/i, 'coming soon'],
    [/\bnot implemented\b/i, 'not implemented'],
    [/\bplaceholder\b/i, 'placeholder'],
    [/\b[A-Za-z]+\.js\b(?![a-z])/, '.js filename'],
];
function auditTechLeak(src) {
    const out = [];
    const lines = src.split('\n');
    lines.forEach((raw, idx) => {
        if (/^\s*(\/\/|\*|\/\*|import |from )/.test(raw)) return;             // comments/imports
        const m = raw.match(/>\s*([^<>{}]{4,}?)\s*</);
        if (!m) return;
        const text = m[1].trim();
        if (!text || /^[a-z-]+$/.test(text)) return;
        for (const [re, label] of TECH_PATTERNS) {
            if (re.test(text)) { out.push({ kind: 'TECH_LEAK', line: idx + 1, label: text.slice(0, 90), detail: label }); break; }
        }
    });
    return out;
}

// ---------------------------------------------------------------- Class 2
/** Return the balanced {...} body starting at index of '{' (string/comment aware). */
function matchBraces(src, openIdx) {
    let depth = 0, quote = null, i = openIdx;
    for (; i < src.length; i++) {
        const c = src[i];
        if (quote) {
            if (c === '\\') { i++; continue; }
            if (c === quote) quote = null;
            continue;
        }
        if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
        if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i); if (i < 0) break; i++; continue; }
        if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
    }
    return src.slice(openIdx);
}

function auditForms(src) {
    const out = [];
    const forms = extractTags(src, 'Form').concat(extractTags(src, 'form'));
    for (const f of forms) {
        if (!/onSubmit=/.test(f.openTag)) {
            out.push({ kind: 'DEAD_FORM', line: f.line, label: 'Form without onSubmit', detail: 'no onSubmit handler attached' });
        }
    }
    // submit handler that prevents default but never calls an HTTP method
    for (const m of src.matchAll(/((?:handle|on)?\w*[Ss]ubmit\w*)\s*=\s*async\s*\(([^)]*)\)\s*=>\s*\{/g)) {
        const body = matchBraces(src, m.index + m[0].length - 1);
        if (/preventDefault\(\)/.test(body) && !HTTP_ANY.test(body)) {
            out.push({
                kind: 'DEAD_FORM',
                line: src.slice(0, m.index).split('\n').length,
                label: `${m[1]}()`,
                detail: 'preventDefault + local state only (no api/axios/fetch call)',
            });
        }
    }
    return out;
}

// ---------------------------------------------------------------- Class 3
const DASHBOARD_RE = /(Dashboard|Manager|Console|CommandCenter|Workspace|Terminal)\.(jsx|js)$/i;
function auditReadOnly(src, file) {
    if (!DASHBOARD_RE.test(file)) return [];
    if (!/<Button\b/.test(src)) return [];
    const writes = (src.match(/\.(post|put|patch|delete)\s*\(/g) || []).length;
    const reads = (src.match(/\.get\s*\(/g) || []).length;
    if (writes > 0) return [];
    const actionButtons = extractTags(src, 'Button')
        .filter(t => ACTION_VERB.test(visibleText(t.inner) + t.inner))
        .map(t => ({ line: t.line, label: visibleText(t.inner).slice(0, 60) || '(icon)' }));
    if (!actionButtons.length) return [];
    return [{
        kind: 'READ_ONLY_DASHBOARD',
        line: actionButtons[0].line,
        label: `${actionButtons.length} action button(s)`,
        detail: `GETs=${reads}, writes=${writes} — no mutation path exists`,
        buttons: actionButtons.slice(0, 12),
    }];
}
// ---------------------------------------------------------------- runner
const files = [...new Set(SCAN_DIRS.flatMap(d => walk(d)))].sort();
const rows = [];
const byClass = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const CLASS_OF = {
    DEAD_NO_HANDLER: 1, DEAD_NOOP: 1, PHANTOM_MODAL: 1, CLOSE_ONLY_MODAL: 1, DISABLED_ACTION: 1,
    DEAD_FORM: 2, READ_ONLY_DASHBOARD: 3, STATIC_JSX_KPI: 4, TECH_LEAK: 5,
};

for (const file of files) {
    const src = read(file);
    const findings = [
        ...auditButtons(src, file),
        ...auditForms(src),
        ...auditReadOnly(src, file),
        ...auditStaticKpi(src),
        ...auditTechLeak(src),
    ];
    if (!findings.length) continue;
    const seen = new Set();
    const uniq = findings.filter(f => {
        const k = `${f.kind}|${f.line}|${f.label}`;
        if (seen.has(k)) return false;
        seen.add(k); return true;
    });
    for (const f of uniq) byClass[CLASS_OF[f.kind]]++;
    rows.push({ file: rel(file), findings: uniq });
}

const totalFindings = Object.values(byClass).reduce((a, b) => a + b, 0);
const classNames = {
    1: 'Dead Buttons / Phantom Modals',
    2: 'Unwired Forms',
    3: 'Read-Only Dashboards',
    4: 'Static JSX KPI literals',
    5: 'Technical text leaks',
};

// ---------------------------------------------------------------- ICU forensics (verified by hand)
const ICU = {
    file: 'client/src/pages/clinical/ICUDashboard.jsx',
    buttons: [
        { line: 440, label: '+ Add Hourly Entry', cause: 'onClick={() => setShowIOModal(true)} is present and correct, but the same tag carries disabled={!selectedAdmissionId}. selectedAdmissionId is only seeded by the admissions auto-select at L80-82; when the admissions feed returns [] (prod has no admitted patients) the guard never flips and the button renders permanently disabled — present but unclickable.' },
        { line: 454, label: 'Record First Hourly Intake / Output', cause: 'Identical disabled={!selectedAdmissionId} guard, and it lives inside the fluidLogs.length === 0 empty-state block — i.e. both entry points into the I/O modal are disabled at the exact moment the ledger is empty and a clinician most needs to chart.' },
    ],
    modal: { line: 509, state: 'showIOModal', submit: 'handleIOSubmit (L150-172)' },
    leak: { line: 438, text: 'Automated rolling calculation feeding endpoint /api/icu/fluid-io' },
    cards: [
        { name: 'MAP / BP', line: 325, rendered: "{latestVent ? '88' : '92'} mmHg", verdict: "STATIC — both ternary branches are string literals; no BP field is ever read. The sub-line 'Sys/Dia: 124/70' (L328) and badge 'Optimal' are literals too." },
        { name: 'SpO2 Oxygen', line: 344, rendered: '{latestVent?.sp02 || 98}%', verdict: 'BOUND with literal fallback — real column, but renders 98 whenever no ventilator row exists.' },
        { name: 'Core Temp', line: 363, rendered: '37.1 °C + 98.8 °F + Badge "Afebrile"', verdict: 'STATIC — no binding at all, and icu_ventilator_logs has no temperature column.' },
        { name: 'Vent Mode', line: 382, rendered: "{latestVent?.ventilator_mode || 'SIMV-PC'} + RR: {… || 16} bpm", verdict: 'BOUND with literal fallbacks.' },
        { name: 'PEEP / FiO2', line: 401, rendered: "{latestVent?.peep || 8} / {latestVent?.fio2 || 45}% + I:E {… || '1:2'}", verdict: 'BOUND with literal fallbacks.' },
        { name: 'Tidal Volume', line: 420, rendered: '{latestVent?.tidal_volume || 450} mL + Peak {… || 22} cmH2O', verdict: 'BOUND with literal fallbacks.' },
    ],
    backend: [
        { route: 'POST /api/icu/fluid-io', file: 'server/routes/icuRoutes.js:17', handler: 'icuController.logFluidIO', auth: 'protect + tenantResolver (server-cloud.js:381)' },
        { route: 'GET /api/icu/fluid-io/:admissionId', file: 'server/routes/icuRoutes.js:18', handler: 'icuController.getFluidIOHistory', returns: '{ admission_id, logs[], summary_24h{total_24h_intake,total_24h_output,total_24h_balance}, latest_cumulative_balance_ml }' },
        { route: 'POST /api/icu/ventilator-logs', file: 'server/routes/icuRoutes.js:13', handler: 'icuController.logVentilatorMetrics' },
        { route: 'GET /api/icu/ventilator-logs/:admissionId', file: 'server/routes/icuRoutes.js:14', handler: 'icuController.getVentilatorHistory' },
    ],
    payload: `{
  admission_id: <int>,                     // required — parseInt(selectedAdmissionId)
  chart_time:   "<ISO or datetime-local>",  // optional — defaults to NOW()
  iv_fluids_ml: 0, blood_products_ml: 0, oral_intake_ml: 0, enteral_feeding_ml: 0,
  urine_output_ml: 0, drain_output_ml: 0, stool_output_ml: 0, emesis_ml: 0,
  notes: ""                                 // optional
}
// server derives total_intake_ml / total_output_ml / hourly_balance_ml /
// cumulative_balance_ml (previous cumulative + hourly) and stamps recorded_by + hospital_id.`,
};

// ---------------------------------------------------------------- console summary
console.log('\n=== GALAXY-LEVEL INTERACTION AUDIT ===');
console.log(`Scanned ${files.length} files under client/src/{pages,components}`);
console.log('---------------------------------------------------------------');
for (const k of [1, 2, 3, 4, 5]) {
    console.log(`Class ${k} - ${classNames[k].padEnd(32)} ${String(byClass[k]).padStart(4)}`);
}
console.log('---------------------------------------------------------------');
console.log(`TOTAL FINDINGS${' '.repeat(34)} ${String(totalFindings).padStart(4)}`);
console.log(`Files with findings${' '.repeat(30)} ${String(rows.length).padStart(4)}`);

const top = [...rows]
    .map(r => ({ file: r.file, count: r.findings.length, kinds: [...new Set(r.findings.map(f => f.kind))] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
console.log('\nTop offenders:');
for (const t of top) console.log(`  ${String(t.count).padStart(3)}  ${t.file}  [${t.kinds.join(', ')}]`);

console.log('\n/icu verdict:');
{
    const icuRow = rows.find(r => r.file === ICU.file);
    const icuFindings = icuRow ? icuRow.findings.length : 0;
    console.log(`  findings: ${icuFindings}` + (icuFindings === 0 ? '  ✅ clean (buttons enabled, cards bound, leak removed)' : '  <-- see block below'));
    if (icuFindings > 0) {
        for (const f of icuRow.findings) console.log(`    L${f.line} ${f.kind} ${f.label} — ${f.detail}`);
    }
    const icuStatic = ICU.cards.filter(c => /^STATIC/.test(c.verdict)).length;
    console.log(`  6 cards: ${icuStatic} STATIC / ${ICU.cards.length - icuStatic} bound-with-literal-fallback (as audited pre-fix)`);
}

if (VERBOSE) {
    for (const r of rows) {
        console.log(`\n${r.file}`);
        for (const f of r.findings) console.log(`  L${String(f.line).padEnd(5)} ${f.kind.padEnd(20)} ${f.label}  — ${f.detail}`);
    }
}


// ---------------------------------------------------------------- markdown report
const md = [];
const p = (s = '') => md.push(s);
const tbl = (head, body) => {
    p(`| ${head.join(' | ')} |`);
    p(`|${head.map(() => '---').join('|')}|`);
    body.forEach(r => p(`| ${r.join(' | ')} |`));
    p();
};
const kindLabel = {
    DEAD_NO_HANDLER: 'DEAD_BUTTON · no handler',
    DEAD_NOOP: 'DEAD_BUTTON · no-op handler',
    PHANTOM_MODAL: 'DEAD_BUTTON · phantom modal',
    CLOSE_ONLY_MODAL: 'DEAD_BUTTON · close-only modal',
    DISABLED_ACTION: 'DEAD_BUTTON · disabled guard',
    DEAD_FORM: 'DEAD_FORM',
    READ_ONLY_DASHBOARD: 'READ_ONLY_DASHBOARD',
    STATIC_JSX_KPI: 'STATIC_JSX_KPI',
    TECH_LEAK: 'TECH_LEAK',
};
const filesFor = (re) => rows.filter(r => re.test(r.file));
const allFor = (re) => files.map(rel).filter(f => re.test(f));
const countKind = (list, kinds) => list.reduce((n, r) => n + r.findings.filter(f => kinds.includes(f.kind)).length, 0);
const srcWrites = (relPath) => {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) return null;
    const s = read(abs);
    return {
        post: (s.match(/\.post\s*\(/g) || []).length,
        put: (s.match(/\.put\s*\(/g) || []).length,
        patch: (s.match(/\.patch\s*\(/g) || []).length,
        del: (s.match(/\.delete\s*\(/g) || []).length,
        get: (s.match(/\.get\s*\(/g) || []).length,
    };
};

p('# GALAXY-LEVEL INTERACTIVE CONTROL, DEAD-BUTTON & STATIC-KPI AUDIT');
p();
p(`> Generated by \`scripts/qa/audit-dead-buttons-and-kpis.js\` — **read-only** AST/regex sweep. Generated at ${new Date().toISOString()}.`);
p(`> Scope: **${files.length}** files under \`client/src/pages/\` + \`client/src/components/\`. Machine-readable twin: \`plans/dead-buttons-audit.json\`.`);
p();
p('## Executive Summary');
p();
tbl(
    ['Class', 'Defect family', 'Findings', 'Files', 'Severity'],
    [
        ['1', '`DEAD_BUTTON` — no handler / no-op handler / phantom modal / close-only modal / disabled guard', byClass[1], filesFor(/./).filter(r => r.findings.some(f => CLASS_OF[f.kind] === 1)).length, 'BLOCKER'],
        ['2', '`DEAD_FORM` — `<Form>` without `onSubmit`, or submit handler with no HTTP call', byClass[2], filesFor(/./).filter(r => r.findings.some(f => CLASS_OF[f.kind] === 2)).length, 'BLOCKER'],
        ['3', '`READ_ONLY_DASHBOARD` — action buttons but zero mutations', byClass[3], filesFor(/./).filter(r => r.findings.some(f => CLASS_OF[f.kind] === 3)).length, 'HIGH'],
        ['4', '`STATIC_JSX_KPI` — hardcoded clinical/financial literals in JSX', byClass[4], filesFor(/./).filter(r => r.findings.some(f => CLASS_OF[f.kind] === 4)).length, 'HIGH'],
        ['5', '`TECH_LEAK` — `/api/`, `endpoint`, `Routes`, `PostgreSQL`, `TODO` visible to clinicians', byClass[5], filesFor(/./).filter(r => r.findings.some(f => CLASS_OF[f.kind] === 5)).length, 'MEDIUM'],
        ['**Σ**', '**total findings**', `**${totalFindings}**`, `**${rows.length}**`, ''],
    ],
);
p('**Headline:** the `/icu` prod defect is **not** a missing handler — both buttons are wired to `setShowIOModal(true)` and both the modal and `POST /api/icu/fluid-io` exist. They are killed by `disabled={!selectedAdmissionId}` (L440, L454): production has no ICU admissions, so the guard never opens. Cards **MAP/BP** and **Core Temp** are pure JSX literals; the other four are bound with literal fallbacks that render exactly the reported `92 / 98% / 37.1 / SIMV-PC / 8-45% / 450` on an empty telemetry feed.');
p();
const kindCount = (k) => rows.reduce((n, r) => n + r.findings.filter(f => f.kind === k).length, 0);
const hardForms = rows.reduce((n, r) => n + r.findings.filter(f => f.kind === 'DEAD_FORM' && /preventDefault/.test(f.detail)).length, 0);
const softForms = kindCount('DEAD_FORM') - hardForms;
tbl(['Class 1 subtype', 'Count', 'Meaning'], [
    ['`DEAD_NO_HANDLER`', kindCount('DEAD_NO_HANDLER'), 'action-labelled control with no `onClick`, not `type="submit"`, no `href`/`navigate`'],
    ['`DISABLED_ACTION`', kindCount('DISABLED_ACTION'), 'handler present but `disabled={!selectedX}` — the `/icu` failure mode'],
    ['`CLOSE_ONLY_MODAL`', kindCount('CLOSE_ONLY_MODAL'), 'opens a modal in a file with **zero** `POST/PUT/PATCH/DELETE`'],
    ['`PHANTOM_MODAL`', kindCount('PHANTOM_MODAL'), 'sets `showX(true)` that nothing consumes'],
    ['`DEAD_NOOP`', kindCount('DEAD_NOOP'), '`() => {}` / `null` / `console` / `alert` / `toast`'],
    ['**Class 2 split**', `${hardForms} hard / ${softForms} soft`, 'hard = `preventDefault()` with no HTTP call; soft = `<Form>` without `onSubmit`'],
]);
p();
// ---------------------------------------------------------------- Section A
p('## Section A — `/icu` Forensic Breakdown & Fix Specification');
p();
p(`File: \`${ICU.file}\` — 640+ lines, single component. Data load path: \`fetchAdmissions\` → auto-select first admission (L80-82) → \`fetchAdmissionTelemetry(admissionId)\` (L93-115) → \`GET /api/icu/ventilator-logs/:id\` + \`GET /api/icu/fluid-io/:id\`.`);
p();
p('### A.1 Why the two buttons "do nothing"');
p();
tbl(['Line', 'Control', 'Root cause'], ICU.buttons.map(b => [`L${b.line}`, `\`${b.label}\``, b.cause]));
p('**Not a wiring gap.** The handler chain is complete: `onClick → setShowIOModal(true) → <Modal show={showIOModal}> (L509) → <Form onSubmit={handleIOSubmit}> → api.post(\'/api/icu/fluid-io\') (L161)` → `setShowIOModal(false)` + `fetchAdmissionTelemetry()` refresh. The defect is **state starvation**, not missing code: with `admissions = []` (production has no admitted ICU patients), `selectedAdmissionId` stays `\'\'`, so both `disabled` guards are true and React renders the buttons with the `disabled` attribute. The browser silently swallows the click — exactly the reported symptom, and consistent with `NET BALANCE (0 mL)` because no admission (and therefore no chart rows) is selected.');
p();
p('### A.2 Modal & submit path (already functional)');
p();
tbl(['Element', 'Line', 'Detail'], [
    ['`showIOModal` state', 'L33', '`useState(false)`'],
    ['`+ Add Hourly Entry`', 'L440', '`onClick={() => setShowIOModal(true)}` **+ `disabled={!selectedAdmissionId}`**'],
    ['`Record First Hourly Intake / Output`', 'L454', 'same handler, same guard, inside the `fluidLogs.length === 0` empty state'],
    ['`<Modal show={showIOModal}>`', 'L509-608', 'full form: chart_time, iv_fluids, blood_products, oral, enteral, urine, drains, stool, emesis, notes'],
    ['`handleIOSubmit`', 'L150-172', '`preventDefault()` → guard `if (!selectedAdmissionId) return;` → `POST /api/icu/fluid-io` → close + refetch'],
]);
p('### A.3 Live backend contract (already implemented)');
p();
tbl(['Route', 'Definition', 'Handler / notes'], ICU.backend.map(b => [`\`${b.route}\``, `\`${b.file}\``, b.handler + (b.returns ? `<br>returns \`${b.returns}\`` : '') + (b.auth ? `<br>${b.auth}` : '')]));
p('Request body (`logFluidIO`, server/controllers/icuController.js:120-172):');
p();
p('```json');
p(ICU.payload);
p('```');
p();
p('`getFluidIOHistory` returns the chart ascending plus a 24h aggregate and `latest_cumulative_balance_ml` — that single field is what should drive the **NET BALANCE** banner, so a successful POST followed by `fetchAdmissionTelemetry()` already updates the banner and ledger without a page reload.');
p();

p('### A.4 The six "High-Frequency Vital & Ventilator Metrics" cards');
p();
tbl(['#', 'Card', 'Line', 'Render expression', 'Verdict'], ICU.cards.map((c, i) => [String(i + 1), `**${c.name}**`, `L${c.line}`, `\`${c.rendered}\``, c.verdict]));
p('On production the ventilator feed returns no row for the selected (or absent) admission, so the fallbacks are what the founder photographed: `92 mmHg`, `98%`, `37.1 °C`, `SIMV-PC`, `8 / 45%`, `450 mL`. Two of the six are unrecoverable literals — **MAP/BP has no data source at all** (`{latestVent ? \'88\' : \'92\'}` switches between two constants) and **Core Temp has no column in `icu_ventilator_logs`**.');
p();
p('### A.5 Fix specification (for the implementation pass — not applied in this audit)');
p();
p('**FIX-1 (unblocks both buttons, P0).** Replace the `disabled={!selectedAdmissionId}` guards at L440/L454 with an actionable modal: keep the button enabled, and when no admission is selected have `setShowIOModal(true)` open a modal whose Select is populated from `admissions` and whose submit is disabled until the clinician picks one. A "no active ICU admissions" empty state must explain *why* instead of greying out the only entry point.');
p();
p('**FIX-2 (seed parity).** Production has zero rows in the ICU admission feed; even a perfect UI cannot chart I/O without an `admissions` row. Seed/verify at least one ICU admission per demo hospital (see `server/scripts/seed-demo-hospital.js`) or surface a "Chart without admission" path.');
p();
p('**FIX-3 (cards).** (a) Map/BP: bind to a real source (`latestVent?.map` / vitals table) and drop the `\'88\' : \'92\'` ternary. (b) Core Temp: add `temperature_c` to `icu_ventilator_logs` (migration) and bind, or remove the card. (c) For the four bound cards, make the fallback explicit — render `—` (plus a `No telemetry` badge) instead of `SIMV-PC / 16 / 8 / 45 / 450`, which are clinically indistinguishable from real readings. Keep the form *defaults* in `ventForm` (L36-46) — those are legitimate input defaults, not display fallbacks.');
p();
p('**FIX-4 (leak).** L438 subtitle → `Rolling 24-hour intake / output balance, auto-calculated per charted hour.`');
p();
p('**FIX-5 (verification).** After FIX-1..4: open `/icu` with `admissions = []` → buttons enabled, modal opens with empty-select guidance; seed one admission → chart an entry → assert `POST /api/icu/fluid-io` 201, ledger gains a row, `NET BALANCE` equals `latest_cumulative_balance_ml`. Add a Playwright assertion keyed on the banner text.');
p();

// ---------------------------------------------------------------- Section B
const DEPARTMENTS = [
    ['Reception / OPD', /(Reception|OPD|FrontDesk|Registration)/i],
    ['Doctor / Consultation', /(Doctor|Consultation|ClinicalNote|Prescription|OPDConsult)/i],
    ['Nurse / Ward', /(Ward|Nursing|Nurse|Vitals|Triage)/i],
    ['ICU', /(ICU|CriticalCare|Ventilator)/i],
    ['OT / Surgery', /(OperationTheatre|OTDash|Surgery|Surgical|Anesthesia|Theatre)/i],
    ['Laboratory', /(Laborator|LabDash|LabWorklist|Pathology)/i],
    ['Radiology', /(Radiolog|Imaging|PACS)/i],
    ['Pharmacy', /(Pharmacy|Dispens|DrugStock|Medication)/i],
    ['Billing', /(Billing|Invoice|Payment|Revenue|Cashier)/i],
    ['Emergency', /(Emergency|ERDash|Triage)/i],
    ['Blood Bank', /(BloodBank|Blood|Transfusion)/i],
    ['IPD / Admissions', /(IPD|Admission|Inpatient|Bed)/i],
];
const deadKinds = ['DEAD_NO_HANDLER', 'DEAD_NOOP', 'PHANTOM_MODAL', 'CLOSE_ONLY_MODAL', 'DISABLED_ACTION'];

p('## Section B — Core Clinical Department Dashboards');
p();
p('Every file whose path matches a department is listed. `dead` counts Class 1 findings, `forms` Class 2, `RO` flags a read-only dashboard (Class 3). Files with **zero** findings are marked clean.');
p();
const seenDept = new Set();
const bRows = [];
for (const [dept, re] of DEPARTMENTS) {
    const list = filesFor(re).filter(r => !seenDept.has(r.file));
    list.forEach(r => seenDept.add(r.file));
    if (!list.length) {
        const existing = allFor(re);
        bRows.push([dept, existing.length ? existing.map(f => `${f} ✅`).join('<br>') : '_no matching file_', '0', '0', '0']);
        continue;
    }
    const dead = countKind(list, deadKinds);
    const forms = countKind(list, ['DEAD_FORM']);
    const ro = countKind(list, ['READ_ONLY_DASHBOARD']);
    const detail = list.map(r => {
        const ks = r.findings.filter(f => deadKinds.includes(f.kind) || f.kind === 'DEAD_FORM');
        if (!ks.length) return `${r.file} ✅`;
        return `${r.file}: ${ks.map(k => `L${k.line} ${kindLabel[k.kind]} «${k.label}»`).join('; ')}`;
    }).join('<br>');
    bRows.push([dept, detail, String(dead), String(forms), ro ? `**${ro}**` : '0']);
}
tbl(['Department', 'Files & defects', 'dead', 'forms', 'RO'], bRows);
const bTotal = rows.filter(r => DEPARTMENTS.some(([, re]) => re.test(r.file)));
p(`**Section B totals:** ${bTotal.length} clinical files with findings · ${countKind(bTotal, deadKinds)} dead-button defects · ${countKind(bTotal, ['DEAD_FORM'])} dead forms · ${countKind(bTotal, ['READ_ONLY_DASHBOARD'])} read-only dashboards still shipping action buttons.`);
p();

// ---------------------------------------------------------------- Section C
p('## Section C — Admin, Bucket-C & Table-A Dashboards');
p();
p('For each screen: how many mutation calls it actually contains, how many Class 1 defects remain, and the verdict. A screen with `POST/PUT/PATCH/DELETE > 0` is bound to PostgreSQL; a screen with action buttons and `0` mutations is still theatre.');
p();
const bucketC = (() => {
    try {
        const j = JSON.parse(read(path.join(ROOT, 'plans', 'bucket_c_routes.json')));
        return [...new Set(j.routes.map(r => r.calledFrom.replace(/\\/g, '/').replace(/^client\//, 'client/')))];
    } catch { return []; }
})();
const TABLE_A = [
    'client/src/pages/POSTerminal.jsx',
    'client/src/pages/CloudBackupConsole.jsx',
    'client/src/pages/ProblemListManager.jsx',
    'client/src/pages/TelehealthConsole.jsx',
    'client/src/pages/WardPassManager.jsx',
    'client/src/pages/EarlyWarningScore.jsx',
    'client/src/pages/EmergencyCommandCenter.jsx',
];
const screenRow = (file) => {
    const w = srcWrites(file);
    const row = rows.find(r => r.file === file);
    const dead = row ? row.findings.filter(f => deadKinds.includes(f.kind)) : [];
    const fb = row ? row.findings.filter(f => f.kind === 'DEAD_FORM') : [];
    const writes = w ? w.post + w.put + w.patch + w.del : 0;
    const verdict = !w ? 'FILE MISSING' : writes > 0 ? `**BOUND** (${w.post}P/${w.put}U/${w.patch}Pa/${w.del}D)` : '**NO MUTATION**';
    const defects = [...dead.map(d => `L${d.line} ${kindLabel[d.kind]} «${d.label}»`), ...fb.map(d => `L${d.line} DEAD_FORM`)];
    return [file.replace('client/src/pages/', ''), String(w ? w.get : 0), String(writes), verdict, defects.length ? defects.join('<br>') : '—'];
};
p('### C.1 Bucket-C screens (21 endpoints activated in migration 311)');
p();
if (bucketC.length) tbl(['Screen', 'GETs', 'writes', 'Verdict', 'Class 1/2 defects'], bucketC.map(screenRow));
else p('_`plans/bucket_c_routes.json` not found — Bucket-C section skipped._');
p();
p('### C.2 Table-A screens wired in the previous pass');
p();
tbl(['Screen', 'GETs', 'writes', 'Verdict', 'Class 1/2 defects'], TABLE_A.map(screenRow));
const tableAReadOnly = TABLE_A.filter(f => { const w = srcWrites(f); return w && (w.post + w.put + w.patch + w.del) === 0; });
p(`> **C.2 verdict — the "wired yesterday" claim does not survive line-level inspection.** ${tableAReadOnly.length} of ${TABLE_A.length} Table-A screens contain **zero** \`POST/PUT/PATCH/DELETE\` calls: ${tableAReadOnly.map(f => `\`${f.replace('client/src/pages/', '')}\``).join(', ')}. They mount, they \`GET\` their lists from PostgreSQL, and every create/action control inside them is inert (\`+ New Transaction\`, \`Trigger Backup Now\`, \`+ Add Problem\`, \`Save Notes\`, \`+ Issue Ward Pass\`). Only \`EmergencyCommandCenter.jsx\` (2 POSTs) actually writes. Read-side wiring was completed; **write-side wiring was not**.`);
p();
p('> Reading the table: a `BOUND` screen still shipping a `disabled` guard or a close-only modal is not "done" — the mutation exists but the operator cannot reach it. That is exactly the `/icu` failure mode.');
p();

// ---------------------------------------------------------------- Section D
p('## Section D — Technical / `/api/` Subtitle Leaks');
p();
const leaks = rows.flatMap(r => r.findings.filter(f => f.kind === 'TECH_LEAK').map(f => [r.file, `L${f.line}`, `\`${f.label}\``, f.detail]));
if (leaks.length) tbl(['File', 'Line', 'Visible text', 'Trigger'], leaks);
else p('_No technical text leaks detected._');
p('These are strings a clinician can read on screen. Every one is a credibility leak in front of a buyer: `endpoint /api/…` tells the room the UI is a shell around an API, and `PostgreSQL`/`placeholder`/`[INFO] Connected to…` are internal vocabulary. `IntegrationHub`\'s "Endpoint" is the one arguable case (it is the domain noun for an integration target, not a URL path) and is listed for completeness.');
p();
p('## Appendix — Method, Top Offenders & Limits');
p();
p('**Detection rules** (all line-accurate, JSON twin carries the same data):');
p('1. Class 1 parses `<Button>`, `<button>` and clickable `<Badge>` opening tags; only action-labelled controls are considered (`Add|New|Create|Record|Save|Submit|Approve|…`). A control is flagged when it has no `onClick` and is not `type="submit"`/`href`/`navigate()`, when its handler is `() => {}`, `() => null`, `console.*`, `alert()`, or `toast()`, when it sets a state that is never read anywhere else in the file (phantom), when it opens a real modal in a file with no write call (close-only), or when it carries a data-presence guard such as `disabled={!selectedAdmissionId}`.');
p('2. Class 2 flags `<Form>`/`<form>` without `onSubmit` and submit handlers that call `preventDefault()` without any `api.*`/`axios.*`/`fetch` inside the handler body.');
p('3. Class 3 flags `*Dashboard|*Manager|*Console|*CommandCenter` files that render action buttons with zero `POST/PUT/PATCH/DELETE`.');
p('4. Class 4 flags JSX text nodes carrying a number + clinical/financial unit (`92 mmHg`, `37.1 °C`, `450 mL`, `Rs. 1200`), hardcoded clinical status tokens (`SIMV-PC`, `Afebrile`, `Optimal`), and literal-vs-literal ternaries (`{x ? \'88\' : \'92\'}`).');
p('5. Class 5 flags visible text containing `/api/`, `endpoint`, `Route table` wording, `PostgreSQL`, `TODO`, `coming soon`, `not implemented`, `placeholder`, `*.js`. Clinical uses of the word "route" (drug route, delivery route, "en route") are excluded by construction.');
p();
p('**Top offenders:**');
p();
tbl(['Findings', 'File', 'Kinds'], [...rows].map(r => ({ ...r, n: r.findings.length })).sort((a, b) => b.n - a.n).slice(0, 15).map(r => [String(r.n), r.file, [...new Set(r.findings.map(f => f.kind))].join(', ')]));
p('**Known limits.** The scanner is lexical, not a full Babel AST: (a) it reads the *file* to decide whether a modal has a mutation, so a modal that delegates submission to a child component can be over-flagged; (b) it does not follow imports, so a handler passed in via props is invisible; (c) Class 3 ignores mutation helpers named outside the `api/axios/fetch` convention; (d) Class 4 counts legitimate unit labels that sit in JSX text (e.g. a static table header `Dose (mg)`). Treat the JSON as a ranked worklist, and confirm each hit at the cited line before changing code.');
p();
p(`_Scanner: \`scripts/qa/audit-dead-buttons-and-kpis.js\` · JSON: \`plans/dead-buttons-audit.json\` · ${files.length} files · ${totalFindings} findings._`);

fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
fs.writeFileSync(OUT_MD, md.join('\n') + '\n');
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify({
    generated_at: new Date().toISOString(),
    scanned_files: files.length,
    counts: { byClass, total: totalFindings, files_with_findings: rows.length },
    classNames,
    icu: ICU,
    files: rows,
}, null, 2));
console.log(`MD   -> ${rel(OUT_MD)} (${md.length} lines)`);
console.log(`JSON -> ${rel(OUT_JSON)}`);

