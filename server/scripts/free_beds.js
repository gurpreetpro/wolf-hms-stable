/**
 * Quick fix script to free up beds for testing
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: __dirname + '/../.env' });

const prisma = new PrismaClient();

async function fixBeds() {
    console.log('🔧 Freeing up test beds...');
    
    // Mark 'Gen 1' bed as available
    const result = await prisma.beds.updateMany({
        where: { 
            bed_number: 'Gen 1',
            hospital_id: 1
        },
        data: { status: 'Available' }
    });
    
    console.log(`✅ Updated ${result.count} beds to Available`);
    await prisma.$disconnect();
}

fixBeds().catch(console.error);
