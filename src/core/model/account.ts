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
    /** Sushi[5]: highest tier found per sushi type, -1 = undiscovered, >= 1 = perfected. */
    uniqueSushiTracking: numArray,
    /** Sushi[2]: station upgrade levels (table index). */
    upgradeLevels: numArray,
    /** Sushi[7]: knowledge level per sushi type. */
    knowledgeLevels: numArray,
    /** Sushi[4][3]: Sushi Bucks owned. */
    bucks: z.number(),
  }),
  spelunking: z.object({
    /** Spelunk[0]: > 0 once the cave's lore boss was beaten. */
    caveClears: numArray,
    /** Spelunk[1]: best depth per cave. */
    bestDepths: numArray,
    /** Spelunk[4][0]: Amber owned. */
    amber: z.number(),
    /** Spelunk[5]: shop upgrade levels (table index). */
    upgradeLevels: numArray,
    /** Spelunk[6]: names of rocks discovered so far. */
    discoveries: z.array(z.string()),
    /** Spelunk[44]: Grand Discoveries per cave. */
    grandDiscoveries: numArray,
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
  }),
});

export type Account = z.infer<typeof AccountSchema>;
