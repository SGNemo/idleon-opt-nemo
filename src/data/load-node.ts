// Node-side loader (scripts, tests). The app loads the same files over HTTP.
import { readdirSync, readFileSync } from 'node:fs';
import { GameData, GameDataSchema, Rule, RuleFileSchema } from './schemas';

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

export const availableVersions = (): number[] => readJson('data/versions.json') as number[];

export const loadGameData = (version: number): GameData =>
  GameDataSchema.parse(Object.fromEntries(['meta', 'minehead', 'sneaking', 'hole', 'sushi', 'achievements', 'jelly'].map((n) => [n, readJson(`data/${version}/${n}.json`)])));

export const loadRules = (): Rule[] =>
  readdirSync('data/rules')
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => RuleFileSchema.parse(readJson(`data/rules/${f}`)));
