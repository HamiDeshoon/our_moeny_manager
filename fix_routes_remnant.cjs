const fs = require('fs');
let content = fs.readFileSync('backend/routes.ts', 'utf8');

// The remnant starts near "const settlement = db.recordSettlement("
const remnantRegex = /\s*\}\s*const settlement = db\.recordSettlement\([\s\S]*?\}\s*\n\}\);\n/g;
content = content.replace(remnantRegex, '');

// Also fix getHouseholdSummary where it references `summary.settlementText`
content = content.replace(/settlementStatus: summary\.settlementText,/g, '');

fs.writeFileSync('backend/routes.ts', content);
