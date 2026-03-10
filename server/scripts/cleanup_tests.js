/**
 * Cleanup script - discharge admissions and free beds
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: __dirname + '/../.env' });

const prisma = new PrismaClient();

async function cleanup() {
    console.log('🧹 Cleaning up test data...');
    
    // Discharge all test patient admissions on Gen 1 bed
    const dischargeResult = await prisma.admissions.updateMany({
        where: { 
            hospital_id: 1,
            status: 'Admitted',
            bed_number: 'Gen 1'
        },
        data: { 
            status: 'Discharged',
            discharge_date: new Date()
        }
    });
    console.log(`   Discharged ${dischargeResult.count} admissions`);
    
    // Mark Gen 1 bed as available
    const bedResult = await prisma.beds.updateMany({
        where: { 
            bed_number: 'Gen 1',
            hospital_id: 1
        },
        data: { status: 'Available' }
    });
    console.log(`   Marked ${bedResult.count} beds as Available`);
    
    console.log('✅ Cleanup complete!');
    await prisma.$disconnect();
}

cleanup().catch(console.error);
