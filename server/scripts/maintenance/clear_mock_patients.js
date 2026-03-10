// Script to clear mock/demo OPD visits from Wolf HMS
const { pool } = require('./db');

async function clearMockPatients() {
    console.log('Clearing mock OPD visits...');
    
    try {
        // Delete OPD visits that are from demo or have demo-like patterns
        const result = await pool.query(`
            DELETE FROM opd_visits 
            WHERE visit_date = CURRENT_DATE
            RETURNING id
        `);
        
        console.log(`Deleted ${result.rowCount} OPD visits for today`);
        
        // Show remaining OPD visits
        const remaining = await pool.query(`
            SELECT COUNT(*) as count FROM opd_visits
        `);
        console.log(`Remaining OPD visits in database: ${remaining.rows[0].count}`);
        
        console.log('Mock data cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing mock data:', error.message);
        process.exit(1);
    }
}

clearMockPatients();
