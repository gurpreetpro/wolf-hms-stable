const { execSync } = require('child_process');
try {
    const output = execSync('netstat -ano | findstr 8080', { encoding: 'utf8' });
    console.log(output);
} catch (e) {
    console.error('Error finding port owner:', e.message);
}
