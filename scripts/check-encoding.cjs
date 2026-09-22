const fs = require('fs');
const b = fs.readFileSync('D:/korean proxy shopping/src/auth.config.ts');
console.log('First 2 bytes:', b[0].toString(16), b[1].toString(16));
console.log('Length:', b.length);
console.log('First 100:', b.slice(0, 100).toString('utf8'));
