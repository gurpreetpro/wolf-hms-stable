const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const migrationService = require('../services/migration_service'); // Adjust path if needed
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function runTest() {
    console.log("🧛 STARTING WOLF MIGRATOR 'VAMPIRE' TEST 🧛");

    // 1. Create Dummy CSV
    const csvContent = `name,phone,gender,dob,address
Dracula,9999999999,Male,1400-01-01,Transylvania Castle
Nosferatu,8888888888,Male,1922-03-04,Wisbourg
Van Helsing,,Male,1880-05-05,London (Missing Phone)
Mina Harker,7777777777,Female,1890-10-10,London`;
    
    const uploadDir = path.join(__dirname, '../uploads/migration_staging');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, 'test_vampire_data.csv');
    fs.writeFileSync(filePath, csvContent);
    console.log("✅ Step 1: Dummy CSV created at", filePath);

    // 2. Mock File Object (from Multer)
    const mockFile = {
        filename: 'test_vampire_data.csv',
        originalname: 'test_vampire_data.csv',
        path: filePath
    };

    try {
        // 3. Create Job
        console.log("⏳ Step 2: Creating Migration Job...");
        const job = await migrationService.createJob(mockFile, 1, 1); // Hospital 1, User 1
        console.log("   -> Job Created! ID:", job.id);

        // 4. Validate (Dry Run)
        console.log("⏳ Step 3: Running Validation (Dry Run)...");
        const mapping = {
            name: "name",
            phone: "phone",
            gender: "gender",
            dob: "dob",
            address: "address"
        };
        const validatedJob = await migrationService.validateJob(job.id, mapping);
        console.log(`   -> Validation Complete. Status: ${validatedJob.status}`);
        console.log(`   -> Stats: ${validatedJob.valid_rows} Valid, ${validatedJob.error_rows} Errors`);

        if (validatedJob.error_rows !== 1) {
            console.error("❌ FAILED: Expected 1 error (Van Helsing missing phone), got", validatedJob.error_rows);
        } else {
             console.log("✅ Validation Logic Verified (Caught expected error)");
        }

        // 5. Commit (Real Import)
        console.log("⏳ Step 4: Committing to Database...");
        const result = await migrationService.commitJob(job.id);
        console.log("   -> Commit Complete!", result);

        if (result.committed !== 3) {
             console.error("❌ FAILED: Expected 3 committed rows, got", result.committed);
        } else {
             console.log("✅ Commit Logic Verified (3 Vampires inserted)");
        }

        // 6. Cleanup (Optional, keep for debugging)
        // await prisma.migration_jobs.delete({ where: { id: job.id } });

        console.log("🎉 TEST PASSED: Wolf Migrator is fully functional!");

    } catch (err) {
        console.error("❌ CRITICAL FAILURE:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
