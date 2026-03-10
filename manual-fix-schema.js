const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

const run = async () => {
    try {
        const sql = `
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE users
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE users
SET hospital_id = 1
WHERE hospital_id IS NULL;
RAISE NOTICE 'Added hospital_id to users table';
END IF;
END $$;
        `;
        
        console.log(`Executing Custom SQL...`);
        const result = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
            sql: sql,
            setupKey: SETUP_KEY
        });
        console.log(`[CUSTOM_USERS_FIX] Success:`, result.data.success);

    } catch (e) {
        console.error('[ERROR]', e.message);
        if (e.response) {
             console.error('Data:', JSON.stringify(e.response.data));
        }
    }
};
run();
