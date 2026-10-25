# Formula registry

Status: `TODO` until the source code AND a test value from IE/Toolbox agree (then `verified`).
Everything below is currently `TODO`: formulas were read from one source only (Toolbox parser code, which
itself cites game function names) and no test value has been compared yet.

Rules:
- Clean-room: formulas are restated here as math in our own words and re-implemented from this file.
  Toolbox (GPL-3.0) is reference and test oracle only; no code is copied.
- Corgan/idleon-research-optimizer is "all rights reserved" (see its LICENSE): read for inspiration only,
  never copy code or data, and do not use it as a committed test oracle.
- Source links are to `Morta1/IdleonToolbox@main`, file paths only (line numbers drift).
- Game-side name in quotes = the label the Toolbox comment cites for the game function.

Notation: `QTY(i)` = upgrade effect of Minehead upgrade `i` = `doubler(i) * effectPerLevel[i] * level[i]`
(`doubler` = 2 if a Menagerie doubler sits on it, else 1). `grid(n, mode)` = Research grid square `n`
(mode 0 = bonus, mode 1 = level). `BonusQTY(k)` = `oppBonus[k]` if `opponentsBeat > k` else 0.

## Minehead — `parsers/world-7/minehead.ts`

| ID | Formula | Definition | Status |
|---|---|---|---|
| MH-01 | Upgrade cost ("handleUpgCost") | `cost(i, lvl) = (5 + i + max(0,i-2)^1.3) * 2^max(0,i-4) * A_MineCost^max(0,i-9) / (1 + QTY(26)/100) * exponent[i]^lvl * max(0.1, 1 - max(sushi(1), sushi(16))/100)` | verified (scope: no Menagerie doubler on upgrade 26; 7 test values: indices 0-5, see Test values) |
| MH-02 | Research level required | `req(i) = 1 + 3i + floor(i/3) + floor(i/11)` | TODO |
| MH-03 | Opponent max HP ("handleMaxHP_Opp") | `hp(t) = (5 + 2t + t²) * 1.8^t * 1.85^floor(max(0,t-4)/3) * 4^floor(max(0,t-5)/7) * A_MineHP^max(0,t-9)` | verified (scope: t=20 only, 1 test value: Brainhead 22B HP in game, formula 21.94B) |
| MH-04 | Opponent mine count ("Minehead:Mines_Opp") | `round(clamp(1 - R + floor(t/3)+floor(t/7)+floor(t/13)+min(1,floor(t/15))+floor(t/17), 1, 40))`, `R` = superbit(Less_Charge) + equinox cloud 41 + jade(Depth_Charge_Disposal) + min(3, ceil(spelunk[18][40]/2)); each of the first three capped at 1 | TODO |
| MH-05 | Lives | `3 + QTY(6)` | TODO |
| MH-06 | Daily tries max | `3 + grid(147, 1)` | TODO |
| MH-07 | Base damage ("Minehead:BaseDMG") | `(1 + QTY(0)+QTY(7)+QTY(25)+coral5) * (1 + (QTY(4)+QTY(21)+QTY(27))/100) * (1 + grid(167,0)/100) * (1 + 0.5*nomenclature) * (1 + LT40/100) * (1 + jelly(9)/100)` | TODO |
| MH-08 | Currency per hour ("Minehead:CurrencyGain") | `grid(129,0) * (1+eventShop44) * (1+grid(148,0)/100) * max(1,rogOutpost(3)) * (1+10*merit/100) * companion143 * min(3, 1+BonusQTY(6)/100) * (1 + (QTY(5)+QTY(22)+QTY(28)*log10(max(1,bestHit))+coral5)/100) * (1+arcade62/100) * (1+atom13/100) * (1+LT40/100) * (1 + (grid(147,0)+grid(166,0)+mealMineCurr)/100) * (1+sushi(12)/100) * (1+jelly(8)/100) * (1+bundleBanJ) * (1+button(1)/100)` ; `companion143 = max(1, min(2, active?2:1) + lvl2?1:0)` | TODO |
| MH-09 | Blue crown multiplier | `1.5 + QTY(14)/100` | TODO |
| MH-10 | Blue crown odds | `0` if `QTY(14)=0`, else `min(0.1, (1/15) * (1 + QTY(15)/100))` → Crown Craze useless past QTY 50 | TODO |
| MH-11 | Jackpot odds | `0` if `QTY(23)=0`, else `0.01 * (1 + QTY(23)/100)`; jackpot tiles `3 + QTY(24)` | TODO |
| MH-12 | Max tile number (upg 1) | `round(1 + QTY(1) + 1 + min(1, floor((QTY(1)+1)/9)))`, level ≥ 17 = max | TODO |
| MH-13 | Glimbo trade cost | `u = (1 + n + 1.5n) * base^n * max(0.1, 1 - 25*eventShop38/100)`; if `u < 1e9`: `floor(max(1, u * max(0.2, 1 - c57/100)))` else `u * max(0.01, 1 - c57/100)` (`n` = trades, `c57` = companion 57 bonus) | TODO |
| MH-14 | Glimbo extra max levels | `round(m * (n+1))`, `m = 1 + grid(169,1)` if flag else 1; gain of next trade = `round(m*(n+2)) - round(m*(n+1))` | TODO |
| MH-15 | Research grid expansion sizes / tile multiplier tables | table lookups (`gameTables.mineheadUpgradeTables[12|17]`, `researchData[9]`) | TODO (data, not formula) |

