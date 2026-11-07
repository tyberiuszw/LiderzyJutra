const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', '.agents']);
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.prisma', '.env']);

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('.');
const patterns = [
  { name: 'password assignment', regex: /password\s*[:=]\s*['"`][^'"`\s]{4,}['"`]/i },
  { name: 'secret assignment', regex: /secret\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i },
  { name: 'api key assignment', regex: /api[_-]?key\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i },
  { name: 'bearer token', regex: /bearer\s+[a-zA-Z0-9\-._~+/]{20,}/i },
  { name: 'tyberiusz password', regex: /tyberiusz.*password/i }
];

let hits = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of patterns) {
      if (p.regex.test(line)) {
        // filter out schema definitions, test assertions or types
        hits.push({ file, lineNum: i + 1, type: p.name, text: line.trim() });
      }
    }
  }
}

console.log(JSON.stringify(hits, null, 2));
console.log('Total hits:', hits.length);
