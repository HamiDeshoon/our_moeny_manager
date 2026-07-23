const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/import \{ SettleUpModal \} from '\.\/components\/SettleUpModal';\n/, '');
fs.writeFileSync('src/App.tsx', content);