Data dependencies (extract script must provide): `mineheadUpgrades` (per-level effect, max level, cost exponent,
description), `researchData` indexes 9/10/11/15/16/19/20/26/27/28/29 (grid sizes, opponent names/bonuses, glimbo
tables), `upgradeVault` entries, serverVars `A_MineCost`/`A_MineHP` (default 1; only matter for index > 9).
Not computable statically: live outgoing damage during a game, weapon-power-dependent opponent text.

Cross-system inputs MH-07/08 need (each is its own formula, not yet in the registry): research grid bonuses
(129, 147, 148, 166, 167, 169), sushi (1, 12, 16), jelly (8, 9), button (1), atom collider 13, arcade 62,
meal `MineCurr`, coral reef Dancing Coral 5, legend talent 40, Nomenclature artifact, companions 143/57,
event shop 38/44, merit (W7 task 4), ROG outpost 3, bundle `ban_j`.

## Sneaking — `parsers/world-6/sneaking.ts`

| ID | Formula | Definition | Status |
|---|---|---|---|
| SN-01 | Detection chance (`getDetectionChance`) | `clamp(1 - 1.1 * s / (s + d), 0, 1)`, `s` = stealth, `d` = floor difficulty | TODO |
| SN-02 | Stealth needed for target detection `p` | `s = (1-p) * d / (0.1 + p)` (algebraic inverse of SN-01) | TODO (math check) |
| SN-03 | Floor difficulty | mastery 0 or floor 0: `base[f]`; else `0.1 * base[f] * scale^mastery` (`scale` = NinjaInfo[11]) | TODO |
| SN-04 | Door max HP | selected < highest mastery → all 0; selected = 0 → base; else `0.01 * base[f] * base[10]^mastery` per floor, floor 0 = 1 (quirk: last floor uses the already rescaled floor 10) | TODO |
| SN-05 | Stealth (per ninja) | `base * (1 + Σ floorMateBonus/100) * (1 + flowers*flowerBonus/100)`; `base` = `(10 + wayOfStealth*sneakLvl) * Π(~20 multipliers: land rank, charms, compass, gambit, gold beads, tome+star sign (additive), statue, card, achievement, gemstone 0, vote, lamp, schematic, fractal island, emperor, sushi 32, jelly 16, "Shhh" upgrade, companion 163)` | TODO |
| SN-06 | Funeral flowers needed for target detection | `ceil((required/withoutFlowers - 1) * 100 / flowerBonus)`; 0 if already met, ∞ if no flower bonus | TODO |
| SN-07 | Gemstone bonus | `(x3 + x5 * v/(1000+v))`, gemstone ≠ #5: `* (1 + gem5/100) * max(1, talent GENERATIONAL_GEMSTONES)`; counter cap 1e7 | TODO |
| SN-08 | Ninja item value | weapon sub 0: `10*x3*(lvl+10)/(lvl+40)`; type 1 other: `x3*1.23^lvl*0.92^max(0,lvl-80)*0.94^max(0,lvl-110)`; type 2: `min(x3+x5*lvl/(lvl+50), x5) + min(x5*lvl/(lvl+900), x5)` | TODO |
| SN-09 | Jade emporium cost (by display row `r`) | `(300 + 500r + r³) * 2.52^r * 3.07^max(0,r-28) * 160^max(0,r-38) * 300^max(0,r-44)` | TODO |
| SN-10 | Pristine charm chance | `0.001 * max(0, 1.5 - rolls/80) * (1 + compass54/100)`; pristine rolls left `120 - rolls`, symbol rolls left `75 - rolls` | TODO |
| SN-11 | Items max level (upgrade bonus idx 6/7/10/11/12) | `level*modifier (+ masteryLoot*selectedMastery)`; idx 11 adds gold star, gemstone, palette 30, vault 88, equinox cloud 53 | TODO |
| SN-12 | Drop lists / unlock order / knowledge-tree prerequisites | table-driven (`ninjaExtraInfo`, `gameTables.sneakingMastery*`) | TODO (data) |

