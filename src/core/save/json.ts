/** Parse a value that the game stores as a JSON string inside the JSON save; pass everything else through. */
export const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const s = value.trim();
  if (!s || (s[0] !== '[' && s[0] !== '{')) return value;
  try {
    return JSON.parse(s);
  } catch {
    return value;
  }
};

export const toNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
};

export const toNumberArray = (value: unknown): number[] =>
  Array.isArray(value) ? value.map((v) => toNumber(v)) : [];

/** Some arrays are exported as objects with numeric keys and a `length` field. */
export const toArray = (value: unknown): unknown[] => {
  const v = parseMaybeJson(value);
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object' && typeof (v as { length?: unknown }).length === 'number') {
    return Array.from(v as ArrayLike<unknown>);
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const len = toNumber(o['length'], -1);
    if (len >= 0) return Array.from({ length: len }, (_, i) => o[String(i)]);
  }
  return [];
};
