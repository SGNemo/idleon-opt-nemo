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
    /** Selected / highest Ninja Mastery (OptLacc 231 / 232). */
    selectedMastery: z.number(),
    highestMastery: z.number(),
    /** Per character: [floor, ...] as stored. */
    ninjas: z.array(z.object({ floor: z.number() })),
  }),
  sushi: z.object({
    /** Sushi[5]: highest tier found per sushi type, -1 = undiscovered. */
    uniqueSushiTracking: numArray,
  }),
  hole: z.object({
    villagerLevels: numArray,
    villagerExp: numArray,
    opalsInvested: numArray,
  }),
});

export type Account = z.infer<typeof AccountSchema>;
