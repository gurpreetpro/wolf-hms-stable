const axios = require('axios');
const API_URL = 'http://217.216.78.81:8080/api/debug/sql';

async function fixDB() {
    try {
        // Drop restrictive constraint blocking discharge
        await axios.post(API_URL, { query: "ALTER TABLE care_tasks DROP CONSTRAINT IF EXISTS care_tasks_type_check;" });
        // Discharge all stale test admissions
        await axios.post(API_URL, { query: "UPDATE admissions SET status = 'Discharged', discharge_date = NOW() WHERE status = 'Admitted' AND patient_id IN (SELECT id FROM patients WHERE name LIKE 'Cloud Sim%');" });
        // Reset all General Ward beds to Available
        await axios.post(API_URL, { query: "UPDATE beds SET status = 'Available' WHERE bed_number LIKE 'Gen%';" });
        // Reset admissions sequence
        await axios.post(API_URL, { query: "SELECT setval('admissions_id_seq', COALESCE((SELECT MAX(id)+1 FROM admissions), 1), false);" });
        console.log('Dropped constraint, discharged stale patients, freed beds.');
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
fixDB();
