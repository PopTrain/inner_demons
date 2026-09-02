export type ElementalType =
    | 'Simple'
    | 'Plant'
    | 'Fire'
    | 'Water'
    | 'Electric'
    | 'Ice'
    | 'Air'
    | 'Bug'
    | 'Toxic'
    | 'Brawl'
    | 'Mind'
    | 'Dark'
    | 'Light'
    | 'Spirit'
    | 'Earth'
    | 'Crystal'
    | 'Metal'
    | 'Archaic';

export interface OffensiveMatchups {
    effective: ElementalType[];
    resist: ElementalType[];
    immune: ElementalType[];
}

export interface ElementalTypeSchema {
    id: ElementalType;
    attackingMatchups: OffensiveMatchups;
}

export type TypeChartDatabase = Record<string, ElementalTypeSchema>;