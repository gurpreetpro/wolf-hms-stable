const cron = require('node-cron');
const ERPSyncEngine = require('../services/finance/ERPSyncEngine');
const { pool } = require('../config/db');
// Assuming a generic email service exists in the project
// const EmailService = require('../services/EmailService');
const fs = require('fs');
const path = require('path');

/**
 * Enterprise ERP Delivery Daemon
 * Runs nightly at 11:59 PM to generate and dispatch the daily Tally XML
 */
const initERPCron = () => {
    // Schedule for 23:59 every day
    cron.schedule('59 23 * * *', async () => {
        console.log('[ERP Cron] Starting nightly Tally XML generation...');
        
        try {
            // Get all active corporate hospitals
            const hospitalsRes = await pool.query('SELECT id, name FROM hospitals WHERE subscription_tier = $1', ['Enterprise']);
            
            for (const hospital of hospitalsRes.rows) {
                // Generate XML for yesterday (or today depending on timezone/preference)
                // For cron running at 23:59, we sync 'today'
                const today = new Date();
                
                console.log(`[ERP Cron] Processing Hostpital ${hospital.name} (ID: ${hospital.id})`);
                
                const syncResult = await ERPSyncEngine.generateTallyXML(hospital.id, today);
                
                if (syncResult && syncResult.xml) {
                    // Export to a physical file temporarily
                    const fileName = `TALLY_SYNC_${hospital.id}_${syncResult.batchId}.xml`;
                    const filePath = path.join('/tmp', fileName);
                    
                    fs.writeFileSync(filePath, syncResult.xml);
                    
                    // TODO: Replace with actual SFTP/Email delivery
                    console.log(`[ERP Cron] Successfully generated XML for ${hospital.name}. Located at ${filePath}`);
                    
                    // Example dispatch
                    // await EmailService.sendWithAttachment(
                    //     'cfo@corporatehospital.com',
                    //     `Daily Tally Sync - ${hospital.name}`, 'Please find the daily XML sync attached.', filePath
                    // );
                } else {
                    console.log(`[ERP Cron] No data to sync for ${hospital.name} today.`);
                }
            }
            
        } catch (error) {
            console.error('[ERP Cron] Critical failure during execution:', error);
        }
    });
};

module.exports = { initERPCron };
