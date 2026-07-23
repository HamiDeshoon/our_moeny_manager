const fs = require('fs');
let content = fs.readFileSync('src/utils/exporter.ts', 'utf8');

// Remove SettlementSummary import
content = content.replace(/SettlementSummary,\s*/g, '');
content = content.replace(/HouseholdSummary,\s*/g, '');

content = content.replace(/,\s*summary:\s*SettlementSummary/g, '');
content = content.replace(/,\s*summary:\s*any/g, '');

content = content.replace(/partnerAShare:\s*tx\.partnerAShare,/g, '');
content = content.replace(/partnerBShare:\s*tx\.partnerBShare,/g, '');
content = content.replace(/splitType:\s*tx\.splitType,/g, '');

// Also clean up any `summary` usage in export function
content = content.replace(/\s*const showSettlement = !settings\.noSettlementsMode;[\s\S]*?\n\n/g, '');

fs.writeFileSync('src/utils/exporter.ts', content);
