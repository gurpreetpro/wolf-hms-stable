const { pool } = require('./db');

async function fixSecuritySetup() {
    try {
        // Set default security question for all users without one
        const result = await pool.query(`
            UPDATE users 
            SET security_question = 'What is your favorite color?',
                security_answer = 'default_skip_setup'
            WHERE security_question IS NULL
        `);

        console.log(`Updated ${result.rowCount} users - they will no longer see security setup`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

fixSecuritySetup();
