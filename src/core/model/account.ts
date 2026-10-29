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
  /** Raw inputs of the daily/weekly rules that are not plain OptLacc flags (see providers/dailies.ts). */
  dailies: z.object({
    /** A Glimmerwick Candle (Quest114) sits in a character inventory or the storage chest. */
    ownsGlimmerwickCandle: z.boolean(),
    /** Arcane (Tesseract) upgrade levels. */
    arcaneLevels: numArray,
    /** Compass[0]: Compass upgrade levels. */
    compassLevels: numArray,
    /** Rift[0]: current rift number (unlocks Rift bonuses by index). */
    riftCurrent: z.number(),
    /** Guild[1..]: task rows as [taskIndex, ?, progress]; empty when not in a guild. */
    guildTasks: z.array(z.object({ index: z.number(), progress: z.number() })),
    /** PostOfficeInfo1 / PostOfficeInfo0 merged per shipment box. */
    postOfficeShipments: z.array(z.object({ totalShipments: z.number(), streak: z.number(), shield: z.number(), completedAnOrder: z.boolean() })),
  }),
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
  }),
});

export type Account = z.infer<typeof AccountSchema>;
