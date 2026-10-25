import { parseMaybeJson } from './json';

export type RawSave = Record<string, unknown>;

export class SaveFormatError extends Error {}

/**
 * Accepts the pasted/uploaded text (or an already parsed object) of an it.json / save.json
 * and returns the flat key map. The game data is either top-level or wrapped under `.data`.
 */
export const normalizeSave = (input: string | object): RawSave => {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new SaveFormatError('Input is not valid JSON');
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SaveFormatError('Save must be a JSON object');
  }
  let root = parsed as RawSave;
  const wrapped = root['data'];
  if (wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped)) root = wrapped as RawSave;
  if (!('playerNames' in root) && !Object.keys(root).some((k) => /^CharacterClass_\d+$/.test(k))) {
    throw new SaveFormatError('No characters found - is this an IdleOn save?');
  }
  return root;
};

/** Read a top-level key, decoding JSON-in-JSON values. */
export const readKey = (save: RawSave, key: string): unknown => parseMaybeJson(save[key]);

/** Server vars appear as `servervars` or `serverVars` depending on the export. */
export const readServerVars = (save: RawSave): Record<string, unknown> => {
  const v = readKey(save, 'servervars') ?? readKey(save, 'serverVars');
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
};
