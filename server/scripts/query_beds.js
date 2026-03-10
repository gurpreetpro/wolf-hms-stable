/**
 * Query actual wards and beds from database
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: __dirname + '/../.env' });

const prisma = new PrismaClient();

async function queryData() {
    console.log('🔍 QUERYING ACTUAL WARDS AND BEDS');
    
    const wards = await prisma.wards.findMany({
        where: { hospital_id: 1 },
        select: { id: true, name: true, type: true }
    });
    
    console.log('\n📋 Wards in Hospital 1:');
    wards.forEach(w => console.log(`   ID ${w.id}: "${w.name}" (${w.type})`));
    
    const beds = await prisma.beds.findMany({
        where: { 
            hospital_id: 1,
            status: 'Available'
        },
        select: { id: true, bed_number: true, ward_id: true, status: true },
        take: 10
    });
    
    console.log('\n🛏️  Available Beds in Hospital 1:');
    if (beds.length === 0) {
        console.log('   (No available beds)');
    } else {
        beds.forEach(b => console.log(`   "${b.bed_number}" (Ward ID: ${b.ward_id})`));
    }
    
    // Check GEN-001 specifically
    const gen001 = await prisma.beds.findFirst({
        where: { bed_number: 'GEN-001', hospital_id: 1 },
        include: { wards: true }
    });
    
    if (gen001) {
        console.log(`\n✅ GEN-001 found: Ward = "${gen001.wards?.name || 'Unknown'}", Status = ${gen001.status}`);
    } else {
        console.log('\n❌ GEN-001 not found!');
    }
    
    await prisma.$disconnect();
}

queryData().catch(console.error);
