const fs = require('fs');
const pdf = require('pdf-parse');

const path = require('path');

const projectRoot = path.resolve(__dirname, '../../');
console.log('Scanning directory:', projectRoot);

const files = fs.readdirSync(projectRoot);
const pdfFile = files.find(f => f.toLowerCase().endsWith('.pdf'));

if (!pdfFile) {
    console.error('❌ No PDF found in root!');
    process.exit(1);
}

const pdfPath = path.join(projectRoot, pdfFile);
console.log('✅ Found PDF:', pdfPath);

const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    console.log('📄 PDF INFO:');
    console.log('Pages:', data.numpages);
    console.log('Title:', data.info.Title);
    
    console.log('\n📜 TEXT EXTRACT (First 3000 chars):');
    console.log(data.text.substring(0, 3000));
    
    console.log('\n🔍 KEYWORD SEARCH:');
    const keywords = ['Port', 'ACK', 'Handshake', 'MSH', 'VT', 'FS', '0x0b', '0x1c', 'connected'];
    keywords.forEach(kw => {
        const index = data.text.indexOf(kw);
        if (index !== -1) {
            console.log(`✅ Found "${kw}": ...${data.text.substring(index - 50, index + 100).replace(/\n/g, ' ')}...`);
        } else {
            console.log(`❌ Not found: "${kw}"`);
        }
    });

    // Check for connection flow description
    if (data.text.toLowerCase().includes('client')) console.log('✅ Found "Client" mode reference');
    if (data.text.toLowerCase().includes('server')) console.log('✅ Found "Server" mode reference');

}).catch(err => {
    console.error('Error reading PDF:', err);
});
