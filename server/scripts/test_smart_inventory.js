const SmartInventory = require('../services/SmartInventory');
require('dotenv').config();

async function run() {
    console.log('💊 Testing Smart Inventory Logic...');
    try {
        const alerts = await SmartInventory.getInventoryAlerts();
        console.log(`✅ Fetched ${alerts.length} alerts.`);
        
        if (alerts.length > 0) {
            console.log('\nTop 3 Alerts:');
            alerts.slice(0, 3).forEach(a => {
                console.log(`[${a.riskScore}] ${a.name} (Risk: ${a.riskReason})`);
                if (a.aiNote) console.log(`   🤖 AI Note: ${a.aiNote}`);
                console.log(`   Stats: Stock ${a.stock_quantity}, Burn ${a.burnRate}/day, Expires in ${a.daysToExpiry}d`);
            });
        } else {
            console.log('No alerts found (Inventory might be healthy or empty).');
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
    }
    // Give time for logs to flush and connections to close gracefully if needed
    setTimeout(() => {
        console.log('🏁 Test Complete');
        process.exit(0);
    }, 2000);
}

run();
