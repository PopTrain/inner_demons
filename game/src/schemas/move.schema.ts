import { type ElementalType } from './type-chart.schema';
import { type StatusEffectCategory } from './status-effects.schema';

export type MoveCategory = 'Melee' | 'Ranged' | 'Status';

export interface StatModifier {
    stat: 'hp' | 'stamina' | 'mattack' | 'mdefense' | 'rattack' | 'rdefense' | 'speed';
    stages: number;
    target: 'self' | 'opponent';
}

export interface SecondaryEffect {
    chance: number;
    statusAilment?: StatusEffectCategory;
    statModifiers?: StatModifier[];
}

export interface DemonMoveSchema {
    moveId: string;
    elementalType: ElementalType;
    category: MoveCategory;
    power: number;
    accuracy: number;
    energyCost: number;
    priority: number;
    makesContact: boolean;
    secondaryEffect?: SecondaryEffect;
}

export type MoveDatabase = Record<string, DemonMoveSchema>;