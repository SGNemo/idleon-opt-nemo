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
