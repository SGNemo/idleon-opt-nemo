import { z } from 'zod';

/**
 * Game data schemas. Field names are ours and describe what the value MEANS;
 * the extract script maps from the source tables (whose names can be misleading).
 */

export const MineheadDataSchema = z.object({
  upgrades: z.array(
    z.object({
      index: z.number().int(),
      name: z.string(),
      /** Max level; >= 999 means uncapped. */
      maxLevel: z.number(),
      /** Effect value per level (before Menagerie doublers). */
      effectPerLevel: z.number(),
      /** Per-level cost growth base. */
      costExponent: z.number(),
      description: z.string(),
    }),
  ),
  /** Tile multiplier table (upgrade 12) and additive-tile table (upgrade 17), indexed by upgrade QTY. */
  multiplierTable: z.array(z.number()),
  additiveTable: z.array(z.number()),
  /** Grid size per expansion level as [cols, rows]. */
  gridSizes: z.array(z.tuple([z.number(), z.number()])),
  opponents: z.array(
    z.object({
      index: z.number().int(),
      name: z.string(),
      ordinal: z.string(),
      title: z.string(),
      /** Flat reward value (placeholders in the description refer to it). */
      bonusValue: z.number(),
      bonusDescription: z.string(),
    }),
  ),
  glimbo: z.array(
    z.object({
      index: z.number().int(),
      item: z.string(),
      costBase: z.number(),
      /** Index into the upgrade vault whose max level this trade raises. */
      vaultIndex: z.number().int(),
      vaultName: z.string(),
      vaultBaseMaxLevel: z.number(),
      /** True if research grid square 169 multiplies the extra levels. */
      gridBonusApplies: z.boolean(),
    }),
  ),
});

export const SneakingDataSchema = z.object({
  upgrades: z.array(
    z.object({
      index: z.number().int(),
      name: z.string(),
      /** Bonus per level (NLbonuses plain branch). */
      modifier: z.number(),
      /** Upgrade that must be level >= 1 first (may equal own index = locked until mastery rewrites it). */
      prerequisite: z.number().int(),
      /** Cost parameters, semantics not yet verified. */
      costParams: z.object({ x7: z.number(), x8: z.number() }),
      description: z.string(),
    }),
  ),
  knowledgeRoot: z.number().int(),
  masteryPrerequisites: z.array(z.object({ mastery: z.number(), upgrade: z.number(), prereq: z.number() })),
  masteryDrops: z.array(z.unknown()),
  floors: z.object({
    baseDoorMaxHp: z.array(z.number()),
    baseDifficulty: z.array(z.number()),
    /** Row 10 / row 11 of the source table: door-HP and difficulty scaling per mastery. */
    doorHpScale: z.array(z.number()),
    difficultyScale: z.array(z.number()),
    /** Flat [item, chance, ...] loot lists, one per floor. */
    dropLists: z.array(z.array(z.string())),
  }),
  emporium: z.object({
    displayOrder: z.array(z.number()),
    upgrades: z.array(z.object({ index: z.number().int(), name: z.string(), x1: z.number(), x2: z.number(), x3: z.number(), description: z.string() })),
  }),
  equipment: z.record(
    z.object({ rawName: z.string(), type: z.number(), subType: z.number(), name: z.string(), x3: z.number().optional(), x5: z.number().optional() }),
  ),
  pristineCharms: z.array(z.object({ rawName: z.string(), name: z.string(), x3: z.number(), bonus: z.string() })),
  masteryBonuses: z.array(z.string()),
  gemstoneDescriptions: z.array(z.string()),
});

/** Hole is stored raw for now; semantics get registered system by system (see docs/FORMULAS.md). */
export const HoleDataSchema = z.object({
  holesInfo: z.array(z.array(z.unknown())),
  buildings: z.array(z.unknown()),
  cosmoUpgrades: z.array(z.unknown()),
  lampWishes: z.array(z.unknown()),
  fountainUpgrades: z.array(z.unknown()),
});

