const { execSync } = require('child_process');
const path = require('path');

const scripts = [
    // 1. Foundation (Users & Roles)
    'seed_users.js',
    'seed_ot_users.js',

    // 2. Infrastructure
    'seed_wards.js',

    // 3. Inventory & Master Data
    'seed_medicines.js',
    'seed_indian_consumables.js',
    'seed_lab_tests.js',
    'seed_lab_packages.js',

    // 4. Patients & Admissions (Depends on Users & Wards)
    'seed_ipd_patients.js',

    // 5. Transactional Data (Depends on Patients & Inventory)
    'seed_lab_data.js',
    'seed_pharmacy_data.js',
    'seed_pharmacy_v2.js',
    
    // 6. Analytics & Misc
    'seed_usage_history.js',
    'seed_expiry_test.js',
    'seed_allergy_test.js'
];

console.log('🌱 Starting Master Seeding Process...');

for (const script of scripts) {
    try {
        console.log(`\n--------------------------------------------------`);
        console.log(`🚀 Running ${script}...`);
        const scriptPath = path.join(__dirname, script);
        
        // Inherit stdio to show logs from child scripts
        execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
        
        console.log(`✅ Completed: ${script}`);
    } catch (e) {
        console.error(`❌ Failed: ${script}`);
        console.error('Continuing to next script...');
        // Optional: process.exit(1) if strict
    }
}

console.log(`\n--------------------------------------------------`);
console.log('🎉 Master Seeding Complete.');
