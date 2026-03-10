const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

const runSchema = async () => {
    try {
        const schemaPath = path.join(__dirname, 'database.sql');
        const phase2Path = path.join(__dirname, 'phase2_schema.sql');
        const phase3Path = path.join(__dirname, 'phase3_schema.sql');
        const phase4Path = path.join(__dirname, 'phase4_schema.sql');
        const phase5Path = path.join(__dirname, 'phase5_schema.sql');
        const phase6Path = path.join(__dirname, 'phase6_schema.sql');
        const phase7Path = path.join(__dirname, 'phase7_payment.sql');

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const phase2Sql = fs.readFileSync(phase2Path, 'utf8');
        const phase3Sql = fs.readFileSync(phase3Path, 'utf8');
        const phase4Sql = fs.readFileSync(phase4Path, 'utf8');
        const phase5Sql = fs.readFileSync(phase5Path, 'utf8');
        const phase6Sql = fs.readFileSync(phase6Path, 'utf8');
        const phase7Sql = fs.readFileSync(phase7Path, 'utf8');

        console.log('Running database.sql...');
        await pool.query(schemaSql);

        console.log('Running phase2_schema.sql...');
        await pool.query(phase2Sql);

        console.log('Running phase3_schema.sql...');
        await pool.query(phase3Sql);

        console.log('Running phase4_schema.sql...');
        await pool.query(phase4Sql);

        console.log('Running phase5_schema.sql...');
        await pool.query(phase5Sql);

        console.log('Running phase6_schema.sql...');
        await pool.query(phase6Sql);

        console.log('Running phase7_payment.sql...');
        await pool.query(phase7Sql);

        console.log('✅ Database initialized successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error initializing database:', err);
        process.exit(1);
    }
};

runSchema();
