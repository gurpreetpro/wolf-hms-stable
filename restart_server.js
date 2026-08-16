const { execSync, spawn } = require('child_process');
const fs = require('fs');

try {
    console.log('Finding port 8080 owner...');
    const netstat = execSync('netstat -ano | findstr 8080', { encoding: 'utf8' });
    const lines = netstat.split('\n');
    for (const line of lines) {
        if (line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            console.log(`Killing PID ${pid}...`);
            execSync(`taskkill /F /PID ${pid}`);
        }
    }
} catch (e) {
    console.log('Port 8080 is already clear.');
}

console.log('Starting server-cloud.js in background...');
// Clear old logs first
fs.writeFileSync('./server/server.log', '');
fs.writeFileSync('./server/error.log', '');

const out = fs.openSync('./server/server.log', 'a');
const err = fs.openSync('./server/error.log', 'a');

const child = spawn('node', ['server-cloud.js'], {
    cwd: './server',
    detached: true,
    stdio: ['ignore', out, err]
});
child.unref();

console.log('✅ Backend server restarted successfully! PID:', child.pid);
