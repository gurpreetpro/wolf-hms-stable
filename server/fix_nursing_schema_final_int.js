const pool = require('./config/db');

async function fixTable(tableName) {
    console.log(`Checking ${tableName}...`);
    // Check columns
    const res = await pool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", 
        [tableName]
    );
    const cols = res.rows.map(r => r.column_name);
    const typeMap = {};
    res.rows.forEach(r => typeMap[r.column_name] = r.data_type);

    // Fix admission_id
    if (!cols.includes('admission_id')) {
        console.log(`Adding admission_id (INT) to ${tableName}...`);
        try {
             await pool.query(`ALTER TABLE ${tableName} ADD COLUMN admission_id INTEGER REFERENCES admissions(id)`);
        } catch(e) { console.log("Add Error:", e.message); }
    } else {
        // Check type
        if (typeMap['admission_id'] !== 'integer') {
             console.log(`Updating admission_id type (UUID->INT) in ${tableName}...`);
             try {
                // Drop and Add to be clean (Data loss acceptable in dev)
                await pool.query(`ALTER TABLE ${tableName} DROP COLUMN admission_id`);
                await pool.query(`ALTER TABLE ${tableName} ADD COLUMN admission_id INTEGER REFERENCES admissions(id)`);
             } catch(e) { console.log("Update Type Error:", e.message); }
        }
    }
    
    // Fix fluid_balance specifics
    if (tableName === 'fluid_balance') {
        if (!cols.includes('volume_ml')) {
             console.log("Adding volume_ml...");
             try { await pool.query(`ALTER TABLE fluid_balance ADD COLUMN volume_ml INTEGER`); } catch(e) {}
        }
        if (!cols.includes('notes')) {
             console.log("Adding notes...");
             try { await pool.query(`ALTER TABLE fluid_balance ADD COLUMN notes TEXT`); } catch(e) {}
        }
        if (!cols.includes('type')) {
             console.log("Adding type...");
             try { await pool.query(`ALTER TABLE fluid_balance ADD COLUMN type VARCHAR(50)`); } catch(e) {}
        }
         if (!cols.includes('subtype')) {
             console.log("Adding subtype...");
             try { await pool.query(`ALTER TABLE fluid_balance ADD COLUMN subtype VARCHAR(50)`); } catch(e) {}
        }
    }
}

(async () => {
    try {
        await fixTable('pain_scores');
        await fixTable('fluid_balance');
        await fixTable('iv_lines');
        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
