const fs = require('fs');
const path = require('path');
const net = require('net');
const { execSync } = require('child_process');
require('dotenv').config();

const LOG_FILE = 'diagnostic_log.txt';

function log(message) {
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] ${message}`;
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false); // Port is busy
            } else {
                resolve(true); // Other error, assume available for now?
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(true); // Port is free
        });
        server.listen(port);
    });
}

function killPort(port) {
    try {
        log(`Attempting to free port ${port}...`);
        // Find PID for port (Windows)
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length > 0) {
            const parts = lines[0].trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            log(`Found PID ${pid} on port ${port}. Killing...`);
            execSync(`taskkill /F /PID ${pid}`);
            log(`Successfully killed process ${pid}.`);
            return true;
        } else {
            log(`No active process found on port ${port} during kill attempt.`);
        }
    } catch (e) {
        log(`Error killing port ${port}: ${e.message}`);
    }
    return false;
}

async function checkDatabase() {
    log('Checking Database Connection...');
    try {
        // Use Prisma CLI to validate connection
        execSync('npx prisma db pull --print', { stdio: 'ignore' });
        log('✅ Database Connection: SUCCESS');
        return true;
    } catch (e) {
        log('❌ Database Connection: FAILED');
        log('   Suggestion: Check DATABASE_URL in .env and ensure Postgres is running.');
        return false;
    }
}

function checkFrontendBuild() {
    log('Checking Client Build...');
    const buildPath = path.join(__dirname, '../../client/dist');
    if (fs.existsSync(buildPath)) {
        log('✅ Client Build: FOUND (dist/ folder exists)');
        return true;
    } else {
        log('⚠️ Client Build: MISSING (dist/ folder not found)');
        log('   Attempting Auto-Fix: Running npm run build...');
        try {
            execSync('npm run build', { cwd: path.join(__dirname, '../../client'), stdio: 'inherit' });
            log('✅ Auto-Fix: Client Build Completed.');
            return true;
        } catch (e) {
            log('❌ Auto-Fix Failed: Could not build client.');
            return false;
        }
    }
}

async function runDiagnostics() {
    log('=== WOLF HMS DIAGNOSTIC TOOL v1.0 ===');
    log('Running System Health Checks...\n');

    // 1. Environment Variables
    if (fs.existsSync('.env')) {
        log('✅ Environment (.env): FOUND');
    } else {
        log('❌ Environment (.env): MISSING');
        // Check for .env.example
        if (fs.existsSync('.env.example')) {
             fs.copyFileSync('.env.example', '.env');
             log('   Auto-Fix: Created .env from .env.example');
        }
    }

    // 2. Database
    await checkDatabase();

    // 3. Port Conflicts (Server: 5000)
    const port5000Free = await checkPort(5000);
    if (port5000Free) {
        log('✅ Port 5000 (Server): AVAILABLE');
    } else {
        log('❌ Port 5000 (Server): BLOCKED');
        killPort(5000); // Auto-Fix
    }

    // 4. Frontend Assets
    checkFrontendBuild();

    log('\n=== DIAGNOSTICS COMPLETE ===');
    log(`Log saved to ${LOG_FILE}`);
}

runDiagnostics();
