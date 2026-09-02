import type { PersonalityId, StatType } from "./personality.schema";

export type TraitId =
    | 'Heroic'
    | 'Determined'
    | 'Iron_will'
    | 'Stalwart'
    | 'Weak_point'
    | 'Prankster'
    | 'Ambush'
    | 'Villainous';

export type TraitTrigger = 'ON_ENTER_BATTLE' | 'ON_ATTACK' | 'ON_DAMAGED' | 'ON_FAINT' | 'PASSIVE';

export type TargetType = 'SELF' | 'OPPONENT' | 'FIELD';

export interface PersonalityTrait {
    id: TraitId;
    requiredPersonality: PersonalityId;
    trigger: TraitTrigger;
    effectPayload: {
        target: TargetType;
        statModifier?: {
            stat: StatType;
            stages: number
        };
        damageModifier?: number;
        statusCondition?: string;
    };
}

export type PersonalityTraitList = PersonalityTrait[];