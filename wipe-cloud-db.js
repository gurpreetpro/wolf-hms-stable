const CleanCloudDB = async () => {
    // This script will execute SQL to DROP ALL TABLES in the cloud database
    // It uses the /api/health/exec-sql endpoint which is only available if setupKey is correct
    
    const axios = require('axios');
    const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
    const SETUP_KEY = 'WolfSetup2024!';

    const dropQueries = [
        "DROP SCHEMA public CASCADE;",
        "CREATE SCHEMA public;",
        "GRANT ALL ON SCHEMA public TO postgres;",
        "GRANT ALL ON SCHEMA public TO public;"
    ];

    console.log(`[WIPE] Connecting to ${CLOUD_URL}...`);

    for (const query of dropQueries) {
        try {
            console.log(`[EXEC] ${query}`);
            const response = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
                sql: query,
                setupKey: SETUP_KEY
            });
            console.log(`[SUCCESS] ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.error(`[ERROR] Failed to execute ${query}`);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error(`Data: ${JSON.stringify(error.response.data)}`);
            } else {
                console.error(error.message);
            }
        }
    }
};

CleanCloudDB();
