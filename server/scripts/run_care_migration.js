const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'wolf_hms',
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
    port: process.env.DB_PORT || 5432,
});

const runMigration = async () => {
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'care_coordination.sql');
        console.log(`Looking for migration file at: ${sqlPath}`);

        if (!fs.existsSync(sqlPath)) {
            console.error(`ERROR: File not found at ${sqlPath}`);
            console.log('Current directory:', __dirname);
            console.log('Contents of migrations folder:', fs.readdirSync(path.join(__dirname, 'migrations')));
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running Care Coordination migration...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        console.error(err.stack);
        process.exit(1);
    }
};

runMigration();
