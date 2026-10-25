import { GameData, GameDataSchema, Rule, RuleFileSchema } from '../data/schemas';

const getJson = async (path: string): Promise<unknown> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};

export interface LoadedData {
  data: GameData;
  rules: Rule[];
  /** Set when the save's game version has no data set and the latest one was used instead. */
  warning: string | null;
}

const RULE_FILES = ['minehead', 'hole', 'sneaking', 'endgame', 'jelly', 'menagerie'];

export const loadAppData = async (gameVersion: number | null): Promise<LoadedData> => {
  const versions = (await getJson('data/versions.json')) as number[];
  const exact = gameVersion !== null && versions.includes(gameVersion);
  const version = exact ? gameVersion : Math.max(...versions);
  const parts = await Promise.all(['meta', 'minehead', 'sneaking', 'hole', 'sushi', 'achievements', 'jelly', 'menagerie'].map((n) => getJson(`data/${version}/${n}.json`)));
  const data = GameDataSchema.parse(Object.fromEntries(['meta', 'minehead', 'sneaking', 'hole', 'sushi', 'achievements', 'jelly'].map((n, i) => [n, parts[i]])));
  const rules = (await Promise.all(RULE_FILES.map((f) => getJson(`data/rules/${f}.json`)))).flatMap((r) => RuleFileSchema.parse(r));
  return {
    data,
    rules,
    warning: exact ? null : `No data set for game version ${gameVersion ?? '?'}; using ${version}. Numbers may be off.`,
  };
};
