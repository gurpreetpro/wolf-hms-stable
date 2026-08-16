const fs = require('fs');

function readLog(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            console.log(`=== ${filePath} (Last 100 lines) ===`);
            console.log(lines.slice(-100).join('\n'));
        } else {
            console.log(`${filePath} does not exist`);
        }
    } catch (e) {
        console.error(e);
    }
}

readLog('./server/startup_log_2.txt');
readLog('./server/server.log');
