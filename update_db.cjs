const fs = require('fs');
const dbFile = 'backend/db.ts';

let content = fs.readFileSync(dbFile, 'utf8');

content = content.replace(/amount:\s*(\d+),/g, (match, p1) => `amount: ${parseInt(p1) / 1000},`);
content = content.replace(/monthlyLimit:\s*(\d+)/g, (match, p1) => `monthlyLimit: ${parseInt(p1) / 1000}`);
content = content.replace(/partnerAShare:\s*(\d+),/g, (match, p1) => `partnerAShare: ${parseInt(p1) / 1000},`);
content = content.replace(/partnerBShare:\s*(\d+),/g, (match, p1) => `partnerBShare: ${parseInt(p1) / 1000},`);

// we should also look at other hardcoded values like 10000000 -> 10000
content = content.replace(/10000000/g, '10000');
content = content.replace(/1\.25, 10000\)/g, '1.25, 10000)'); 

fs.writeFileSync(dbFile, content);
