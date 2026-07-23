const fs = require('fs');
const dbFile = 'backend/db.ts';

let content = fs.readFileSync(dbFile, 'utf8');

// Replace amounts in db.ts
content = content.replace(/amount:\s*(\d+)/g, (match, p1) => `amount: ${parseInt(p1) / 1000}`);
content = content.replace(/monthlyLimit:\s*(\d+)/g, (match, p1) => `monthlyLimit: ${parseInt(p1) / 1000}`);
content = content.replace(/partnerAShare:\s*(\d+)/g, (match, p1) => `partnerAShare: ${parseInt(p1) / 1000}`);
content = content.replace(/partnerBShare:\s*(\d+)/g, (match, p1) => `partnerBShare: ${parseInt(p1) / 1000}`);

fs.writeFileSync(dbFile, content);
