const fs = require('fs');

let content = fs.readFileSync('src/components/CSVImportModal.tsx', 'utf8');

content = content.replace(/,\s*SplitType/g, '');
content = content.replace(/\s*splitType: SplitType;\n/g, '');
content = content.replace(/\s*const splitType: any = 'PAYER_ALL';\n/g, '');
content = content.replace(/\s*const splitType = 'PAYER_ALL';\n/g, '');
content = content.replace(/\s*const splitType: .*?\n/g, '');
content = content.replace(/\s*splitType,\n/g, '');

fs.writeFileSync('src/components/CSVImportModal.tsx', content);
