export type PersonalityId =
    | 'Brave'
    | 'Stoic'
    | 'Cunning'
    | 'Loyal'
    | 'Timid';

export type StatType =
    | 'mattack'
    | 'mdefense'
    | 'rattack'
    | 'rdefense'
    | 'speed';

export interface DemonPersonality {
    id: PersonalityId;
    boostedStat: StatType;
}

export type PersonalityDatabase = DemonPersonality[];