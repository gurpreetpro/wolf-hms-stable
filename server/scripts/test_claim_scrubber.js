const { getAIBillingEngine } = require('../services/aiBillingEngine');
require('dotenv').config();

async function runTests() {
    console.log('🤖 Starting Test...');
    
    const key = process.env.GEMINI_API_KEY;
    console.log(`🔑 API Key Present: ${key ? 'YES (' + key.substring(0,5) + '...)' : 'NO'}`);

    const engine = getAIBillingEngine();

    // TEST CASE 2: Invalid Claim (Headache -> Knee Replacement)
    console.log('\n--- Test Case 2: Knee Surgery for Headache ---');
    const invalidClaim = {
        claim_amount: 250000,
        preauth_approved: true,
        documentation_score: 90,
        diagnosis_codes: ['R51 (Headache)'],
        procedure_codes: ['27447 (Total Knee Arthroplasty)'],
        length_of_stay: 5,
        room_type: 'private'
    };

    try {
        const result2 = await engine.predictDenial(invalidClaim);
        console.log(`Risk Score: ${result2.riskScore}`);
        
        const aiFactor = result2.riskFactors.find(f => f.factor === 'Clinical Mismatch (AI)');
        if (aiFactor) {
            console.log(`✅ SUCCESS: AI Flagged it.`);
            console.log(`Reasoning: ${aiFactor.details}`);
        } else {
            console.log('❌ FAILURE: AI missed it.');
            console.log('Full Risk Factors:', JSON.stringify(result2.riskFactors, null, 2));
        }
    } catch (err) {
        console.error('Test Failed:', err);
    }
    
    process.exit(0);
}

runTests();
