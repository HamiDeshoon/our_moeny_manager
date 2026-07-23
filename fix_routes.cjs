const fs = require('fs');

let content = fs.readFileSync('backend/routes.ts', 'utf8');

// Replace all calculateSettlementSummary with calculateHouseholdSummary
content = content.replace(/calculateSettlementSummary/g, 'calculateHouseholdSummary');
content = content.replace(/getSettlementSummary/g, 'getHouseholdSummary');

// Find and delete the POST /settlements/settle-up route
const startSettleUp = content.indexOf("apiRouter.post('/settlements/settle-up', (req, res) => {");
if (startSettleUp !== -1) {
  const endSettleUp = content.indexOf("});", startSettleUp) + 3;
  content = content.slice(0, startSettleUp) + content.slice(endSettleUp);
}

fs.writeFileSync('backend/routes.ts', content);
