export type AITactic =
    | 'aggresive'
    | 'defensive'
    | 'random'
    | 'weighted_random'
    | 'support_first';

export interface AIMoveWeight {
    moveId: string;
    weightMultiplier: number;
}

export interface AIBehaviorProfile {
    aiId: string;
    profileName: string;
    tatic: AITactic;
    preferSuperEffective: boolean;
    useHealingThreshold?: number;
    moveWeights?: AIMoveWeight[];
}