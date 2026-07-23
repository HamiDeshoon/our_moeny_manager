const fs = require('fs');

let content = fs.readFileSync('backend/db.ts', 'utf8');

// Remove types
content = content.replace(/Settlement,\s*/g, '');
content = content.replace(/SettlementSummary,\s*/g, '');

// Remove noSettlementsMode
content = content.replace(/\s*noSettlementsMode: true,\n/g, '');

// Remove splitType from record parsed txs
content = content.replace(/\s*splitType: 'PAYER_ALL' as const,\n/g, '');
content = content.replace(/\s*splitType: t\.splitType \|\| 'PAYER_ALL',\n/g, '');
content = content.replace(/\s*partnerAShare: .*?\n/g, '');
content = content.replace(/\s*partnerBShare: .*?\n/g, '');

// Remove extra settlements
content = content.replace(/\s*const monthSettlements = this\.data\.settlements[\s\S]*?}\n\s*}/g, '');
content = content.replace(/\s*this\.data\.settlements\.push\(newSettlements\);\n/g, '');
content = content.replace(/\s*return this\.data\.settlements;\n/g, '');
content = content.replace(/\s*const txs = this\.getTransactions\(monthFilter\)\.filter\(\(t\) => t\.type === 'EXPENSE'\);\n/g, "const txs = this.getTransactions(monthFilter).filter((t) => t.type === 'EXPENSE');\n");

// If it's returning '"SETTLEMENT"', let's see.
content = content.replace(/type: 'SETTLEMENT',/g, "type: 'EXPENSE',");

// Clean up calculateHouseholdSummary
const newFunc = `
  calculateHouseholdSummary(monthFilter?: string) {
    const txs = this.getTransactions(monthFilter).filter((t) => t.type === 'EXPENSE');
    const partnerA = this.data.settings.partnerA;
    const partnerB = this.data.settings.partnerB;

    let partnerATotalPaid = 0;
    let partnerBTotalPaid = 0;

    for (const t of txs) {
      const amount = Number(t.amount) || 0;
      if (t.paidBy === partnerA.id) {
        partnerATotalPaid += amount;
      } else if (t.paidBy === partnerB.id) {
        partnerBTotalPaid += amount;
      }
    }

    return {
      partnerATotalPaid: Math.round(partnerATotalPaid * 100) / 100,
      partnerBTotalPaid: Math.round(partnerBTotalPaid * 100) / 100,
    };
  }

  // --- IMPORT EXPORT ---`;

content = content.replace(/\s*calculateSettlementSummary[\s\S]*?\/\/\s*---\s*IMPORT EXPORT\s*---/, newFunc);

fs.writeFileSync('backend/db.ts', content);
