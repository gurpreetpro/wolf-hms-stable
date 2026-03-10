const { pool } = require('./db');

async function describePatients() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'patients'
            ORDER BY ordinal_position
        `);
        console.log('Columns in patients table:');
        result.rows.forEach(row => console.log(' ', row.column_name, '-', row.data_type));
        
        const opd = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'opd_visits'
            ORDER BY ordinal_position
        `);
        console.log('\nColumns in opd_visits table:');
        opd.rows.forEach(row => console.log(' ', row.column_name, '-', row.data_type));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

describePatients();
