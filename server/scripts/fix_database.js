/**
 * Fix Database Issues for Production Credibility
 * 1. Add missing updated_at column to patients
 * 2. Seed wards and beds if empty
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: __dirname + '/../.env' });

const prisma = new PrismaClient();

async function fixDatabaseIssues() {
    console.log('🔧 WOLF HMS DATABASE FIX SCRIPT');
    console.log('================================');
    
    // 1. Add updated_at column to patients if missing
    console.log('\n1. Checking patients.updated_at column...');
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
        `);
        console.log('   ✅ updated_at column added/verified');
    } catch (err) {
        console.log('   ⚠️ Column check:', err.message);
    }
    
    // 2. Check and seed wards
    console.log('\n2. Checking wards...');
    const wardCount = await prisma.wards.count();
    if (wardCount === 0) {
        console.log('   Creating default wards...');
        await prisma.wards.createMany({
            data: [
                { name: 'General Ward', type: 'General', capacity: 20, hospital_id: 1, status: 'Active' },
                { name: 'ICU', type: 'ICU', capacity: 10, hospital_id: 1, status: 'Active' },
                { name: 'Pediatric Ward', type: 'Pediatric', capacity: 15, hospital_id: 1, status: 'Active' }
            ],
            skipDuplicates: true
        });
        console.log('   ✅ 3 wards created');
    } else {
        console.log(`   ✅ ${wardCount} wards already exist`);
    }
    
    // 3. Check and seed beds
    console.log('\n3. Checking beds...');
    const bedCount = await prisma.beds.count();
    if (bedCount === 0) {
        console.log('   Creating default beds...');
        const wards = await prisma.wards.findMany({ take: 3 });
        const bedsData = [];
        
        for (const ward of wards) {
            for (let i = 1; i <= 5; i++) {
                bedsData.push({
                    bed_number: `${ward.name.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
                    ward_id: ward.id,
                    status: 'Available',
                    hospital_id: 1
                });
            }
        }
        
        await prisma.beds.createMany({
            data: bedsData,
            skipDuplicates: true
        });
        console.log(`   ✅ ${bedsData.length} beds created`);
    } else {
        console.log(`   ✅ ${bedCount} beds already exist`);
    }
    
    // 4. Check health endpoint
    console.log('\n4. Database connection verified');
    const result = await prisma.$queryRaw`SELECT NOW() as server_time`;
    console.log(`   ✅ DB Time: ${result[0].server_time}`);
    
    console.log('\n================================');
    console.log('🎉 Database fixes complete!');
    console.log('Please re-run the credibility audit.');
    
    await prisma.$disconnect();
}

fixDatabaseIssues().catch(console.error);
