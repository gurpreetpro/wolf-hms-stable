#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const logger = require('./core/logger');
const fs = require('fs');
const path = require('path');

// Ensure we are in root
const ROOT_DIR = process.cwd();

program
    .version('1.0.0')
    .description('Wolf HMS - Gold Standard Diagnostic Tool')
    .option('--deep', 'Run deep analysis (AST, Dependencies)', false)
    .option('--fix', 'Attempt to automatically fix issues', false)
    .option('--cloud', 'Run cloud configuration checks', false)
    .option('--stress', 'Run stress tests on DB', false)
    .parse(process.argv);

const options = program.opts();

async function runDiagnostics() {
    logger.header('WOLF HMS DIAGNOSTICS - INITIALIZING');
    logger.info(`Mode: ${options.deep ? 'DEEP' : 'STANDARD'}`);
    logger.info(`Root: ${ROOT_DIR}`);
    
    // System Check
    const nodeVersion = process.version;
    logger.info(`Node Version: ${nodeVersion}`);
    if (!nodeVersion.startsWith('v20') && !nodeVersion.startsWith('v18')) {
        logger.warn('Recommended Node version is v18 or v20. You are using ' + nodeVersion);
    }

    let hasErrors = false;

    // --- CLIENT CHECKS ---
    logger.section('FRONTEND DIAGNOSTICS');
    try {
        const runClientChecks = require('./checks/client');
        const clientResults = await runClientChecks(options);
        if (!clientResults) hasErrors = true;
    } catch (e) {
        logger.error('Failed to run Client checks:', e);
        hasErrors = true;
    }

    // --- SERVER CHECKS ---
    logger.section('BACKEND DIAGNOSTICS');
    try {
        const runServerChecks = require('./checks/server');
        const serverResults = await runServerChecks(options);
        if (!serverResults) hasErrors = true;
    } catch (e) {
        logger.error('Failed to run Server checks:', e);
        hasErrors = true;
    }
    
    // --- CLOUD CHECKS ---
    if (options.cloud || options.deep) {
         logger.section('CLOUD DIAGNOSTICS');
        try {
            const runCloudChecks = require('./checks/cloud');
            const cloudResults = await runCloudChecks(options);
            if (!cloudResults) hasErrors = true;
        } catch (e) {
            logger.error('Failed to run Cloud checks:', e);
            hasErrors = true;
        }
    }

    logger.header('DIAGNOSTIC SUMMARY');
    if (hasErrors) {
        console.log(chalk.red.bold('\n❌ ISSUES DETECTED. Check the log above for details.'));
        console.log(chalk.yellow(`Log file: ${path.join(ROOT_DIR, 'diagnostic_report.log')}`));
    } else {
        console.log(chalk.green.bold('\n✔ ALL SYSTEMS GO. No issues found.'));
    }
    
    // Wait for user input before closing (Critical for Windows EXE)
    console.log(chalk.gray('\nPress any key to exit...'));
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, hasErrors ? 1 : 0));
}

runDiagnostics();
