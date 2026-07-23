const fs = require('fs');

let content = fs.readFileSync('src/types.ts', 'utf8');

// Remove SplitType
content = content.replace(/export type SplitType.*?\n/, '');
// Remove SETTLEMENT from TransactionType
content = content.replace(/ \| 'SETTLEMENT'/g, '');
// Remove splitType, partnerAShare, partnerBShare from Transaction
content = content.replace(/\s*splitType: SplitType;\n/g, '');
content = content.replace(/\s*\/\/ Details for non-equal.*?\n/g, '');
content = content.replace(/\s*partnerAShare: number;\n/g, '');
content = content.replace(/\s*partnerBShare: number;\n/g, '');
// Remove Settlement interface block
content = content.replace(/export interface Settlement \{[\s\S]*?\n\}\n/g, '');
// Remove SettlementSummary interface block
content = content.replace(/export interface SettlementSummary \{[\s\S]*?\n\}\n/g, '');
// Remove splitType from others
content = content.replace(/\s*defaultSplitType: SplitType;\n/g, '');
content = content.replace(/\s*noSettlementsMode\?: boolean;.*?\n/g, '');

fs.writeFileSync('src/types.ts', content);
