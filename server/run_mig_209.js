const { runMigration } = require('./migrate');
const pool = require('./config/db');

async function run() {
    try {
        await runMigration('209_add_billing_cycle.sql');
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}
run();
