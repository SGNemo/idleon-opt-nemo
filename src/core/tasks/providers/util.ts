/** Helpers shared by fact providers. */

/** Readable name from a game table string (`Smooth_Rocks` -> `Smooth Rocks`). */
export const cleanName = (s: string): string => s.replace(/_/g, ' ').replace(/[{}@^~$]/g, '').replace(/\s+/g, ' ').trim();

/** Fill the game's description placeholders: `{` = value, `}` = multiplier, `^` = value, `@` = line break (dropped). */
export const describeBonus = (template: string, value: number): string =>
  template
    .replace(/\{/g, String(value))
    .replace(/\}/g, (1 + value / 100).toFixed(2))
    .replace(/\^/g, String(value))
    .replace(/@/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Compact number for task texts: exponent form from 1e6 upwards. */
export const fmtNum = (n: number): string => (n >= 1e6 ? n.toExponential(2).replace('e+', 'e') : String(Math.round(n)));
