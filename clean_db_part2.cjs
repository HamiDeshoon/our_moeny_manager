const fs = require('fs');

let content = fs.readFileSync('backend/db.ts', 'utf8');

// replace calculateSettlementSummary all the way to getSettlements
const newFunc = `  // --- HOUSEHOLD SUMMARY ---
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
  }`;

content = content.replace(/\/\/ --- SETTLEMENTS \("Who Paid \/ Who Owes" Math\) ---[\s\S]*?(?=batchAddTransactions)/, newFunc + '\n  ');

// getSettlements(): Settlement[] { }
content = content.replace(/getSettlements\(\): Settlement\[\]\s*\{\s*\}/, '');

// noSettlementsMode
content = content.replace(/\s*noSettlementsMode: true,\n/g, '');

// partnerAShare and partnerBShare
content = content.replace(/\s*partnerAShare:.*?,\n/g, '');
content = content.replace(/\s*partnerBShare:.*?,\n/g, '');
content = content.replace(/\s*updated\.splitType = 'PAYER_ALL';\n/g, '');
content = content.replace(/\s*updated\.partnerAShare = .*?;\n/g, '');
content = content.replace(/\s*updated\.partnerBShare = .*?;\n/g, '');
content = content.replace(/\s*splitType: 'PAYER_ALL' as const,\n/g, '');
content = content.replace(/\s*splitType: 'PAYER_ALL',\n/g, '');
content = content.replace(/\s*const partnerAShare = .*?;\n/g, '');
content = content.replace(/\s*const partnerBShare = .*?;\n/g, '');

// remove defaultSplitType if any
content = content.replace(/\s*defaultSplitType: 'PAYER_ALL',\n/g, '');

fs.writeFileSync('backend/db.ts', content);