Open: loot/s and value per floor (what to prioritise) is not in this parser; needs the drop-chance tables
plus item-value mapping, i.e. an optimizer on top of SN-01..SN-08, not a parser lookup.

## Hole — `parsers/world-5/hole.ts` (+ `caverns/*`, not yet read)

| ID | Formula | Definition | Status |
|---|---|---|---|
| HO-01 | Villager EXP req | idx 0: lvl 1 → 5, else `10*(-1.5 + (10 + 7*lvl^2.1) * 2.1^lvl * (1 + 0.75*max(0,lvl-4)) * 3.4^(max(0,lvl-12)))`; idx 1: `30*(10+6*lvl^1.8)*1.57^lvl`; idx 2: `50*(10+5*lvl^1.7)*1.4^lvl`; idx 3: `120*(30+10*lvl²)*2^lvl`; idx 4: `500*(10+5*lvl^1.3)*1.13^lvl` | TODO |
| HO-02 | Villager EXP / hour | `catchUp * (100 + schematic25) * max(1, Π(~10 mults)) * opals[t] * (1+gemShop[t]) * (1+exotic/100) * (1+arcade/100) * (1+grimoire/100) * (1+tesseract/100) * (1 + cosmo·floor(minOpals/5)/100) * (1 + Σ(monuments, measurements 0+7, cosmo, schematic 48, cards, bell, summoning, vault 73)/100)` | TODO |
| HO-03 | Engineer build cost | by tier: `50*0.85^wish*1.28^(i+floor(i/2.7))`, then two later tiers with extra `1.23^…`/`1.34`,`1.26`; fixed `x3` if `x4=1` | TODO |
| HO-04 | Unlocked schematics | `min(105, round(1 + 3*engLvl + floor(engLvl/5)))` | TODO |
| HO-05 | Study requirement | `4000 * 1.25^studyLvl[t] * 1.5^floor(t/5)` | TODO |
| HO-06 | Study progress / hour | `100 * (1+fountain/100) * (1 + (5 + schem85+87+88+99) * studiesVillagerLvl/100) * (1 + (jar16 + stamp + cosmo)/100)` | TODO |
| HO-07 | Measurement cost | `(1/(1+fountain/100)) * (250 + 50*lvl) * 1.6^(i - 6*floor(i/10)) * 1.1^lvl` | TODO |
| HO-08 | Measurement multiplier | `f<5: 1 + 18f/100`, else `1 + (18f + 8(f-5))/100`; `f` per measure type: log10/ratio formulas (gloomie kills, crops/14, account lvl/500, tome score/2500, …) | TODO |
| HO-09 | Cosmo bonus | `floor(x0 * level)`; special `floor(max(1, 3^level))` for [2][1] | TODO |
| HO-10 | Caverns (Well, Motherlode, Den, Bravery, Bell, Harp, Lamp, Hive, Grotto, Justice, Jars, Evertree, Wisdom, Gambit, Temple, Fountain, Trench, Glunko Cove) | each in `parsers/world-5/caverns/*.ts` | TODO — files not read yet |

