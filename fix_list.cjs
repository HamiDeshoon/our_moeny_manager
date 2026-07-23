const fs = require('fs');

let content = fs.readFileSync('src/components/TransactionList.tsx', 'utf8');

// Remove share breakdown
content = content.replace(/<div className="text-\[10px\] text-slate-500 font-medium">[\s\S]*?<\/div>/, '');
content = content.replace(/tx\.type === 'SETTLEMENT'/g, "tx.type === 'EXPENSE'"); // replace settlement check
content = content.replace(/<option value="SETTLEMENT">Settlements<\/option>/, '');

fs.writeFileSync('src/components/TransactionList.tsx', content);
