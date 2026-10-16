#!/usr/bin/env node
/**
 * STEP 3 — Sanitize fabricated patient data (Tables B, C, D).
 *
 * Instead of deleting lines (which breaks multi-line rows), this codemod finds every
 * array literal that is ASSIGNED or SET — `const x = [ … ]`, `useState([ … ])`,
 * `setX([ … ])`, `res.data || [ … ]` — and, only when its interior contains fabricated
 * patient identifiers/names, collapses the interior to nothing (an honest empty array).
 *
 * A string/comment-aware scanner keeps bracket matching correct.
 *
 * Usage: node scripts/qa/sanitize-mock-fallbacks.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const AUDIT = path.join(ROOT, 'plans', 'mock-audit.json');
const LOG = path.join(ROOT, 'plans', 'mock-sanitize.log');
const DRY = process.argv.includes('--dry-run');

const FAKE = /(\bP-\d{3,4}\b|\bMRN-\d{3,5}\b|\bTRF-\d+\b|\bCON-\d+\b|\bCLM-\d+\b|\bCDI-\d+\b|\bSS-\d+\b|\bINV-\d{3,4}\b|\bEM-\d{4}-\d+\b|Ramesh Gupta|Anita Desai|Priya Sharma|Rajesh Kumar|Suresh Patel|Meena Sharma|Anil Mehta|Priya Singh|Suresh Menon|Mohammed Ali|Vikram Iyer|Sunita Devi|Ramesh Kumar|Suresh Yadav|Ajay Sharma|Nurse Anita|Nurse Kavita|Nurse Priya|Nurse Meera|Dr\. Sharma|Dr\. Patel|Dr\. Reddy|Baby Arun)/g;

const read = (p) => fs.readFileSync(p, 'utf8');

/** Find the matching ']' for the '[' at `open`, skipping strings, templates and comments. */
function matchBracket(src, open) {
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        const c = src[i];
        const next = src[i + 1];
        if (c === '/' && next === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
        if (c === '/' && next === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
        if (c === "'" || c === '"' || c === '`') {
            const q = c; i++;
            while (i < src.length) {
                if (src[i] === '\\') { i += 2; continue; }
                if (src[i] === q) break;
                i++;
            }
            continue;
        }
        if (c === '[') depth++;
        else if (c === ']') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

/** Array-literal openers whose contents represent data rows. */
const OPENER = /(?:=\s*|\buseState\(\s*|\bset[A-Za-z0-9_]+\(\s*|\|\|\s*|\?\?\s*|\(\s*)\[/g;

function sanitize(text) {
    let out = text;
    let edits = 0;
    let guard = 0;
    for (;;) {
        if (++guard > 500) break;
        OPENER.lastIndex = 0;
        let target = null;
        let m;
        while ((m = OPENER.exec(out)) !== null) {
            const open = m.index + m[0].length - 1;
            const close = matchBracket(out, open);
            if (close < 0) continue;
            const interior = out.slice(open + 1, close);
            if (interior.trim() === '') continue;
            FAKE.lastIndex = 0;
            if (FAKE.test(interior)) { target = { open, close }; break; }
        }
        if (!target) break;
        out = out.slice(0, target.open + 1) + out.slice(target.close);
        edits++;
    }
    return { text: out, edits };
}

function main() {
    const audit = JSON.parse(read(AUDIT));
    const targets = audit.records.filter(r => r.kinds.length > 0).map(r => r.file);
    const log = [`# Mock-data sanitization ${new Date().toISOString()}`, `Targets: ${targets.length}${DRY ? ' (DRY RUN)' : ''}`, ''];

    let filesChanged = 0, totalEdits = 0;
    for (const relPath of targets) {
        const abs = path.join(ROOT, relPath);
        if (!fs.existsSync(abs)) continue;
        const original = read(abs);
        if (!FAKE.test(original)) { FAKE.lastIndex = 0; continue; }
        FAKE.lastIndex = 0;
        const { text, edits } = sanitize(original);
        if (edits > 0 && text !== original) {
            if (!DRY) fs.writeFileSync(abs, text, 'utf8');
            filesChanged++; totalEdits += edits;
            log.push(`SANITIZED ${relPath} :: ${edits} fabricated array(s) emptied`);
        }
    }

    log.push('', `Files sanitized: ${filesChanged}  arrays emptied: ${totalEdits}`);
    fs.writeFileSync(LOG, log.join('\n'), 'utf8');
    console.log('='.repeat(72));
    console.log(`MOCK-DATA SANITIZE ${DRY ? '(dry run)' : ''}`);
    console.log('='.repeat(72));
    console.log(`Targets        : ${targets.length}`);
    console.log(`Files sanitized: ${filesChanged}`);
    console.log(`Arrays emptied : ${totalEdits}`);
    console.log(`Log            : ${path.relative(ROOT, LOG)}`);
}

main();
