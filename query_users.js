const axios = require('axios');
const API_URL = 'http://217.216.78.81:8080/api/debug/sql';

async function queryDB() {
    try {
        const res = await axios.post(API_URL, {
            query: "SELECT id, username, role, hospital_id FROM users WHERE role IN ('admin', 'super_admin', 'doctor', 'nurse', 'receptionist');"
        });
        console.log(JSON.stringify(res.data.rows, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
queryDB();
