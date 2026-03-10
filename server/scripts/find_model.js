const fs = require('fs');
const path = require('path');
const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.trim().startsWith('model patients {') || l.trim().startsWith('model patients')) {
      console.log(`FOUND: Line ${i + 1}: ${l}`);
  }
});
