/**
 * PRE-DEMO QA — PostgreSQL client binary resolver
 *
 * pg_dump/pg_restore must be >= the server major version, so this prefers the
 * newest installed PostgreSQL client, falling back to the workspace portable
 * copy and finally PATH.
 */
const fs = require('fs');
const path = require('path');

const EXE = (tool) => (process.platform === 'win32' ? `${tool}.exe` : tool);

function resolvePostgresBin(tool) {
    const base = tool.replace(/\.exe$/i, '');
    const exe = EXE(base);
    const candidates = [];

    if (process.env.PG_BIN) candidates.push(path.join(process.env.PG_BIN, exe));

    // Newest installed PostgreSQL (Program Files\PostgreSQL\<major>\bin)
    for (const root of [
        process.env.PGBIN_ROOT,
        path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'PostgreSQL'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'PostgreSQL'),
    ]) {
        if (!root || !fs.existsSync(root)) continue;
        let majors = [];
        try {
            majors = fs.readdirSync(root).filter(d => /^\d+$/.test(d)).map(Number).sort((a, b) => b - a);
        } catch (_) { /* ignore */ }
        for (const m of majors) candidates.push(path.join(root, String(m), 'bin', exe));
    }

    // Workspace portable PostgreSQL (pgsql/bin)
    candidates.push(path.join(__dirname, '..', '..', '..', 'pgsql', 'bin', exe));
    candidates.push(exe); // PATH

    for (const c of candidates) {
        if (c === exe) return c;
        if (fs.existsSync(c)) return c;
    }
    throw new Error(`Could not locate ${tool}. Set PG_BIN or add PostgreSQL bin to PATH.`);
}

module.exports = { resolvePostgresBin };
