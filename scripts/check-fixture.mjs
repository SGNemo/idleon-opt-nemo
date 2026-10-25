// Heuristic secret scan for a save file before it goes into fixtures/.
// Usage: node scripts/check-fixture.mjs fixtures/save.json
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/check-fixture.mjs <save.json>');
  process.exit(2);
}

const SUSPICIOUS_KEYS = /token|password|passwd|secret(?!keeper)|api[-_]?key|refresh_?token|idtoken|^auth|^e-?mail$|^uid$|session_?id|cookie/i;
const PATTERNS = [
  ['email', /[\w.+-]+@[\w-]+\.[\w.-]+/],
  ['jwt', /eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/],
  ['long-token', /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9_\-.=+/]{40,}$/],
  ['url-credentials', /https?:\/\/[^\s/]*:[^\s/]*@/],
];

const findings = [];
const walk = (value, path, depth = 0) => {
  if (depth > 12) return;
  if (typeof value === 'string') {
    for (const [name, re] of PATTERNS) if (re.test(value)) findings.push(`${name} at ${path}: ${value.slice(0, 24)}…`);
    // Many save values are JSON strings in JSON; scan inside them too.
    if (/^[[{]/.test(value)) {
      try { walk(JSON.parse(value), `${path}(json)`, depth + 1); } catch { /* not JSON */ }
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, depth + 1));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (SUSPICIOUS_KEYS.test(k)) findings.push(`suspicious key ${path}.${k}`);
      walk(v, `${path}.${k}`, depth + 1);
    }
  }
};

walk(JSON.parse(readFileSync(file, 'utf8')), '$');
if (findings.length) {
  console.log(`${findings.length} possible secret(s):`);
  findings.slice(0, 50).forEach((f) => console.log(' -', f));
  process.exit(1);
}
console.log('no obvious secrets found');
