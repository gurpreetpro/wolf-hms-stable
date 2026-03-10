const axios = require('axios');
const API_URL = 'http://217.216.78.81:8080/api/debug/sql';

async function queryDB() {
    try {
        const res = await axios.post(API_URL, {
            query: "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'care_tasks_type_check';"
        });
        console.log(JSON.stringify(res.data.rows, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
queryDB();
