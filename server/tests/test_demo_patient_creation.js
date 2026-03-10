const axios = require('axios');
async function test() {
    try {
        console.log("1. Logging in...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/demo-login');
        if (loginRes.status !== 200) throw new Error("Login failed");

        const token = loginRes.data.token;
        console.log("Login successful. Token obtained.");

        console.log("2. Creating Demo Patient...");
        const patientRes = await axios.post('http://localhost:5000/api/opd/demo-patient', {}, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("SUCCESS: Demo Patient Created!");
        console.log("Patient ID:", patientRes.data.id);
        console.log("Token:", patientRes.data.token);

    } catch (e) {
        console.error("FAILURE:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", JSON.stringify(e.response.data, null, 2));
        }
    }
}
test();
