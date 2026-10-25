// Prints the task list for fixtures/save.json. Usage: npm run tasks
import { readFileSync } from 'node:fs';
import { buildTasks, computeFacts, parseSave } from '../src/core';
import { loadGameData, loadRules } from '../src/data/load-node';

const account = parseSave(readFileSync(process.argv[2] ?? 'fixtures/save.json', 'utf8'));
const data = loadGameData(account.gameVersion ?? 143);
const facts = computeFacts(account, data);
for (const t of buildTasks(loadRules(), facts)) {
  const prog = t.progress ? ` [${t.progress.current}/${t.progress.max}]` : '';
  console.log(`W${t.world} ${t.urgent ? '!' : ' '} ${t.title}${prog}  (${t.effort}, ${t.status})\n      ${t.reason}`);
}
console.log('\nfacts:', facts);
