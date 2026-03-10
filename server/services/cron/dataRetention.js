const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../Logger'); // Assuming Logger exists, or usage of console

// Configuration: Retention Period (e.g., 7 Years approx)
const RETENTION_YEARS = 7;
const BATCH_SIZE = 50;

async function runDataRetentionJob() {
    logger.info('🧹 Starting DPDP Data Retention (Right to Forget) Job...');
    
    try {
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);
        
        // Find patients inactive since cutoff date
        // Definition of "Inactive":
        // 1. updated_at < cutoff
        // 2. AND last_visit_date < cutoff (if exists)
        // 3. AND not already deleted/anonymized
        
        const patientsToAnonymize = await prisma.patients.findMany({
            where: {
                updated_at: { lt: cutoffDate },
                OR: [
                    { last_visit_date: null },
                    { last_visit_date: { lt: cutoffDate } }
                ],
                // AND: NOT already anonymized (assuming we check deleted_at or similar, 
                // but usually we just modify PII)
                deleted_at: null 
            },
            take: BATCH_SIZE
        });

        if (patientsToAnonymize.length === 0) {
            logger.info('✅ No patients found exceeding retention period.');
            return;
        }

        logger.info(`Found ${patientsToAnonymize.length} patients for anonymization.`);

        for (const patient of patientsToAnonymize) {
            await anonymizePatient(patient);
        }

        logger.info('✅ Data Retention Job Completed successfully.');

    } catch (error) {
        logger.error('❌ Data Retention Job Failed:', error);
    }
}

async function anonymizePatient(patient) {
    try {
        // Anonymization Logic
        // 1. Mask PII in `patients` table
        // 2. Log action in `data_anonymization_logs`
        
        // Transaction
        await prisma.$transaction(async (tx) => {
            // Log first
            await tx.data_anonymization_logs.create({
                data: {
                    entity_type: 'PATIENT',
                    entity_id: patient.id, // Using String UUID
                    action: 'ANONYMIZED',
                    reason: `Retention Policy (${RETENTION_YEARS} years inactivity)`,
                    executed_at: new Date(),
                    details: {
                        original_name_masked: maskString(patient.name),
                        original_phone_masked: maskString(patient.phone)
                    }
                }
            });

            // Update Patient Record to "Forgotten" state
            await tx.patients.update({
                where: { id: patient.id },
                data: {
                    name: `Redacted-${patient.id.substring(0,8)}`,
                    phone: null,
                    address: null,
                    dob: null, // Or set to 1900-01-01
                    gender: null,
                    pmjay_id: null,
                    pmjay_family_id: null,
                    history_json: {}, // Clear history
                    deleted_at: new Date(),
                    deletion_reason: 'DPDP Right to Forget (Auto)'
                }
            });
        });

        logger.info(`Anonymized Patient: ${patient.id}`);
    } catch (err) {
        logger.error(`Failed to anonymize patient ${patient.id}:`, err);
    }
}

function maskString(str) {
    if (!str) return null;
    if (str.length <= 4) return '****';
    return str.substring(0, 2) + '****' + str.substring(str.length - 2);
}

// Initialize Cron
const initRetentionCron = () => {
    // Run every Sunday at 3:00 AM
    cron.schedule('0 3 * * 0', () => {
        runDataRetentionJob();
    });
    logger.info('⏰ DPDP Data Retention Cron Scheduled (Sunday 03:00 AM)');
};

module.exports = { initRetentionCron, runDataRetentionJob };
