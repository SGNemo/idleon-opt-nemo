// Sneaking formulas. Status per docs/FORMULAS.md.

/** SN-09 (TODO): Jade Emporium cost, priced by display row (not by upgrade id). */
export const jadeEmporiumCost = (row: number): number =>
  (300 + 500 * row + Math.pow(row, 3)) *
  Math.pow(2.52, row) *
  Math.pow(3.07, Math.max(0, row - 28)) *
  Math.pow(160, Math.max(0, row - 38)) *
  Math.pow(300, Math.max(0, row - 44));
