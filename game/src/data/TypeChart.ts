import type { ElementalType } from "@/schemas/type-chart.schema";
import { DataRegistry } from "./DataRegistry";

/**
 * `types.json` stores matchups from the attacker's perspective:
 * `effective` = defender types this type deals 2x to,
 * `resist`    = defender types this type deals 0.5x to,
 * `immune`    = defender types this type deals 0x to.
 * Anything not listed is a neutral 1x.
 *
 * Data files key/id types inconsistently by case (e.g. types.json's "SIMPLE"
 * vs moves.json's "Simple"); DataRegistry.getType() already normalizes via
 * toUpperCase(), so lookups here are case-insensitive regardless of source casing.
 */
export class TypeChart {
  static multiplier(attackerType: ElementalType, defenderType: ElementalType): number {
    const type = DataRegistry.instance.getType(attackerType);
    const defender = defenderType.toUpperCase();
    if (type.attackingMatchups.immune.some((t) => t.toUpperCase() === defender)) return 0;
    if (type.attackingMatchups.effective.some((t) => t.toUpperCase() === defender)) return 2;
    if (type.attackingMatchups.resist.some((t) => t.toUpperCase() === defender)) return 0.5;
    return 1;
  }

  /** Dual (or multi) typed defenders multiply each matchup together, as in the genre standard. */
  static effectivenessAgainst(attackerType: ElementalType, defenderTypes: ElementalType[]): number {
    return defenderTypes.reduce((mult, t) => mult * this.multiplier(attackerType, t), 1);
  }
}
