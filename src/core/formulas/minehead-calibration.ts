/**
 * Account-specific values read from in-game screens, not derived from the save (status: calibrated, see FORMULAS.md MH-07/MH-08).
 * Replace them with your own numbers when you use the tool for another account.
 */
export interface MineheadCalibration {
  /** Menagerie doublers observed per upgrade index (missing = x1, unverified) */
  doublers: Record<number, number>;
  /** additive base-damage term not coming from upgrades (1768 total - 1 - 320 - 792) */
  baseOffset: number;
  /** additive part of the currency-per-hour percentage not coming from upgrades 5/22/28 (unknown, 0) */
  incomeOffset: number;
  /** currency per hour shown in game for the levels in the loaded save */
  incomePerHour: number;
}

export const DEFAULT_MINEHEAD_CALIBRATION: MineheadCalibration = {
  doublers: { 0: 2, 4: 2, 5: 1, 7: 2, 21: 1 },
  baseOffset: 655,
  incomeOffset: 0,
  incomePerHour: 62_194_730,
};
