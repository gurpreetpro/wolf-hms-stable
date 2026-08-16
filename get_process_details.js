const { execSync } = require('child_process');
try {
    const output = execSync('wmic process where "ProcessId=17016" get CommandLine, ProcessId', { encoding: 'utf8' });
    console.log(output);
} catch (e) {
    console.error('Error getting process details:', e.message);
}
