const fs = require('fs');
const content = fs.readFileSync('./logs/all.log', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(-100).join('\n'));
