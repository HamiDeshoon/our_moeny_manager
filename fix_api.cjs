const fs = require('fs');
let content = fs.readFileSync('src/services/api.ts', 'utf8');

// Replace /settlements/summary
content = content.replace(
  /getSettlementSummary: \(month\?: string\) =>\s*fetchJSON<SettlementSummary>\(\`\/settlements\/summary\$\{month \? \`\?month=\$\{month\}\` : ''\}\`\),/,
  `getHouseholdSummary: (month?: string) =>
    fetchJSON<HouseholdSummary>(\`/household/summary\${month ? \`?month=\${month}\` : ''}\`),`
);

content = content.replace(/SettlementSummary/g, 'HouseholdSummary');

// Remove settleUp
content = content.replace(/\s*settleUp:[\s\S]*?fetchJSON<any>\('\/settlements\/settle-up'[\s\S]*?\}\),/, '');

fs.writeFileSync('src/services/api.ts', content);