Hole is the largest unknown: the progress-relevant formulas (what to invest opals/resources in) sit in the
18 cavern files, not in `hole.ts`. Reading those is the next research step if Hole becomes a system.

## Save-key map seen so far (parser inputs)

`Research` (JSON string): `[7]` minehead state (`[4]` opponents beaten, `[5]` currency, `[6]` best hit, `[8]` daily tries),
`[8]` upgrade levels, `[12]` glimbo trades. `Spelunk` (JSON string): `[13][3]` special-upgrade progress, `[15]` funeral flowers,
`[18][40]` legend talent 40. `Ninja` (JSON string): `[100]` door HP, `[102]` jade (`[0]` exp, `[1]` coins, `[9]` emporium unlocks),
`[103]` upgrade levels, `[104]` beanstalk, `[106]` gemstones unlocked, `[107]` charms. `Holes`: 35 sub-arrays, see index
comments in `hole.ts`. Account options used: 231/232 mastery, 233+ gemstone counters, 355, 402.

## Implemented in code (all still TODO until a test value matches)

| ID | File | Used by |
|---|---|---|
| MH-01 (full, incl. sushi discount) | `src/core/formulas/minehead.ts` | rule `minehead.upgrades` |
| MH-03 | `src/core/formulas/minehead.ts` | not used yet |
| HO-01 | `src/core/formulas/hole.ts` | rule `hole.villagers-ready` |

Tasks built on these carry `status: todo-formula` in `data/rules/*.json`.

## Test values (from the game, save v143)

| ID | Observation | Result | Status |
|---|---|---|---|
| MH-01 | Base Damage I, Lv 159 → next level costs 9.54M in game | Formula without discounts gives 19.07M; × 0.5 = 9.536M matches 9.54M (ratio 0.5002). So a discount factor of ≈0.5 applies. Not computed yet: sushi discount `max(0.1, 1 - max(sushi(1), sushi(16))/100)` and cost-reduction upgrade QTY(26); which of them gives 0.5 on this save is unknown | TODO (base term consistent, discounts unverified) |
| HO-01 | Studies villager Lv 245, EXP 3.35e19 → can level up in game | Formula says ready (consistent). Only a yes/no check, not the exact threshold | TODO (one consistent observation) |

To reach `verified`: parse sushi data (for the 0.5 factor) and compare a second upgrade (e.g. index 11 or 13 at Lv 44), and for HO-01 a villager that is just below its threshold.

### Update: MH-01 resolved
Sushi "rest of game" bonus 16 is 50 % on the owner's save (64 sushi types found, `research[37][16]`), bonus 1 is 30 %;
`max()` gives 50 % → 19.07M × 0.5 = 9.536M = the in-game 9.54M. Implemented as MH-01 (verified in the scope above) plus
SU-01 (sushi bonus = `research[37][i]` if `uniqueSushi > i`, TODO until a second sushi value is compared).
Still open for the rule `minehead.upgrades`: MH-02 (research level lock) and Menagerie doublers.

