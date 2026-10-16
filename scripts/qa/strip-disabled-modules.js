#!/usr/bin/env node
/**
 * STEP 1 — Strip "Module not enabled" UI guards from the 12 Bucket C screens.
 *
 * The 20 Bucket C endpoints are live (bucketCActivationRoutes.js + migration 311), so the
 * neutral badges, info banners and disabled buttons are no longer truthful.
 *
 * Removes (comment-safe, regex-driven, dry-run first):
 *   * <Badge ...>Module not enabled</Badge>
 *   * <Alert ...>… not enabled …</Alert>  banners
 *   * title="Module not enabled…" and the `disabled` prop attached to those buttons
 *
 * Usage: node scripts/qa/strip-disabled-modules.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const AUDIT = path.join(ROOT, 'plans', 'mock-audit.json');
const LOG = path.join(ROOT, 'plans', 'bucket-c-badge-strip.log');
const DRY = process.argv.includes('--dry-run');

const read = (p) => fs.readFileSync(p, 'utf8');

const RULES = [
    // <Badge ...>Module not enabled</Badge>  (inline or on its own line)
    { name: 'badge', re: /[ \t]*<Badge[^>]*>\s*Module not enabled\s*<\/Badge>\s*\n?/g, to: '' },
    // info banner: <Alert ...> … not enabled … </Alert>
    { name: 'alert', re: /[ \t]*<Alert[^>]*>[\s\S]{0,400}?not enabled[\s\S]{0,400}?<\/Alert>\s*\n?/g, to: '' },
    // disabled + title guards
    { name: 'disabled-title', re: /\s+disabled\s+title="Module not enabled[^"]*"/g, to: '' },
    { name: 'title', re: /\s+title="Module not enabled[^"]*"/g, to: '' },
    // standalone JSX comment left behind is harmless; collapse >3 blank lines
    { name: 'blank-lines', re: /\n{4,}/g, to: '\n\n\n' },
];

function main() {
    if (!fs.existsSync(AUDIT)) throw new Error('Missing plans/mock-audit.json — run the audit scanner first');
    const audit = JSON.parse(read(AUDIT));
    const targets = audit.records.filter(r => r.kinds.includes('BUCKET_C')).map(r => r.file);

    const log = [`# Bucket C badge strip ${new Date().toISOString()}`, `Targets: ${targets.length}${DRY ? ' (DRY RUN)' : ''}`, ''];
    let changed = 0, totalRules = 0;

    for (const relPath of targets) {
        const abs = path.join(ROOT, relPath);
        if (!fs.existsSync(abs)) { log.push(`SKIP missing ${relPath}`); continue; }
        const original = read(abs);
        let text = original;
        const hits = [];
        for (const rule of RULES) {
            const before = text;
            text = text.replace(rule.re, rule.to);
            if (text !== before) hits.push(rule.name);
        }
        if (text !== original) {
            if (!DRY) fs.writeFileSync(abs, text, 'utf8');
            changed++; totalRules += hits.length;
            log.push(`CHANGED ${relPath} :: ${hits.join(', ')}`);
        } else {
            log.push(`clean   ${relPath}`);
        }
    }

    log.push('', `Files changed: ${changed}/${targets.length}  rule hits: ${totalRules}`);
    fs.writeFileSync(LOG, log.join('\n'), 'utf8');
    console.log('='.repeat(72));
    console.log(`BUCKET C BADGE STRIP ${DRY ? '(dry run)' : ''}`);
    console.log('='.repeat(72));
    console.log(`Targets       : ${targets.length}`);
    console.log(`Files changed : ${changed}`);
    console.log(`Rule hits     : ${totalRules}`);
    console.log(`Log           : ${path.relative(ROOT, LOG)}`);
}

main();
