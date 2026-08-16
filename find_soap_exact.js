const fs = require('fs');
try {
    const content = fs.readFileSync('./server/controllers/clinicalController.js', 'utf8');
    const lines = content.split('\n');
    let startLine = -1;
    let endLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const createSOAPNote =')) {
            startLine = i + 1;
        }
        if (startLine !== -1 && lines[i].includes('ResponseHandler.success(res, result.rows[0]')) {
            endLine = i + 2; // Capture until closing brace
            break;
        }
    }
    console.log(`Lines: ${startLine} to ${endLine}`);
    for (let i = startLine - 1; i < endLine; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
} catch (e) {
    console.error(e);
}
