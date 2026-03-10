const axios = require('axios');
const API_URL = 'http://217.216.78.81:8080/api/debug/sql';

async function queryDB() {
    try {
        const res = await axios.post(API_URL, {
            query: "SELECT b.bed_number, w.name as ward_name FROM beds b JOIN wards w ON b.ward_id = w.id WHERE b.hospital_id = 1 LIMIT 5;"
        });
        console.log(JSON.stringify(res.data.rows, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
queryDB();
