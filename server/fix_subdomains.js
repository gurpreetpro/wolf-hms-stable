// Fix hospital subdomain values to simple format (just the subdomain, not full domain)
require('dotenv').config();
const { pool } = require('./db');

async function fix() {
    console.log('=== FIXING HOSPITAL SUBDOMAINS ===\n');
    
    const fixes = [
        { id: 1, subdomain: 'kokila', name: 'Kokila Hospital' },
        { id: 2, subdomain: 'taneja', name: 'Taneja Hospital' },
        { id: 3, subdomain: 'drparveen', name: 'Dr. Parveen Hospital' }
    ];

    try {
        for (const h of fixes) {
            await pool.query('UPDATE hospitals SET subdomain = $1 WHERE id = $2', [h.subdomain, h.id]);
            console.log(`✅ ${h.name} → subdomain = "${h.subdomain}"`);
        }

        console.log('\n=== VERIFICATION ===\n');
        const r = await pool.query('SELECT id, name, subdomain FROM hospitals ORDER BY id');
        r.rows.forEach(h => {
            console.log(`${h.name}: subdomain = "${h.subdomain}"`);
        });

        console.log('\n✅ All subdomains updated!');
        console.log('\nNow when users visit:');
        console.log('  kokila.wolfsecurity.in → Kokila Hospital');
        console.log('  drparveen.wolfsecurity.in → Dr. Parveen Hospital');
        console.log('  taneja.wolfsecurity.in → Taneja Hospital');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

fix();
