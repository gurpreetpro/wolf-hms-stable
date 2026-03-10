/**
 * Seed Wards and Beds for Credibility Testing
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: __dirname + '/../.env' });

const prisma = new PrismaClient();

async function seedData() {
    console.log('🔧 SEEDING WARDS AND BEDS FOR HOSPITAL 1');
    
    // Check existing beds
    const existingBeds = await prisma.beds.findMany({
        where: { hospital_id: 1 },
        select: { id: true, bed_number: true, ward_id: true, status: true }
    });
    
    console.log(`\nExisting beds in Hospital 1: ${existingBeds.length}`);
    existingBeds.slice(0, 5).forEach(b => console.log(`   - ${b.bed_number} (Status: ${b.status})`));
    
    // Check for General Ward
    let generalWard = await prisma.wards.findFirst({
        where: { 
            hospital_id: 1,
            name: { contains: 'General' }
        }
    });
    
    if (!generalWard) {
        console.log('\n Creating General Ward...');
        generalWard = await prisma.wards.create({
            data: {
                name: 'General Ward',
                type: 'General',
                capacity: 20,
                hospital_id: 1,
                status: 'Active'
            }
        });
        console.log('   ✅ General Ward created');
    } else {
        console.log(`\n✅ General Ward exists (ID: ${generalWard.id})`);
    }
    
    // Create GEN-001 bed if not exists
    let testBed = await prisma.beds.findFirst({
        where: { 
            bed_number: 'GEN-001',
            hospital_id: 1
        }
    });
    
    if (!testBed) {
        console.log('\n Creating GEN-001 bed...');
        testBed = await prisma.beds.create({
            data: {
                bed_number: 'GEN-001',
                ward_id: generalWard.id,
                status: 'Available',
                hospital_id: 1
            }
        });
        console.log('   ✅ GEN-001 bed created');
    } else {
        console.log(`\n✅ GEN-001 exists (Status: ${testBed.status})`);
        
        // Mark as available if occupied
        if (testBed.status !== 'Available') {
            await prisma.beds.update({
                where: { id: testBed.id },
                data: { status: 'Available' }
            });
            console.log('   🔄 Marked as Available');
        }
    }
    
    console.log('\n🎉 Seed complete!');
    await prisma.$disconnect();
}

seedData().catch(console.error);
