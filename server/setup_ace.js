/**
 * Setup Ace Hospital - Phase 5 (fix sequence + insert)
 */

const bcrypt = require('bcrypt');
const API_BASE = 'http://lkqdx6ai507h02it8nd5veyj.217.216.78.81.sslip.io';
const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';

async function sql(query) {
    const r = await fetch(`${API_BASE}/api/sync/sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: SYNC_SECRET, sql: query })
    });
    return r.json();
}

async function main() {
    try {
        // Fix the sequence first
        console.log('🔧 Fixing hospitals sequence...');
        await sql("SELECT setval('hospitals_id_seq', (SELECT COALESCE(MAX(id), 0) FROM hospitals) + 1, false)");

        // Also fix users sequence
        console.log('🔧 Fixing users sequence...');
        await sql("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users) + 1, false)");

        // Insert hospital
        console.log('🏥 Creating Ace Hospital...');
        const h = await sql("INSERT INTO hospitals (code, name, subdomain) VALUES ('ace', 'Ace Hospital', 'ace') RETURNING id, code, name, subdomain");
        console.log('Hospital:', JSON.stringify(h, null, 2));

        if (!h.success) {
            // Maybe it already exists? Check
            const existing = await sql("SELECT id, code, name, subdomain FROM hospitals WHERE code = 'ace'");
            if (existing.rows?.length > 0) {
                console.log('Hospital already exists:', existing.rows[0]);
            } else {
                console.error('❌ Failed:', h.message);
                return;
            }
        }

        const hid = h.rows?.[0]?.id || (await sql("SELECT id FROM hospitals WHERE code = 'ace'")).rows?.[0]?.id;
        console.log('Hospital ID:', hid);

        // Create admin user
        console.log('🔐 Hashing password...');
        const pw = await bcrypt.hash('password123', 10);

        console.log('👤 Creating admin user...');
        const u = await sql(`INSERT INTO users (username, email, password, role, hospital_id, full_name, department) VALUES ('ace_admin', 'ace@wolfhms.in', '${pw}', 'admin', ${hid}, 'Ace Admin', 'Administration') RETURNING id, username, email, hospital_id`);
        console.log('User:', JSON.stringify(u, null, 2));

        // Verify
        const vh = await sql("SELECT id, code, name, subdomain FROM hospitals WHERE code = 'ace'");
        const vu = await sql("SELECT id, username, email, role, hospital_id FROM users WHERE username = 'ace_admin'");

        console.log('\n━━━ RESULT ━━━');
        console.log('Hospital:', vh.rows);
        console.log('User:', vu.rows);
        console.log('Login: ace_admin / password123 at ace.wolfhms.in');

    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
