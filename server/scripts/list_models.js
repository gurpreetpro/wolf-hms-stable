const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function run() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('No API Key found into env.');
        return;
    }
    
    // Direct REST call to list models using the key, or try init
    // The SDK doesn't have a simple listModels method exposed easily on the main entry, 
    // but we can try a direct fetch or just check if a simple prompt works on a known model.
    
    // Actually, let's try a simple prompt on 'gemini-1.5-flash-latest' and 'gemini-1.0-pro'
    
    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-pro",
        "gemini-2.0-flash-exp"
    ];

    console.log('Testing Models...');
    
    const genAI = new GoogleGenerativeAI(key);
    
    for (const m of candidates) {
        process.stdout.write(`Testing ${m}... `);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hello");
            const response = await result.response;
            console.log(`✅ Success! (${response.text().trim()})`);
        } catch (err) {
            if (err.message.includes('404')) {
                console.log('❌ 404 Not Found');
            } else {
                console.log(`❌ Error: ${err.message}`);
            }
        }
    }
}

run();
