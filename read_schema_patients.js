const fs = require('fs');
const content = fs.readFileSync('./server/prisma/schema.prisma', 'utf8');
const match = content.match(/model patients \{[\s\S]*?\}/);
if (match) {
    console.log(match[0]);
} else {
    console.log('model patients not found');
}
