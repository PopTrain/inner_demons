import { type ElementalType } from './type-chart.schema'

export type Rank =
    | 'Kilo'
    | 'Mega'
    | 'Giga'
    | 'Tera'
    | 'Peta';

export interface BaseStats {
    hp: number;
    stamina: number;
    mattack: number;
    mdefense: number;
    rattack: number;
    rdefense: number;
    speed: number;
}

export type GrowthRate = 'Slow' | 'Medium' | 'Fast' | 'Erratic';

export interface Training {
    tpYield: number;
    baseExp: number;
    catchRate: number;
    growthRate: GrowthRate;
}

export interface LevelUpMove {
    moveId: string;
    level: number;
}

export interface BaseMove {
    moveId: string;
}

export interface MovePool {
    levelUp: LevelUpMove[];
    moveManual: BaseMove[];
    tutor: BaseMove[];
}

export interface EvolutionCondition {
    targetSpeciesId: string;
    requiredLevel?: number;
    requiredStats?: Partial<BaseStats>;
    requiredItem?: string;
    requiredMove?: string;
    requiresTrade?: boolean;
    requiresFriendship?: number;
}

export interface DemonForm {
    formId: string;
    elementalTypes?: ElementalType[];
    baseStats?: Partial<BaseStats>;
    movePool?: Partial<MovePool>;
    triggerCondition?: string;
}

export interface DemonSpeciesSchema {
    speciesId: string;
    rank: Rank;
    height: number;
    weight: number;
    elementalTypes: ElementalType[];
    baseStats: BaseStats;
    training: Training;
    movePool: MovePool;
    evolutionRules: EvolutionCondition[];
    forms?: DemonForm[];
}

export type DemonDatabase = Record<string, DemonSpeciesSchema>;