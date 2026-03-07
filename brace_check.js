
const fs = require('fs');
const content = fs.readFileSync('/home/heidless/projects/heidless-ai/antigravity/live/PromptTool/src/app/generate/page.tsx', 'utf8');

let balance = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let inMultiComment = false;

const lines = content.split('\n');
const targets = [212, 980, 990, 1072, 1156, 1881, 5068, 5085];

lines.forEach((line, idx) => {
    inComment = false; // reset per line for // comments
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (inMultiComment) {
            if (char === '*' && nextChar === '/') {
                inMultiComment = false;
                j++;
            }
            continue;
        }

        if (inString) {
            if (char === '\\') { j++; continue; }
            if (char === stringChar) inString = false;
            continue;
        }

        if (char === '/' && nextChar === '/') {
            inComment = true;
            break;
        }
        if (char === '/' && nextChar === '*') {
            inMultiComment = true;
            j++;
            continue;
        }

        if (char === '"' || char === "'" || char === "`") {
            inString = true;
            stringChar = char;
            continue;
        }

        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (targets.includes(idx + 1)) {
        console.log(`${idx + 1}: ${balance}`);
    }
});
console.log('Final balance:', balance);
