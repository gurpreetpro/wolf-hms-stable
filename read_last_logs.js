const fs = require('fs');
try {
    const content = fs.readFileSync('./server/error.log', 'utf8');
    const lines = content.split('\n');
    console.log(lines.slice(-150).join('\n'));
} catch (e) {
    console.error(e);
}