export const SushiDataSchema = z.object({
  /** One name per sushi tier; its length - 1 is the highest tier. */
  names: z.array(z.string()),
  /** "Rest of game" bonus per tier index: value applies once more than `index` unique sushi were found. */
  restOfGameValues: z.array(z.number()),
  restOfGameDescriptions: z.array(z.string()),
});

export const AchievementsDataSchema = z.array(
  z.object({
    /** Position in AchieveReg. */
    index: z.number().int(),
    /** 1-based world (70 slots per world). */
    world: z.number().int(),
    name: z.string(),
    description: z.string(),
    /** Amount needed to complete. */
    quantity: z.number(),
    /** Set for Steam-linked entries: progress is then read from SteamAchieve[steamIndex]. */
    steamIndex: z.number().int().optional(),
  }),
);

export const JellyDataSchema = z.array(
  z.object({
    /** Obstruction number (0-based); defeated when Research[7][9] > index. */
    index: z.number().int(),
    name: z.string(),
    bonusDescription: z.string(),
    bonusValue: z.number(),
  }),
);

export const MenagerieDataSchema = z.object({
  missions: z.array(z.object({ index: z.number().int(), text: z.string(), shortName: z.string(), baseReq: z.number(), increment: z.number() })),
  unlocks: z.array(z.object({ index: z.number().int(), name: z.string() })),
  boosts: z.array(z.object({ index: z.number().int(), description: z.string(), perLevel: z.number() })),
  /** MenagerieStuff:CostExponent: first group holding the boost index wins, else `otherwise`. */
  costExponentGroups: z.array(z.object({ indices: z.array(z.number().int()), exponent: z.number() })),
  costExponentOtherwise: z.number(),
  /** Upgrade ids a Minehead doubler may sit on. */
  mineheadDoublerEligible: z.array(z.number().int()),
});

export const DataMetaSchema = z.object({
  gameVersion: z.number(),
  source: z.string(),
  sourceCommit: z.string(),
  fetchedAt: z.string(),
  note: z.string(),
});

export const GameDataSchema = z.object({
  meta: DataMetaSchema,
  minehead: MineheadDataSchema,
  sneaking: SneakingDataSchema,
  hole: HoleDataSchema,
  sushi: SushiDataSchema,
  achievements: AchievementsDataSchema,
  jelly: JellyDataSchema,
  menagerie: MenagerieDataSchema,
});

export type MenagerieData = z.infer<typeof MenagerieDataSchema>;
export type MineheadData = z.infer<typeof MineheadDataSchema>;
export type SneakingData = z.infer<typeof SneakingDataSchema>;
export type SushiData = z.infer<typeof SushiDataSchema>;
export type HoleData = z.infer<typeof HoleDataSchema>;
export type GameData = z.infer<typeof GameDataSchema>;

const ConditionSchema = z.object({
  fact: z.string(),
  op: z.enum(['>', '>=', '<', '<=', '==', '!=']),
  value: z.union([z.number(), z.string(), z.boolean()]),
});

/** A data-driven to-do rule. `{fact.path}` placeholders in title/reason are filled from computed facts. */
export const RuleSchema = z.object({
  id: z.string(),
  system: z.string(),
  /** World 1-7 the task is grouped under. */
  world: z.number().int().min(1).max(7),
  title: z.string(),
  reason: z.string(),
  effort: z.enum(['low', 'medium', 'high']),
  gain: z.string(),
  /** verified = built only on save facts / verified formulas; todo-formula = relies on an unverified formula. */
  status: z.enum(['verified', 'todo-formula']),
  /** 0-100, ranks tasks inside a world. */
  priority: z.number(),
  urgent: z.boolean().default(false),
  progress: z.object({ current: z.string(), max: z.string() }).optional(),
  blockedBy: z.string().optional(),
  when: z.array(ConditionSchema),
});

export const RuleFileSchema = z.array(RuleSchema);
export type Rule = z.infer<typeof RuleSchema>;
