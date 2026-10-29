import { z } from 'zod';

const numArray = z.array(z.number());

export const AccountSchema = z.object({
  gameVersion: z.number().nullable(),
  /** Which top-level save keys were present (missing ones fall back to defaults). */
  present: z.record(z.boolean()),
  serverVars: z.object({
    /** Minehead cost / HP scaling, only effective for index > 9. */
    mineCost: z.number(),
    mineHp: z.number(),
  }),
  characters: z.array(
    z.object({
      index: z.number(),
      name: z.string(),
      classId: z.number(),
      level: z.number(),
    }),
  ),
  accountOptions: z.array(z.unknown()),
  minehead: z.object({
    opponentsBeaten: z.number(),
    currency: z.number(),
    bestHit: z.number(),
    dailyTriesLeft: z.number(),
    upgradeLevels: numArray,
    glimboTrades: numArray,
  }),
  sneaking: z.object({
    doorHp: numArray,
    upgradeLevels: numArray,
    jadeCoins: z.number(),
    /** Ninja[102][9]: letters of unlocked Jade Emporium upgrades (see NUMBER_TO_LETTER). */
    jadeEmporiumUnlocks: z.string(),
    /** Selected / highest Ninja Mastery (OptLacc 231 / 232). */
    selectedMastery: z.number(),
    highestMastery: z.number(),
    /** Per character: [floor, ...] as stored. */
    ninjas: z.array(z.object({ floor: z.number() })),
  }),
  achievements: z.object({
    /** AchieveReg: -1 = completed, otherwise the current progress counter. */
    registry: numArray,
    /** SteamAchieve: progress counters of Steam-linked entries. */
    steam: numArray,
  }),
  sushi: z.object({
    /** Sushi[5]: highest tier found per sushi type, -1 = undiscovered. */
    uniqueSushiTracking: numArray,
  }),
  menagerie: z.object({
    lumi: z.number(),
    shells: z.number(),
    rank: z.number(),
    /** Menagerie[1]: claims per mission. */
    claims: numArray,
    /** Menagerie[2]: unlock owned flags. */
    unlocksOwned: numArray,
    /** Menagerie[3]: boost levels. */
    boostLevels: numArray,
    /** Current value per mission (MenagerieStuff:MissionProg), null when it cannot be derived from the save. */
    missionProgress: z.array(z.number().nullable()),
    /** Spelunk[51]: Minehead upgrade ids that carry a Menagerie doubler. */
    mineheadDoublersPlaced: numArray,
    /** BundlesReceived.ban_l: grants 3 extra doublers per kind. */
    bundleDoublers: z.boolean(),
    /** BundlesReceived.ban_k: grants 3 extra missions. */
    bundleMissions: z.boolean(),
  }),
  jelly: z.object({
    /** Research[7][9]: Jelly Operator obstructions defeated. */
    obstructionsDefeated: z.number(),
    /** Research[7][10]: operations left today. */
    operationsLeft: z.number(),
  }),
  hole: z.object({
    villagerLevels: numArray,
    villagerExp: numArray,
    /** Holes[11][84]: Blinding Lanterns used today (cap 12, resets daily). */
    blindingLanternsUsed: z.number(),
    opalsInvested: numArray,
    /** Holes[7]: opals found per cavern. */
    opalsPerCavern: numArray,
    /** Holes[23]: per-villager gem shop level (parallel villagers). */
    gemShopLevels: numArray,
    /** Holes[26]: study levels. */
    studyLevels: numArray,
    /** Holes[27]: study progress. */
    studyProgress: numArray,
    /** Holes[11][61]: study currently running (-1 = none). */
    activeStudy: z.number(),
    /** Holes[21]: lamp wish levels bought. */
    wishLevels: numArray,
    /** Holes[11][25]: wishes available to spend. */
    wishesAvailable: z.number(),
    /** Holes[11][1,3,5,7]: layers destroyed in the four skilling caverns. */
    layersDestroyed: numArray,
    /** Holes[24][0..39]: jar collectible levels. */
    jarCollectibleLevels: numArray,
    /** Holes[11][37]: jar types unlocked (new jar cost exponent). */
    jarTypesUnlocked: z.number(),
  }),
});

export type Account = z.infer<typeof AccountSchema>;
