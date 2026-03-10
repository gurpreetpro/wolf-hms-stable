const logger = require('../core/logger');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

const SERVER_ROOT = path.join(process.cwd(), 'server');

module.exports = async function runServerChecks(options) {
    let success = true;

    // Check 1: Server Directory
    if (!fs.existsSync(SERVER_ROOT)) {
        logger.error('Server directory not found at ' + SERVER_ROOT);
        return false;
    }

    // Check 2: Environment Variables
    const envFile = path.join(SERVER_ROOT, '.env');
    if (!fs.existsSync(envFile)) {
        logger.warn('Server .env file missing! (Production might use Cloud Secrets)');
    } else {
        const envContent = fs.readFileSync(envFile, 'utf8');
        if (!envContent.includes('DATABASE_URL')) {
            logger.error('Server .env missing DATABASE_URL');
            success = false;
        } else {
            logger.success('Server Environment configuration looks correct.');
        }
    }

    // Check 3: Database Connectivity (via Prisma)
    if (options.deep) {
        console.log(chalk.gray('Checking Database Connection via Prisma...'));
        try {
            // execSync throws if exit code != 0
            // We use 'npx prisma migrate status' as a proxy for connectivity check
            execSync('npx prisma migrate status', { 
                cwd: SERVER_ROOT, 
                stdio: 'ignore', // Suppress output unless error? No, maybe pipe?
                timeout: 10000 // 10s timeout
            });
            logger.success('Database Connection successful (Prisma Verified).');
        } catch (e) {
            logger.error('Database Connectivity Failed. Check DATABASE_URL and VPN/Network.');
            // Only fail if strict? Diagnostic tool should report error.
            success = false;
        }
    }

    // Check 4: Critical Files
    const criticalFiles = ['server.js', 'server-cloud.js', 'Dockerfile'];
    criticalFiles.forEach(file => {
        if (!fs.existsSync(path.join(SERVER_ROOT, file))) {
            logger.error(`Missing critical server file: ${file}`);
            success = false;
        }
    });

    return success;
};
