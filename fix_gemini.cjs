const fs = require('fs');
let content = fs.readFileSync('backend/geminiService.ts', 'utf8');

// replace splitType in schema and prompt
content = content.replace(/and splitType to "PAYER_ALL"\./g, '.');
content = content.replace(/\s*splitType: \{ type: Type\.STRING, description: 'EQUAL, PAYER_ALL, or OTHER_ALL' \},/g, '');
content = content.replace(/\s*splitType: \{ type: Type\.STRING, description: 'PAYER_ALL, EQUAL, or OTHER_ALL' \},/g, '');
content = content.replace(/, 'splitType'/g, '');

content = content.replace(/and 'splitType' to 'PAYER_ALL'\./g, '.');
content = content.replace(/\s*- Default splitType to 'PAYER_ALL'.*?\n/g, '');

fs.writeFileSync('backend/geminiService.ts', content);
