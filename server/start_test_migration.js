process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'Hospital456!';
process.env.DB_NAME = 'hospital_db_test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5434';

const MigrationService = require('./services/MigrationService');

console.log('🔄 Starting Test DB Migrations on port 5434...');
MigrationService.run()
    .then(() => {
        console.log('✅ Test DB Migrations Complete');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Migration Script Failed:', err.message);
        process.exit(1);
    });
