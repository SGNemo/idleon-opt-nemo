// Prints what the parser reads from a real save. Usage: npm run summary
import { readFileSync } from 'node:fs';
import { parseSave } from '../src/core';

const file = process.argv[2] ?? 'fixtures/save.json';
const a = parseSave(readFileSync(file, 'utf8'));
const short = (arr: number[], n = 8) => `[${arr.slice(0, n).join(', ')}${arr.length > n ? ', …' : ''}] (${arr.length})`;
console.log('gameVersion', a.gameVersion, '| serverVars', a.serverVars);
console.log('missing keys:', Object.entries(a.present).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'none');
console.log('characters:', a.characters.map((c) => `${c.name}(class ${c.classId}, lv ${c.level})`).join('; '));
console.log('minehead:', { ...a.minehead, upgradeLevels: short(a.minehead.upgradeLevels), glimboTrades: short(a.minehead.glimboTrades) });
console.log('sneaking:', { ...a.sneaking, doorHp: short(a.sneaking.doorHp), upgradeLevels: short(a.sneaking.upgradeLevels), ninjas: a.sneaking.ninjas.map((n) => n.floor).join(',') });
console.log('hole:', { villagerLevels: short(a.hole.villagerLevels), opalsInvested: short(a.hole.opalsInvested) });
