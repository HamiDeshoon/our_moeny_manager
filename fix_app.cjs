const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace imports
content = content.replace(/SettlementSummary/g, 'HouseholdSummary');

// Replace state
content = content.replace(/const \[summary, setSummary\] = useState<HouseholdSummary \| null>\(null\);/, 'const [summary, setSummary] = useState<HouseholdSummary | null>(null);');

// Replace fetch
content = content.replace(/api\.getSettlementSummary/g, 'api.getHouseholdSummary');

// Remove handleConfirmSettleUp
content = content.replace(/\s*\/\/ Settlement Handler[\s\S]*?await loadData\(\);\n  };\n/, '');

// Remove SettleUpModal and its state
content = content.replace(/\s*const \[isSettleUpOpen, setIsSettleUpOpen\] = useState\(false\);\n/, '');
content = content.replace(/\s*<SettleUpModal[\s\S]*?\/>\n/, '');

// Fix SummaryCards invocation
content = content.replace(/\s*onOpenSettleUp=\{[\s\S]*?\}/, '');

fs.writeFileSync('src/App.tsx', content);
