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
      opalsPerCavern: toNumberArray(sub(holes, 7)),
      gemShopLevels: toNumberArray(sub(holes, 23)),
      studyLevels: toNumberArray(sub(holes, 26)),
      studyProgress: toNumberArray(sub(holes, 27)),
      activeStudy: toNumber(sub(holes, 11)[61], -1),
      wishLevels: toNumberArray(sub(holes, 21)),
      wishesAvailable: toNumber(sub(holes, 11)[25]),
      layersDestroyed: [1, 3, 5, 7].map((i) => toNumber(sub(holes, 11)[i])),
      jarCollectibleLevels: toNumberArray(sub(holes, 24)).slice(0, 40),
      jarTypesUnlocked: Math.round(toNumber(sub(holes, 11)[37])),
    },
  };
  return AccountSchema.parse(account);
};