### Update: MH-01 six more values (Minehead screen, save v143)
Displayed next-level costs vs. formula (mineCost 1.31, sushi 50 %): Base Damage I Lv160 10.5M, Numbahs Lv10 182M,
Grid Expansion Lv11 14.8B, Bettah Numbahs Lv112 28.3M, Mega Damage I Lv153 195M, Miney Farmey I Lv152 27.8M.
All within 0.4 % (display rounding). Displayed effects hint at Menagerie doublers: Base Damage I Lv160 shows +320 (data 1/level → x2),
Mega Damage I Lv153 +1530 % (data 5/level → x2), Miney Farmey I Lv152 +1520 % (data 10/level → x1). Doublers not parsed yet.

### Update: Menagerie doublers (Minehead screen)
Base Damage II Lv132 shows +792 (data 3/level -> x2); its next-level cost 23.4M matches MH-01 (upgrade index 7).
Observed doublers so far: idx 0 x2, idx 4 x2, idx 7 x2, idx 5 x1. Others unknown (default x1 in the optimizer).

### Update: MH-07 calibration (Base DMG before/after buying 4 levels of Base Damage II)
Screens: Base DMG 1,064,049 (Base II Lv132, +792) -> 1,078,493 (Lv136, +816); currency 1.8B -> 1.69B (spent 108M, matches MH-01).
Ratio 1.01357 implies an additive base term of 1768 = 1 + 320 (Base I) + 792 (Base II) + 655 other.
The 655 is calibrated, not derived (candidate: Aegean Coral / shrine bonus). Status: calibrated, TODO to derive.

### Update: Mega Damage II, Brainhead
Mega Damage II Lv6 shows +120 % (data 20/level, no doubler -> x1) and costs 214M (formula 213.4M). Brainhead (20th index, "twenty first opponent")
shows 22B HP (MH-03 gives 21.94B with A_MineHP 1.01). Jelly Operator state lives in Research[7]: [9] obstructions defeated, [10] operations left today.

## Menagerie (MENA-*)
| ID | What | Formula | Status |
|---|---|---|---|
| MENA-01 | Boost cost at level L | `3L + L^1.5 + (5 + i^1.5) * max(1.45, 2.25 - 0.0375 i)^i * exp(i)^L`, exp from data (groups, else 1.3) | verified (15 of 15 visible boosts match to the Lumi) |
| MENA-02 | Mission requirement | `floor(baseReq + increment * claims)` | verified (14 of 14 visible missions) |
| MENA-03 | Unlock cost | `(10 + i^2) * max(1.6, 2.5 - 0.0375 i)^i` | TODO (no test value yet) |
| MENA-04 | Minehead doublers owned | `boost[8] level + 3 (bundle ban_l) + companion Ancientfish`; placed list = Spelunk[51] | consistent: boost lv 2 + 3 = 5 owned = 5 ids placed (11,7,9,0,4) |
| MENA-05 | Mission progress sources | see `src/core/save/menagerie-progress.ts` (Opals, Tome, miniboss rank not derivable yet) | TODO (Turkey Meal 148 matches Meals[0][0]) |
Save keys: Menagerie[0] scalars (0 Lumi, 1 shells, 2 rank), [1] mission claims, [2] unlocks owned, [3] boost levels. Spelunk[51/52/53] doubler placement for Minehead/Sushi/Jelly.

### Update: mission progress sources and goal of the boss fight
Verified against in-game counters: Cavern Layer Removals 125 = Holes[11][1]+[3]+[5]+[7] (34+31+32+28); Palette LVs 1,819 = sum Spelunk[9]; Total Depths 3,862 = sum Spelunk[1] + sum Spelunk[47]; Turkey Meal 148 = Meals[0][0].
Owner note: the boss is killed in one hit on the last life; "Final Round Fury" and "Big Hit Combos" (doubled by Menagerie doublers) are large multipliers for that. The optimizer models only
the Base/Mega damage groups (the other factors cancel in ratios), so do not move doublers off those two upgrades.
Daily/weekly flags (OptLacc 113, 137, 182, 189, 190, 105) come from the IdleonToolbox dashboard and are status todo-formula until compared with the game.
