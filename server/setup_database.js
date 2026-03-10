const { Client } = require('pg');
const MigrationService = require('./services/MigrationService');

const createDatabaseAndMigrate = async () => {
    // First, connect to the default 'postgres' database to create hospital_db if needed
    const adminClient = new Client({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: 'postgres', // Connect to default database
        password: process.env.DB_PASSWORD || 'Hospital456!',
        port: process.env.DB_PORT || 5432,
    });

    try {
        console.log('🔌 Connecting to PostgreSQL...\n');
        await adminClient.connect();

        // Check if database exists
        console.log('🔍 Checking if database "hospital_db" exists...');
        const dbCheck = await adminClient.query(
            "SELECT 1 FROM pg_database WHERE datname = 'hospital_db'"
        );

        if (dbCheck.rows.length === 0) {
            console.log('📦 Creating database "hospital_db"...');
            await adminClient.query('CREATE DATABASE hospital_db');
            console.log('✅ Database created successfully!\n');
        } else {
            console.log('✅ Database "hospital_db" already exists.\n');
        }

        await adminClient.end();

        console.log('🚀 Starting HMS Premium Database Migration...\n');
        
        // Use the MigrationService
        await MigrationService.run();

        console.log('\n🎉 HMS Premium Database is ready!\n');

    } catch (err) {
        console.error('\n❌ Migration Error:', err.message);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Ensure PostgreSQL is running');
        console.error('   2. Check password in .env file');
        console.error('   3. Verify PostgreSQL is accessible on port 5432');
        console.error('   4. Check PostgreSQL logs for more details\n');
        console.error('Full error:', err);
        process.exit(1);
    }
};

// Load environment variables
require('dotenv').config();

createDatabaseAndMigrate();
