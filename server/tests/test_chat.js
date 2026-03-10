const axios = require('axios');
const BASE_URL = 'http://localhost:5001/api';

async function testChat() {
    try {
        // Login
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'doctor_user',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        const questions = [
            "How many patients are in ICU?",
            "List all doctors.",
            "What is the total revenue?"
        ];

        for (const q of questions) {
            console.log(`\nQuestion: "${q}"`);
            try {
                const chatRes = await axios.post(`${BASE_URL}/chat`, { question: q }, { headers });
                console.log('Answer:', chatRes.data.answer);
                if (chatRes.data.sql) console.log('SQL:', chatRes.data.sql);
            } catch (err) {
                console.error('Failed:', err.response?.data || err.message);
            }
        }

    } catch (err) {
        console.error('Login Failed:', err.response?.data || err.message);
    }
}

testChat();
