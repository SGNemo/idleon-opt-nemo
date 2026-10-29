import { Account, AccountSchema } from '../model/account';
import { toArray, toNumber, toNumberArray } from './json';
import { computeMissionProgress } from './menagerie-progress';
import { uniqueSushiCount } from '../formulas/sushi';
import { normalizeSave, readKey, readServerVars, RawSave } from './normalize';

const TRACKED_KEYS = ['Research', 'Ninja', 'Holes', 'Sushi', 'AchieveReg', 'Spelunk', 'OptLacc', 'playerNames'];

const parseCharacters = (save: RawSave): Account['characters'] => {
  const names = toArray(readKey(save, 'playerNames')) as string[];
  const countFromKeys = Object.keys(save).filter((k) => /^CharacterClass_\d+$/.test(k)).length;
  const count = Math.max(names.length, countFromKeys);
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    name: String(names[i] ?? `Char ${i}`),
    classId: toNumber(save[`CharacterClass_${i}`]),
    level: toNumber(toArray(readKey(save, `Lv0_${i}`))[0]),
  }));
};

/** Does any character inventory or the storage chest hold `rawName`? Order arrays and quantity arrays are parallel. */
const ownsItem = (save: RawSave, rawName: string, characterCount: number): boolean => {
  const holds = (names: unknown[], quantities: unknown[]): boolean => names.some((n, i) => n === rawName && toNumber(quantities[i]) > 0);
  for (let i = 0; i < characterCount; i++) {
    if (holds(toArray(readKey(save, `InventoryOrder_${i}`)), toArray(readKey(save, `ItemQTY_${i}`)))) return true;
  }
  return holds(toArray(readKey(save, 'ChestOrder')), toArray(readKey(save, 'ChestQuantity')));
};

/** Rows of the nested arrays the game exports either as arrays or as numeric-key objects. */
const rows = (value: unknown): unknown[][] => toArray(value).map((r) => toArray(r));

const sub = (arr: unknown, i: number): unknown[] => toArray(Array.isArray(arr) ? arr[i] : undefined);

/** Layout of the Ninja array: see docs/FORMULAS.md (save-key map). */
const NINJA = { doorHp: 100, jade: 102, upgrades: 103 };

export const parseSave = (input: string | object): Account => {
  const save = normalizeSave(input);
  const serverVars = readServerVars(save);
  const characters = parseCharacters(save);

  const research = readKey(save, 'Research');
  const mineState = sub(research, 7);
  const ninja = readKey(save, 'Ninja');
  const holes = readKey(save, 'Holes');
  const sushi = readKey(save, 'Sushi');
  const options = toArray(readKey(save, 'OptLacc'));
  const menagerie = readKey(save, 'Menagerie');
  const spelunk = readKey(save, 'Spelunk');
  const postOfficeOrders = rows(readKey(save, 'PostOfficeInfo0'));

  const account: Account = {
    gameVersion: serverVars['GameVERSION'] === undefined ? null : toNumber(serverVars['GameVERSION']),
    present: {
      ...Object.fromEntries(TRACKED_KEYS.map((k) => [k, save[k] !== undefined])),
      serverVars: Object.keys(serverVars).length > 0,
    },
    serverVars: {
      mineCost: Math.max(1, toNumber(serverVars['A_MineCost'], 1)),
      mineHp: Math.max(1, toNumber(serverVars['A_MineHP'], 1)),
    },
    characters,
    accountOptions: options,
    dailies: {
      ownsGlimmerwickCandle: ownsItem(save, 'Quest114', characters.length),
      arcaneLevels: toNumberArray(toArray(readKey(save, 'Arcane'))),
      compassLevels: toNumberArray(sub(readKey(save, 'Compass'), 0)),
      riftCurrent: toNumber(toArray(readKey(save, 'Rift'))[0]),
      guildTasks: rows(readKey(save, 'Guild')).slice(1).map((r) => ({ index: toNumber(r[0], -1), progress: toNumber(r[2]) })),
      postOfficeShipments: rows(readKey(save, 'PostOfficeInfo1')).map((r, i) => ({
        totalShipments: toNumber(r[0]),
        streak: toNumber(r[1]),
        shield: toNumber(r[2]),
        completedAnOrder: toNumber(postOfficeOrders[i]?.[2]) > 0,
      })),
    },
    minehead: {
      opponentsBeaten: toNumber(mineState[4]),
      currency: toNumber(mineState[5]),
      bestHit: toNumber(mineState[6]),
      dailyTriesLeft: toNumber(mineState[8]),
      upgradeLevels: toNumberArray(sub(research, 8)),
      glimboTrades: toNumberArray(sub(research, 12)),
    },
    sneaking: {
      doorHp: toNumberArray(sub(ninja, NINJA.doorHp)),
      upgradeLevels: toNumberArray(sub(ninja, NINJA.upgrades)),
      jadeCoins: toNumber(sub(ninja, NINJA.jade)[1]),
      jadeEmporiumUnlocks: String(sub(ninja, NINJA.jade)[9] ?? ''),
      selectedMastery: toNumber(options[231]),
      highestMastery: toNumber(options[232]),
      ninjas: characters.map((c) => ({ floor: toNumber(sub(ninja, c.index)[0]) })),
    },
    achievements: { registry: toNumberArray(toArray(readKey(save, 'AchieveReg'))), steam: toNumberArray(toArray(readKey(save, 'SteamAchieve'))) },
    sushi: { uniqueSushiTracking: toNumberArray(sub(sushi, 5)) },
    menagerie: {
      lumi: toNumber(sub(menagerie, 0)[0]),
      shells: toNumber(sub(menagerie, 0)[1]),
      rank: toNumber(sub(menagerie, 0)[2]),
      claims: toNumberArray(sub(menagerie, 1)),
      unlocksOwned: toNumberArray(sub(menagerie, 2)),
      boostLevels: toNumberArray(sub(menagerie, 3)),
      missionProgress: computeMissionProgress(save, characters.reduce((a, c) => a + c.level, 0), uniqueSushiCount(toNumberArray(sub(sushi, 5)), 200)),
      mineheadDoublersPlaced: toNumberArray(sub(spelunk, 51)),
      bundleDoublers: toNumber((readKey(save, 'BundlesReceived') as Record<string, unknown> | undefined)?.['ban_l']) === 1,
      bundleMissions: toNumber((readKey(save, 'BundlesReceived') as Record<string, unknown> | undefined)?.['ban_k']) === 1,
    },
    jelly: { obstructionsDefeated: toNumber(mineState[9]), operationsLeft: toNumber(mineState[10]) },
    hole: {
      villagerLevels: toNumberArray(sub(holes, 1)),
      villagerExp: toNumberArray(sub(holes, 2)),
      blindingLanternsUsed: toNumber(sub(holes, 11)[84]),
      opalsInvested: toNumberArray(sub(holes, 3)),
    },
  };
  return AccountSchema.parse(account);
};
