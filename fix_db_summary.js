const fs = require('fs');
let content = fs.readFileSync('backend/db.ts', 'utf8');

const replacement = `
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

  // --- IMPORT EXPORT ---
`;

// regex replace from `  // --- SETTLEMENTS ("Who Paid / Who Owes" Math) ---` to `  // --- IMPORT EXPORT ---`
content = content.replace(/\s*\/\/\s*---\s*SETTLEMENTS[\s\S]*?\/\/\s*---\s*IMPORT EXPORT\s*---/, replacement);

fs.writeFileSync('backend/db.ts', content);
