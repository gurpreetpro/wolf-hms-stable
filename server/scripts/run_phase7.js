const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

const runPhase7 = async () => {
    try {
        const phase7Path = path.join(__dirname, 'phase7_payment.sql');
        const phase7Sql = fs.readFileSync(phase7Path, 'utf8');

        console.log('Running phase7_payment.sql...');
        await pool.query(phase7Sql);

        console.log('✅ Phase 7 (Payments) applied successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error running Phase 7:', err);
        process.exit(1);
    }
};

runPhase7();
