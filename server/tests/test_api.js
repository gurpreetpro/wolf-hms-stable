const axios = require('axios');

async function testLabTestsAPI() {
    console.log('🧪 Testing Lab Tests API...\n');

    try {
        // First, try without auth (should fail)
        console.log('1️⃣ Testing API endpoint: GET /api/lab/tests');

        const response = await axios.get('http://localhost:5000/api/lab/tests');

        console.log(`✅ Status: ${response.status}`);
        console.log(`✅ Tests found: ${response.data.length}`);

        if (response.data.length > 0) {
            console.log('\n📊 Sample data:');
            console.log(JSON.stringify(response.data.slice(0, 3), null, 2));

            // Group by category
            const categories = {};
            response.data.forEach(test => {
                const cat = test.category || 'Uncategorized';
                if (!categories[cat]) categories[cat] = 0;
                categories[cat]++;
            });

            console.log('\n📋 Tests by Category:');
            Object.keys(categories).forEach(cat => {
                console.log(`   ${cat}: ${categories[cat]} tests`);
            });
        } else {
            console.log('⚠️  No tests returned from API');
        }

    } catch (err) {
        if (err.response) {
            console.error(`❌ API Error: ${err.response.status} - ${err.response.statusText}`);
        } else if (err.code === 'ECONNREFUSED') {
            console.error('❌ Server not running! Please start the server first:');
            console.error('   cd server && node server.js');
        } else {
            console.error('❌ Error:', err.message);
        }
    }
}

testLabTestsAPI();
