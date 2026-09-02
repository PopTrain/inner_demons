export type StatusEffectCategory =
    | 'Burn'
    | 'Frostbite'
    | 'Poison'
    | 'Paralysis'
    | "Sleep"
    | "Confuse";

export type StatusDamageType = 'flat' | 'percent_max_hp';

export interface StatusEffectDefinition {
    effectId: StatusEffectCategory;
    minTurns?: number;
    maxTurns?: number;
    preventsAction: boolean;
    actionFailureChance?: number;
    appliesTickDamage: boolean;
    tickDamageType?: StatusDamageType;
    tickDamageValue?: number;
    statModifiers?: {
        mattackMultiplier?: number;
        rattackMultiplier?: number;
        speedMultiplier?: number;
    }
}