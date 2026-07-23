const fs = require('fs');

let content = fs.readFileSync('backend/geminiService.ts', 'utf8');

// Replace 1000 with 10 for Rials to Tomans conversion
content = content.replace(/DIVIDING BY 1000 \(strip 3 trailing zeros\)\. \(e\.g\. "1,000,000 ریال" = 1000 تومان\)/g, 'DIVIDING BY 10 (strip 1 trailing zero). (e.g. "1,000,000 ریال" = 100,000 تومان)');
content = content.replace(/ALWAYS strip 3 zeros when converting Rials to Tomans/g, 'ALWAYS strip 1 zero when converting Rials to Tomans');

content = content.replace(/STRIP EXACTLY THREE TRAILING ZEROS from the Rial amount \(DIVIDE BY 1000\)\./g, 'STRIP EXACTLY ONE TRAILING ZERO from the Rial amount (DIVIDE BY 10).');
content = content.replace(/1,000,000 Rials \(ریال\) ➔ 1,000 Tomans \(تومان\) \[1000000 \/ 1000 = 1000\]/g, '1,000,000 Rials (ریال) ➔ 100,000 Tomans (تومان) [1000000 / 10 = 100000]');
content = content.replace(/2,500,000 Rials \(ریال\) ➔ 2,500 Tomans \(تومان\) \[2500000 \/ 1000 = 2500\]/g, '2,500,000 Rials (ریال) ➔ 250,000 Tomans (تومان) [2500000 / 10 = 250000]');
content = content.replace(/500,000 Rials \(ریال\)   ➔ 500 Tomans \(تومان\)  \[500000 \/ 1000 = 500\]/g, '500,000 Rials (ریال)   ➔ 50,000 Tomans (تومان)  [500000 / 10 = 50000]');
content = content.replace(/10,000,000 Rials \(ریال\) ➔ 10,000 Tomans \(تومان\) \[10000000 \/ 1000 = 10000\]/g, '10,000,000 Rials (ریال) ➔ 1,000,000 Tomans (تومان) [10000000 / 10 = 1000000]');

content = content.replace(/DO NOT divide by 10! You must strip three zeros\./g, 'DO NOT strip 3 zeros! You must divide by 10 (strip 1 zero).');
content = content.replace(/If the receipt explicitly states "هزار تومان" or "Thousand Toman", use the printed number\./g, 'If the receipt explicitly states "هزار تومان", multiply by 1000. If it says "تومان", use the exact printed number.');
content = content.replace(/If the receipt is a standard POS slip \(کارتخوان\) in Rials or says "ریال", divide by 1000\./g, 'If the receipt is a standard POS slip (کارتخوان) in Rials or says "ریال", divide by 10.');

// spreadsheet import
content = content.replace(/IF input values are in Rials or end in extra trailing zeros, STRIP 3 ZEROS \(DIVIDE BY 1000\) to output clean TOMANS \(e\.g\., 1,200,000 Rials -> 1,200 Tomans\)/g, 'IF input values are in Rials or end in an extra trailing zero, DIVIDE BY 10 to output clean TOMANS (e.g., 1,200,000 Rials -> 120,000 Tomans)');

fs.writeFileSync('backend/geminiService.ts', content);
