const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TESTS_TO_RUN = ['tests/hospital_simulation.test.js', 'tests/nuclear_load.test.js'];
const ITERATIONS = 3;
const REPORT_FILE = path.join(__dirname, '../../client/public/simulation_report.txt'); // Save to public or temp

async function runCommand(command, args) {
    return new Promise((resolve) => {
        const proc = spawn(command, args, { stdio: 'pipe', shell: true });
        let output = '';

        proc.stdout.on('data', (data) => {
            process.stdout.write(data);
            output += data.toString();
        });

        proc.stderr.on('data', (data) => {
            process.stderr.write(data);
            output += data.toString();
        });

        proc.on('close', (code) => {
            resolve({ code, output });
        });
    });
}

async function main() {
    console.log('☢️ STARTING UI & SYSTEM NUCLEAR SIMULATION SUITE ☢️');
    console.log(`Target: ${ITERATIONS} Iterations`);
    console.log(`Tests: ${TESTS_TO_RUN.join(', ')}`);

    let summary = `NUCLEAR SIMULATION REPORT\nDate: ${new Date().toISOString()}\n\n`;
    let items = [];

    for (let i = 1; i <= ITERATIONS; i++) {
        console.log(`\n\n--- ITERATION ${i}/${ITERATIONS} ---`);
        const startTime = Date.now();

        // Run Jest
        // Using npx jest directly
        const { code, output } = await runCommand('npx', ['jest', ...TESTS_TO_RUN, '--detectOpenHandles', '--forceExit']);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const status = code === 0 ? '✅ PASSED' : '❌ FAILED';

        console.log(`Iteration ${i} finished in ${duration}s with status: ${status}`);

        items.push({
            iteration: i,
            status,
            duration,
            details: code === 0 ? 'All tests passed' : 'Some tests failed'
        });

        summary += `Iteration ${i}: ${status} (${duration}s)\n`;
        if (code !== 0) {
            summary += `Error Output Snippet:\n${output.slice(-500)}\n`;
        }
    }

    const passed = items.filter(i => i.status.includes('PASSED')).length;
    summary += `\n\nSUMMARY: ${passed}/${ITERATIONS} Runs Passed.`;

    console.log('\n\n--- SUITE COMPLETE ---');
    console.log(`Results: ${passed}/${ITERATIONS} Passed`);

    fs.writeFileSync('simulation_report_latest.json', JSON.stringify(items, null, 2));
    fs.writeFileSync('simulation_report_summary.txt', summary);
}

main();
