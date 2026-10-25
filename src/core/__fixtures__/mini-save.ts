/** Synthetic mini save that mimics the real export's quirks (values taken from a real save, trimmed). */
export const miniSave = {
  playerNames: ['Svannek', 'Zweinsens'],
  CharacterClass_0: 14,
  CharacterClass_1: 40,
  Lv0_0: [1644, 115],
  Lv0_1: [1603, 145],
  // JSON-in-JSON, as in the real export
  Research: JSON.stringify([
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [0, 46.75, 0, 0, 20, 1599566222.713279, 17036003577.115805, 16, 7, 38],
    [159, 10, 11, 112, 153],
    [],
    [],
    [],
    [47, 246, 74],
  ]),
  Ninja: JSON.stringify(
    Array.from({ length: 104 }, (_, i) =>
      i === 0 ? [8, 877.6, 0, 0] : i === 1 ? [3, 1, 0, 0] : i === 100 ? [1000, '3.69e+96', 0] : i === 102 ? [2, '2.6e+92', 3] : i === 103 ? [541, 2769] : [],
    ),
  ),
  Holes: JSON.stringify([[], [22, 61, 86], [1e17, 4e16, 6e17], [1, 1, 1]]),
  // 64 discovered sushi types, as in the real save
  Sushi: JSON.stringify([[], [], [], [], [], [...Array(64).fill(1), -1, -1], [], []]),
  OptLacc: Array.from({ length: 240 }, (_, i) => (i === 231 ? 3 : i === 232 ? 4 : 0)),
  servervars: { A_MineCost: 1.31, A_MineHP: 1.01, GameVERSION: 143 },
};
