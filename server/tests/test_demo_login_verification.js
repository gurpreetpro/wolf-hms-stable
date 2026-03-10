const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/auth/demo-login');
        console.log("Response Data:");
        console.log(JSON.stringify(res.data, null, 2));

        const users = res.data.demoUsersCreated || [];
        if (users.includes('Ward Incharge')) {
            console.log("SUCCESS: Ward Incharge created/found.");
        } else {
            console.log("FAILURE: Ward Incharge NOT found in response.");
        }

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error(e.response.data);
    }
}
test();
