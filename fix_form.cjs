const fs = require('fs');
let content = fs.readFileSync('src/components/TransactionForm.tsx', 'utf8');

content = content.replace(/SplitType,\s*/g, '');

content = content.replace(/\s*splitType: 'PAYER_ALL',/g, '');
content = content.replace(/\s*partnerAShare: 0,/g, '');
content = content.replace(/\s*partnerBShare: 0,/g, '');

fs.writeFileSync('src/components/TransactionForm.tsx', content);
