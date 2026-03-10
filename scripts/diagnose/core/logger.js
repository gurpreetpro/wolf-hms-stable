const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(process.cwd(), 'diagnostic_report.log');

// Clear log file on start
if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
}

function writeToLog(type, message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${type}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line);
}

const logger = {
    info: (msg) => {
        console.log(chalk.blue('ℹ'), msg);
        writeToLog('INFO', msg);
    },
    success: (msg) => {
        console.log(chalk.green('✔'), msg);
        writeToLog('SUCCESS', msg);
    },
    warn: (msg) => {
        console.log(chalk.yellow('⚠'), msg);
        writeToLog('WARN', msg);
    },
    error: (msg, err = null) => {
        console.log(chalk.red('✖'), msg);
        if (err) {
            console.error(chalk.red(err.stack || err));
        }
        writeToLog('ERROR', `${msg} ${err ? (err.message || err) : ''}`);
    },
    header: (msg) => {
        console.log('\n' + chalk.bold.cyan('='.repeat(50)));
        console.log(chalk.bold.cyan(`   ${msg}`));
        console.log(chalk.bold.cyan('='.repeat(50)));
        writeToLog('HEADER', msg);
    },
    section: (msg) => {
        console.log('\n' + chalk.bold.white(`--- ${msg} ---`));
        writeToLog('SECTION', msg);
    }
};

module.exports = logger;
