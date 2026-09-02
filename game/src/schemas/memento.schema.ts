export type MementoCategory = 'Contest' | 'Battle' | 'Event' | 'Milestone';

export interface MementoDefinition {
    mementoId: string;
    category: MementoCategory;
}

export type MementoDatabase = Record<string, MementoDefinition>;
