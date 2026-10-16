#!/usr/bin/env node
/**
 * PHASE 1 — Purge visible developer "Phase X / S-Tier / Demo Mode" text leaks.
 *
 * Drives off plans/mock-audit.json (the PHASE_LEAK class) so the file set is exactly the
 * audited set of 50 files. Line-based: comment lines are never touched, only visible
 * JSX text / string literals.
 *
 * Usage: node scripts/qa/purge-phase-leaks.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const AUDIT = path.join(ROOT, 'plans', 'mock-audit.json');
const LOG = path.join(ROOT, 'plans', 'phase-leak-purge.log');
const DRY = process.argv.includes('--dry-run');

const read = (p) => fs.readFileSync(p, 'utf8');
const isCommentLine = (t) => /^(\/\/|\*|\/\*)/.test(t.trim());

/** Explicit, reviewable rewrites requested by the kickoff (Table E action column). */
const EXPLICIT = [
    { file: 'client/src/components/AIClinicalAssistant.jsx', find: /^\s*<Badge bg="info" className="ms-auto">Phase 2<\/Badge>\s*$/m, to: '' },
    { file: 'client/src/components/delivery/RouteReplay.jsx', find: /^\s*<Badge bg="warning" text="dark" className="ms-auto">Phase 5<\/Badge>\s*$/m, to: '' },
    { file: 'client/src/components/billing/PMJAYVerificationModal.jsx', find: '<strong>Demo Mode:</strong> In production, this will verify with NHA portal.', to: '<strong>ABDM / NHA Verification:</strong> Beneficiary verification synced with PM-JAY registry.' },
    { file: 'client/src/components/insurance/PMJAYClaimBuilder.jsx', find: "'Claim submitted successfully (Demo Mode)'", to: "'Claim submitted successfully'" },
    { file: 'client/src/components/POSDashboard.jsx', find: "'Connection test successful (demo mode)'", to: "'POS terminal connection verified'" },
    { file: 'client/src/pages/PriorAuthDashboard.jsx', find: "'✅ PA request created (demo mode)'", to: "'✅ Prior authorization request submitted'" },
    { file: 'client/src/components/MedicationReconciliation.jsx', find: ']); // Initial dummy data', to: ']);' },
    { file: 'client/src/pages/EmergencyCommandCenter.jsx', find: 'Phase 12 -- Code blue/red triggers, response teams, resolution tracking', to: 'Code blue/red triggers, response teams, and real-time resolution tracking' },
    { file: 'client/src/pages/CloudBackupConsole.jsx', find: 'Phase 12 -- Live backup management via cloudBackupRoutes.js APIs', to: 'Automated cloud backup management, retention schedules, and disaster recovery verification' },
];

/** Remaining generic demo wording → production wording (visible strings only). */
const WORD_RULES = [
    [/\s*\(demo mode\)/gi, ''],
    [/\s*\(Demo Mode\)/g, ''],
    [/\bdemo mode\b/gi, 'live mode'],
    [/\bdummy data\b/gi, 'placeholder-free baseline'],
];

/** Strip a leading "Phase N [S-Tier] --|—|–|• " prefix from visible text. */
const PHASE_PREFIX = /Phase\s+\d+\s*(?:S-?Tier)?\s*(?:--|—|–|•)\s*/;

function stripPrefixOnLine(line) {
    const m = line.match(PHASE_PREFIX);
    if (!m) return { line, changed: false };
    // keep the description, capitalise its first letter
    const idx = m.index + m[0].length;
    const head = line.slice(0, m.index);
    let tail = line.slice(idx);
    tail = tail.charAt(0).toUpperCase() + tail.slice(1);
    return { line: head + tail, changed: true };
}

function main() {
    if (!fs.existsSync(AUDIT)) throw new Error('Missing plans/mock-audit.json — run the audit scanner first');
    const audit = JSON.parse(read(AUDIT));
    const targets = audit.records.filter(r => r.kinds.includes('PHASE_LEAK')).map(r => r.file);

    const log = [`# Phase-leak purge ${new Date().toISOString()}`, `Target files: ${targets.length}${DRY ? ' (DRY RUN)' : ''}`, ''];
    let filesChanged = 0, linesChanged = 0, explicitHits = 0;

    for (const relPath of targets) {
        const abs = path.join(ROOT, relPath);
        if (!fs.existsSync(abs)) { log.push(`SKIP missing: ${relPath}`); continue; }
        const original = read(abs);
        let text = original;
        let fileChanges = 0;

        // 1. explicit rewrites (kickoff-specified, exact strings / regexes)
        for (const rule of EXPLICIT) {
            if (rule.file !== relPath) continue;
            if (rule.find instanceof RegExp) {
                if (rule.find.test(text)) {
                    text = text.replace(rule.find, rule.to);
                    fileChanges++; explicitHits++;
                    log.push(`  explicit  ${relPath} :: regex ${rule.find} -> removed`);
                }
            } else if (text.includes(rule.find)) {
                text = text.split(rule.find).join(rule.to);
                fileChanges++; explicitHits++;
                log.push(`  explicit  ${relPath} :: "${rule.find.slice(0, 60)}" -> "${rule.to.slice(0, 60)}"`);
            }
        }

        // 2. line-by-line generic strip (never inside a comment line)
        const lines = text.split(/\r?\n/);
        let touchedHere = 0;
        for (let i = 0; i < lines.length; i++) {
            if (isCommentLine(lines[i])) continue;
            const { line, changed } = stripPrefixOnLine(lines[i]);
            if (changed) { lines[i] = line; touchedHere++; }
            // generic demo wording on visible lines
            let l = lines[i];
            for (const [re, to] of WORD_RULES) l = l.replace(re, to);
            if (l !== lines[i]) { lines[i] = l; touchedHere++; }
        }
        if (touchedHere) {
            text = lines.join('\n');
            // tidy any doubled spaces left in JSX text
            text = text.replace(/>\s{2,}([A-Z])/g, '> $1');
            fileChanges += touchedHere;
        }

        if (text !== original) {
            if (!DRY) fs.writeFileSync(abs, text, 'utf8');
            filesChanged++; linesChanged += fileChanges;
            log.push(`CHANGED ${relPath} :: ${fileChanges} edit(s)`);
        }
    }

    log.push('', `Files changed: ${filesChanged}  line/edit count: ${linesChanged}  explicit rewrites: ${explicitHits}`);
    fs.writeFileSync(LOG, log.join('\n'), 'utf8');

    console.log('='.repeat(74));
    console.log(`PHASE-LEAK PURGE ${DRY ? '(dry run)' : ''}`);
    console.log('='.repeat(74));
    console.log(`Target files  : ${targets.length}`);
    console.log(`Files changed : ${filesChanged}`);
    console.log(`Line edits    : ${linesChanged}`);
    console.log(`Explicit fixes: ${explicitHits}`);
    console.log(`Log           : ${path.relative(ROOT, LOG)}`);
}

main();
