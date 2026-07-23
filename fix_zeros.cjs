const fs = require('fs');

let content = fs.readFileSync('backend/db.ts', 'utf8');

// multiply amounts by 1000
content = content.replace(/amount:\s*(\d+)/g, (match, p1) => `amount: ${parseInt(p1) * 1000}`);
content = content.replace(/monthlyLimit:\s*(\d+)/g, (match, p1) => `monthlyLimit: ${parseInt(p1) * 1000}`);

// revert hardcoded 10000 limit in Effective Income calculation
content = content.replace(/1\.25, 10000\)/g, '1.25, 10000000)'); 

fs.writeFileSync('backend/db.ts', content);
