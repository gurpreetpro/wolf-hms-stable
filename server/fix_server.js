const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');
const validEnd = 'module.exports = { app, pool, io };';
const index = content.lastIndexOf(validEnd);
if (index !== -1) {
    const newContent = content.substring(0, index + validEnd.length); // Keep the export line
    fs.writeFileSync('server.js', newContent);
    console.log('Fixed server.js');
} else {
    console.log('Could not find export line');
}
