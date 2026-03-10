const logger = require('../core/logger');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

module.exports = async function runCloudChecks(options) {
    let success = true;

    // Check 1: GCloud CLI
    try {
        const gcloudVersion = execSync('gcloud version', { stdio: 'pipe' }).toString();
        logger.success('GCloud CLI is installed: ' + gcloudVersion.split('\n')[0]);
    } catch (e) {
        logger.warn('GCloud CLI not found or errored. Cloud deployment required GCloud.');
        // Not a hard failure for local diagnostics, but warning.
        // If checking 'cloud' explicitly, maybe fail?
        // Let's keep as warning.
    }

    // Check 2: Dockerfile Validity (Root)
    const dockerfile = path.join(process.cwd(), 'Dockerfile');
    if (!fs.existsSync(dockerfile)) {
        logger.error('Root Dockerfile NOT found. Cloud Run deployment requires root Dockerfile.');
        success = false;
    } else {
        const content = fs.readFileSync(dockerfile, 'utf8');
        if (!content.includes('FROM node:')) {
            logger.error('Dockerfile does not seem to contain FROM node instruction.');
            success = false;
        } else {
            logger.success('Root Dockerfile present.');
        }
    }

    // Check 3: .dockerignore Validity
    const dockerIgnore = path.join(process.cwd(), '.dockerignore');
    if (fs.existsSync(dockerIgnore)) {
        const ignoreContent = fs.readFileSync(dockerIgnore, 'utf8');
        if (ignoreContent.includes('\nDockerfile') || ignoreContent.startsWith('Dockerfile')) {
            logger.error('.dockerignore excludes "Dockerfile". This prevents Could Build from seeing it!');
            logger.info('Please remove "Dockerfile" from .dockerignore.');
            success = false;
        } else {
            logger.success('.dockerignore looks correct (Dockerfile included).');
        }
    }

    // Check 4: Build Artifacts
    if (fs.existsSync(path.join(process.cwd(), 'client', 'dist'))) {
        logger.info('Client build artifacts found (dist/).');
    } else {
        logger.warn('Client build artifacts missing. Run `npm run build` in client directory.');
    }

    return success;
};
