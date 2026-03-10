const pool = require('./config/db');

async function seedPackages() {
    console.log('📦 Seeding Lab Packages...');

    const packages = [
        {
            name: 'Basic Health Checkup',
            price: 599,
            description: 'Essential health screening covering blood count, sugar, and liver/kidney basics.',
            category: 'Basic',
            tests: [
                'Complete Blood Count', 'Fasting Blood Sugar', 'Lipid Profile',
                'SGOT (AST)', 'SGPT (ALT)', 'Serum Creatinine'
            ]
        },
        {
            name: 'Comprehensive Wellness',
            price: 1499,
            description: 'Full body checkup including Thyroid, Vitamins, and detailed organ function tests.',
            category: 'Advanced',
            tests: [
                'Complete Blood Count', 'Fasting Blood Sugar', 'HbA1c', 'Lipid Profile',
                'Liver Function Tests', 'Kidney Function Tests', 'Thyroid Profile',
                'Vitamin D', 'Vitamin B12', 'Calcium'
            ]
        },
        {
            name: 'Diabetic Care Package',
            price: 999,
            description: 'Specialized monitoring for diabetes management.',
            category: 'Specialized',
            tests: [
                'Fasting Blood Sugar', 'Post Prandial Blood Sugar', 'HbA1c',
                'Lipid Profile', 'Serum Creatinine', 'Urine Microalbumin'
            ]
        },
        {
            name: 'Women\'s Wellness',
            price: 1299,
            description: 'Tailored for women including hormonal and bone health markers.',
            category: 'Women',
            tests: [
                'Complete Blood Count', 'Thyroid Profile', 'Calcium', 'Vitamin D',
                'Iron Studies', 'FSH', 'LH'
            ]
        }
    ];

    for (const pkg of packages) {
        try {
            // 1. Create Package
            const pkgRes = await pool.query(
                'INSERT INTO lab_packages (name, price, description, category) VALUES ($1, $2, $3, $4) RETURNING id',
                [pkg.name, pkg.price, pkg.description, pkg.category]
            );
            const packageId = pkgRes.rows[0].id;
            console.log(`  Created Package: ${pkg.name}`);

            // 2. Link Tests
            for (const testName of pkg.tests) {
                // Find test ID (fuzzy match or direct)
                const testRes = await pool.query(
                    'SELECT id FROM lab_test_types WHERE name ILIKE $1 LIMIT 1',
                    [`%${testName}%`]
                );

                if (testRes.rows.length > 0) {
                    await pool.query(
                        'INSERT INTO lab_package_items (package_id, test_type_id) VALUES ($1, $2)',
                        [packageId, testRes.rows[0].id]
                    );
                } else {
                    console.warn(`    ⚠️ Test not found: ${testName}`);
                }
            }
        } catch (err) {
            console.error(`  ❌ Failed to seed ${pkg.name}: ${err.message}`);
        }
    }
    console.log('✅ Package Seeding Complete');
    process.exit(0);
}

seedPackages();
