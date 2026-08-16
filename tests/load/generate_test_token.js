/**
 * ═══════════════════════════════════════════════════════════════════
 * WOLF HMS — Red Team Load Test Token Generator
 * ═══════════════════════════════════════════════════════════════════
 *
 * Forges a cryptographically valid JWT signed with the system's
 * JWT_SECRET that will survive the full middleware pipeline:
 *   tenantResolver → authenticateToken → authorize(roles)
 *
 * The token never expires (no `exp` claim) so it can be baked
 * directly into the Artillery YAML without rotation logic.
 *
 * Usage:
 *   node tests/load/generate_test_token.js
 *
 * Output:
 *   Prints the raw Bearer token to stdout and writes it to
 *   tests/load/.test_token for Artillery to consume.
 * ═══════════════════════════════════════════════════════════════════
 */

const path = require('path');
const fs = require('fs');

// Load the server's .env so we get the real JWT_SECRET
require('dotenv').config({ path: path.resolve(__dirname, '../../server/.env') });

const jwt = require(path.resolve(__dirname, '../../server/node_modules/jsonwebtoken'));

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET is not defined. Cannot forge a valid token.');
    process.exit(1);
}

// ── Payload ──────────────────────────────────────────────────────
// Mimics a real admin user with doctor privileges so we can hit
// every protected endpoint including role-gated dental procedures.
const payload = {
    id: 1,                     // user.id — used as recorded_by / performed_by
    userId: 1,                 // legacy alias some controllers still check
    username: 'loadtest_admin',
    email: 'loadtest@wolf-hms.dev',
    role: 'admin',             // passes authorize('admin', 'dentist', ...)
    hospital_id: 1,            // numeric — matches tenantResolver parseInt()
    hospitalId: 1,             // legacy alias
    is_active: true,
};

// ── Sign with NO expiry ──────────────────────────────────────────
// Using the EXACT same algorithm the server uses (HS256 default)
const token = jwt.sign(payload, JWT_SECRET);
// No { expiresIn } → the token never expires

// ── Output ───────────────────────────────────────────────────────
const outputPath = path.resolve(__dirname, '.test_token');
fs.writeFileSync(outputPath, token, 'utf-8');

console.log('═══════════════════════════════════════════════════════');
console.log('  WOLF HMS — Red Team Token Forge');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('  JWT_SECRET source:  server/.env');
console.log('  Algorithm:          HS256 (default)');
console.log('  Expiry:             NONE (immortal)');
console.log('  Role:               admin');
console.log('  Hospital ID:        1');
console.log('  User ID:            1');
console.log('');
console.log('  Token written to:   tests/load/.test_token');
console.log('');
console.log('  ─── RAW TOKEN (paste into YAML) ───');
console.log('');
console.log(`  Bearer ${token}`);
console.log('');
console.log('═══════════════════════════════════════════════════════');
