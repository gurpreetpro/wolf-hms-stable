const { Pool } = require('pg');
const bcrypt = require('/opt/wolf-hms/server/node_modules/bcryptjs');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: '', // defaults to trust for local postgres user
    port: 5432,
});

async function resetPassword() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('AceAdmin@2026', salt);

        console.log('Generated hash:', hash);

        const res = await pool.query(
            "UPDATE users SET password = $1 WHERE email = 'admin@aceheartinstitute.com' RETURNING username, email",
            [hash]
        );

        console.log('Update result:', res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

resetPassword();
