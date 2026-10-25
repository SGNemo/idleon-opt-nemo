import { toArray, toNumber } from './json';
import { RawSave, readKey } from './normalize';

const sum = (list: unknown): number => toArray(list).reduce<number>((a, v) => a + toNumber(v), 0);
const at = (arr: unknown, i: number): unknown => (Array.isArray(arr) ? arr[i] : undefined);

/**
 * MenagerieStuff:MissionProg (see docs/FORMULAS.md). Entries the save cannot yield on its own
 * (total opals earned, Tome score, miniboss rank) are null.
 */
export const computeMissionProgress = (save: RawSave, accountLevel: number, uniqueSushi: number): (number | null)[] => {
  const options = toArray(readKey(save, 'OptLacc'));
  const research = toArray(readKey(save, 'Research'));
  const spelunk = toArray(readKey(save, 'Spelunk'));
  const divinity = toArray(readKey(save, 'Divinity'));
  const meals = toArray(readKey(save, 'Meals'));
  const holes = toArray(readKey(save, 'Holes'));
  const gaming = toArray(readKey(save, 'Gaming'));
  const bubba = toArray(readKey(save, 'Bubba'));
  const printer = toArray(readKey(save, 'Print'));
  const cards = toArray(readKey(save, 'Cards1'));
  const greenStacks = toArray(readKey(save, 'GreenStacks'));
  const sailing = toArray(readKey(save, 'Sailing'));
  const totems = toArray(readKey(save, 'TotemInfo'));
  const sigils = toArray(at(toArray(readKey(save, 'CauldronP2W')), 4));
  const farmCrop = readKey(save, 'FarmCrop');
  const kr = (readKey(save, 'KRbest') ?? {}) as Record<string, unknown>;
  const opt = (i: number) => toNumber(options[i]);
  const copperIndex = printer.indexOf('Copper');
  const log10 = (n: number) => (n > 0 ? Math.log10(n) : 0);
  const krEntries = Object.entries(kr);

  return [
    accountLevel,
    opt(232),
    sum(at(spelunk, 47)) + sum(at(spelunk, 1)),
    farmCrop && typeof farmCrop === 'object' ? Object.keys(farmCrop).length : 0,
    opt(319),
    sum(at(totems, 0)),
    Math.round(toNumber(divinity[25]) - 10),
    toNumber(at(toArray(meals[0]), 0)),
    opt(464),
    toNumber(at(toArray(research[7]), 4)),
    uniqueSushi,
    toNumber(at(toArray(research[7]), 9)),
    null,
    Math.round(sum(research[12])),
    opt(594),
    Math.round(sum(research[9])),
    null,
    toArray(research[11]).length,
    Math.round(toArray(at(sailing, 3)).reduce<number>((a, v) => a + Math.max(0, toNumber(v)), 0)),
    cards.length,
    copperIndex >= 0 ? Math.ceil(log10(toNumber(printer[copperIndex + 1]))) : 0,
    greenStacks.length,
    opt(369),
    Math.round(['1', '3', '5', '7'].reduce((a, i) => a + toNumber(at(toArray(holes[11]), Number(i))), 0)),
    Math.floor(log10(toNumber(gaming[0]))),
    Math.round(opt(262) - 9),
    Math.round(opt(279) - 11),
    Math.round(toNumber(at(toArray(bubba[1]), 8)) - 11),
    Math.round(sum(at(spelunk, 9))),
    Math.round([0, 1, 2, 3, 4, 5, 6].reduce((a, i) => a + toNumber(kr[`SummzTrz${i}`]), 0)),
    null,
    Math.round(Array.from({ length: Math.ceil(sigils.length / 2) }, (_, i) => toNumber(sigils[1 + 2 * i]) + 1).reduce((a, v) => a + v, 0)),
    Math.round(krEntries.reduce((a, [k, v]) => (k.includes('SummzTrz') ? a : a + toNumber(v)), 0)),
  ];
};
