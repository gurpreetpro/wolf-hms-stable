const pool = require('./config/db');
const fs = require('fs');
(async () => {
    try {
        const r = await pool.query(
            `SELECT column_name, data_type, is_nullable 
             FROM information_schema.columns 
             WHERE table_name = 'hospitals' 
             ORDER BY ordinal_position`
        );
        let out = '=== HOSPITALS TABLE SCHEMA ===\n';
        r.rows.forEach(c => out += `  ${c.column_name} (${c.data_type}) ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}\n`);
        
        const data = await pool.query('SELECT id, name, code, subdomain, email, city, is_active, subscription_tier FROM hospitals ORDER BY id');
        out += '\n=== EXISTING HOSPITALS ===\n';
        data.rows.forEach(h => out += `  ID:${h.id} | ${h.name} | code:${h.code} | subdomain:${h.subdomain} | tier:${h.subscription_tier} | active:${h.is_active}\n`);
        
        fs.writeFileSync('schema_output_node.txt', out, 'utf8');
        await pool.end();
        console.log("Done. Check schema_output_node.txt");
    } catch(e) {
        console.error(e.message);
        process.exit(1);
    }
})();
