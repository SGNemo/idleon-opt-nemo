// Builds data/<gameVersion>/{meta,minehead,sneaking,hole,sushi}.json from the Toolbox website-data tables.
// The Toolbox tables are used as a data SOURCE only (numbers/names generated from the game); no code is reused.
//
// Usage: npm run data:update -- [--game-version 143] [--sha <toolbox commit>]
//   default game version: serverVars.GameVERSION of fixtures/save.json, else required via flag
//   default sha: HEAD of Morta1/IdleonToolbox
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GameDataSchema } from '../src/data/schemas';

const REPO = 'Morta1/IdleonToolbox';
const FILES = ['shared-data', 'research', 'holesInfo', 'randomList'] as const;

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const sha =
  flag('sha') ?? execFileSync('git', ['ls-remote', `https://github.com/${REPO}`, 'HEAD'], { encoding: 'utf8' }).split(/\s/)[0];

const versionFromFixture = (): number | undefined => {
  try {
    const save = JSON.parse(readFileSync('fixtures/save.json', 'utf8'));
    const v = (save.data ?? save).servervars ?? (save.data ?? save).serverVars;
    return typeof v?.GameVERSION === 'number' ? v.GameVERSION : undefined;
  } catch {
    return undefined;
  }
};
const gameVersion = Number(flag('game-version') ?? versionFromFixture());
if (!Number.isFinite(gameVersion)) throw new Error('Pass --game-version <n> (no fixtures/save.json with servervars.GameVERSION found)');

const cacheDir = join('.cache', 'toolbox', sha);
mkdirSync(cacheDir, { recursive: true });
const load = async (name: string): Promise<any> => {
  const path = join(cacheDir, `${name}.json`);
  if (!existsSync(path)) {
    const url = `https://raw.githubusercontent.com/${REPO}/${sha}/data/website-data/${name}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(path, 'utf8'));
};

const num = (v: unknown): number => Number(v);
const nums = (v: unknown[]): number[] => v.map(num);

async function main(): Promise<void> {
const [shared, research, holesInfo, randomList] = await Promise.all(FILES.map(load));

// ---- Minehead. Source names are misleading: baseCost = max level, levelReq = effect per level, exponent = cost growth.
const mineheadSrc = shared.mineheadUpgrades as any[];
const tables = shared.gameTables.mineheadUpgradeTables;
const oppNamePool: string[] = research[11];
const oppNameIdx: string[] = research[10];
const vault = shared.upgradeVault as any[];
const minehead = {
  upgrades: mineheadSrc.map((u, index) => ({
    index,
    name: u.name,
    maxLevel: num(u.baseCost),
    effectPerLevel: num(u.levelReq),
    costExponent: num(u.exponent),
    description: u.description ?? '',
  })),
  multiplierTable: nums(tables['12']),
  additiveTable: nums(tables['17']),
  gridSizes: (research[9] as string[]).map((s) => s.split(',').map(Number) as [number, number]),
  opponents: oppNameIdx.map((nameIdx, index) => ({
    index,
    name: oppNamePool[Number(nameIdx)] ?? '',
    ordinal: research[15][index] ?? '',
    title: research[16][index] ?? '',
    bonusValue: num(research[20][index]),
    bonusDescription: research[19][index] ?? '',
  })),
  glimbo: (research[27] as string[]).map((item, index) => {
    const vaultIndex = num(research[26][index]);
    return {
      index,
      item,
      costBase: num(research[28][index]),
      vaultIndex,
      vaultName: vault[vaultIndex]?.name ?? '',
      vaultBaseMaxLevel: num(vault[vaultIndex]?.maxLevel),
      gridBonusApplies: research[29][index] === '1',
    };
  }),
};

// ---- Sneaking
const info = shared.ninjaExtraInfo as string[][];
const gt = shared.gameTables;
const floorCount = info[3].length;
const sneaking = {
  upgrades: (shared.ninjaUpgrades as any[]).map((u, index) => ({
    index,
    name: u.name,
    modifier: num(u.modifier),
    prerequisite: num(u.x9),
    costParams: { x7: num(u.x7), x8: num(u.x8) },
    description: u.description ?? '',
  })),
  knowledgeRoot: gt.sneakingKnowledgeRoot.root,
  masteryPrerequisites: gt.sneakingMasteryPrereqs,
  masteryDrops: gt.sneakingMasteryDrops,
  floors: {
    baseDoorMaxHp: nums(info[3]),
    baseDifficulty: nums(info[9]),
    doorHpScale: nums(info[10]),
    difficultyScale: nums(info[11]),
    dropLists: info.slice(12, 12 + floorCount),
  },
  emporium: {
    displayOrder: nums(info[24]),
    upgrades: (shared.jadeUpgrades as any[]).map((u, index) => ({
      index,
      name: u.name,
      x1: num(u.x1),
      x2: num(u.x2),
      x3: num(u.x3),
      description: u.description ?? '',
    })),
  },
  equipment: Object.fromEntries(
    Object.entries(shared.ninjaEquipment as Record<string, any>).map(([k, e]) => [
      k,
      { rawName: e.rawName, type: e.type, subType: e.subType, name: e.name, x3: e.x3, x5: e.x5 },
    ]),
  ),
  pristineCharms: (shared.pristineCharms as any[]).map((c) => ({ rawName: c.rawName, name: c.name, x3: num(c.x3), bonus: c.bonus })),
  masteryBonuses: randomList[101],
  gemstoneDescriptions: randomList[102],
};

// ---- Hole (raw for now)
const hole = {
  holesInfo,
  buildings: shared.holesBuildings,
  cosmoUpgrades: shared.cosmoUpgrades,
  lampWishes: shared.lampWishes,
  fountainUpgrades: shared.holeFountUpg,
};

const sushi = {
  names: research[30],
  restOfGameValues: nums(research[37]),
  restOfGameDescriptions: research[36],
};

const meta = {
  gameVersion,
  source: `https://github.com/${REPO}`,
  sourceCommit: sha,
  fetchedAt: new Date().toISOString(),
  note: 'Data version is the version this set is intended for; the source does not state its own game version. Verify against a save of that version.',
};

const data = GameDataSchema.parse({ meta, minehead, sneaking, hole, sushi });

const outDir = join('data', String(gameVersion));
mkdirSync(outDir, { recursive: true });
for (const [name, value] of Object.entries(data)) writeFileSync(join(outDir, `${name}.json`), JSON.stringify(value, null, 1) + '\n');

// Version index for the app.
const versions = existsSync('data/versions.json') ? (JSON.parse(readFileSync('data/versions.json', 'utf8')) as number[]) : [];
writeFileSync('data/versions.json', JSON.stringify([...new Set([...versions, gameVersion])].sort((a, b) => a - b)) + '\n');
console.log(`wrote ${outDir} from ${REPO}@${sha.slice(0, 7)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
