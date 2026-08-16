const fs = require('fs');
const lines = fs.readFileSync('server/prisma/schema.prisma', 'utf8').split(/?
/);

// Find the users model boundaries
let inUsers = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('model users {')) {
    inUsers = true;
    console.log('USERS START:', i);
  }
  if (inUsers && lines[i].trim() === '}' && i > 1000) {
    console.log('USERS END:', i);
    // Print the last 25 lines of the model
    for (let j = i - 25; j <= i + 5; j++) {
      if (j < lines.length) console.log(j + ': ' + lines[j]);
    }
    break;
  }
}
