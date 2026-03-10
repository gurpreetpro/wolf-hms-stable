require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testConnection() {
    console.log('🔌 Testing Gemini Connection...');
    console.log(`🔑 Key configured: ${process.env.GEMINI_API_KEY ? 'Yes (Length: ' + process.env.GEMINI_API_KEY.length + ')' : 'No'}`);
    
    // Test parameters
    const modelName = "gemini-2.5-flash";
    console.log(`🤖 Model: ${modelName}`);

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });

        console.log('📨 Sending prompt: "Hello, are you online?"');
        const result = await model.generateContent("Hello, are you online?");
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Success! Response received:');
        console.log('--------------------------------------------------');
        console.log(text);
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        if (error.status) console.error('Status Code:', error.status);
    }
}

testConnection();
