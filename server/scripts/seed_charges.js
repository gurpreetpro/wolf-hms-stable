const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const services = [
    // ROOM RATES
    { code: 'ROOM-GEN', name: 'General Ward Bed', category: 'Room', base_price: 500.00 },
    { code: 'ROOM-PVT', name: 'Private Room', category: 'Room', base_price: 1500.00 },
    { code: 'ROOM-ICU', name: 'ICU Bed', category: 'Room', base_price: 2500.00 },

    // LAB TESTS
    { code: 'LAB-CBC', name: 'Complete Blood Count', category: 'Lab', base_price: 250.00 },
    { code: 'LAB-LIPID', name: 'Lipid Profile', category: 'Lab', base_price: 500.00 },
    { code: 'LAB-KFT', name: 'Kidney Function Test', category: 'Lab', base_price: 450.00 },
    { code: 'LAB-LFT', name: 'Liver Function Test', category: 'Lab', base_price: 550.00 },
    { code: 'LAB-STD', name: 'Standard Lab Charges (Fallback)', category: 'Lab', base_price: 200.00 },

    // PHARMACY
    { code: 'PHARM-STD', name: 'Standard Pharmacy Charge (Fallback)', category: 'Pharmacy', base_price: 150.00 },

    // CONSULTATION
    { code: 'CONSULT-GEN', name: 'General Consultation', category: 'Consultation', base_price: 300.00 },
    { code: 'CONSULT-SPEC', name: 'Specialist Consultation', category: 'Consultation', base_price: 800.00 },
    
    // NURSING
    { code: 'NURSE-CHG', name: 'Nursing Charges (Per Day)', category: 'Nursing', base_price: 200.00 }
];

async function main() {
    console.log('🌱 Seeding Service Master...');
    
    for (const svc of services) {
        const result = await prisma.service_master.upsert({
            where: { code: svc.code },
            update: { 
                base_price: svc.base_price,
                name: svc.name,
                category: svc.category
            },
            create: svc,
        });
        console.log(`✅ Upserted: ${result.code} - ₹${result.base_price}`);
    }
    
    console.log('✨ Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
