const fs = require('fs');

let content = fs.readFileSync('backend/db.ts', 'utf8');

// replace noSettlementsMode
content = content.replace(/\s*noSettlementsMode: true,\n/, '');

// line 334 splitType
content = content.replace(/\s*splitType: t\.splitType \|\| 'PAYER_ALL',\n/g, '');

// line 436 partnerAShare
content = content.replace(/\s*partnerAShare,\n/g, '');
content = content.replace(/\s*partnerBShare,\n/g, '');

fs.writeFileSync('backend/db.ts', content);
