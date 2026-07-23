const fs = require('fs');

let content = fs.readFileSync('backend/geminiService.ts', 'utf8');

// replace settlementStatus in LedgerData type
content = content.replace(/\s*settlementStatus: string;\n/, '');

// replace settlementStatus in prompt
content = content.replace(/\s*- Balance Settlement Status: "\$\{ledgerData\.settlementStatus\}"\n/, '\n');

fs.writeFileSync('backend/geminiService.ts', content);
