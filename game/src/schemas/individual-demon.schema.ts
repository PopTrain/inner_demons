import { type BaseStats } from "./demon.schema";
import { type PersonalityId } from "./personality.schema";
import { type TraitId } from "./personality-traits.schema";

export type StatusCondition =
    | 'None'
    | 'Burn'
    | 'Frostbite'
    | 'Paralysis'
    | 'Poison'
    | 'Sleep'
    | 'Confuse';

export interface Personality {
    personalityId: PersonalityId;
    traitIds: TraitId[];
}

export interface ActiveMove {
    moveId: string;
}

export type UniquePoints = BaseStats;
export type TrainingPoints = BaseStats;

export interface IndividualDemon {
    instanceId: string;
    speciesId: string;
    nickname: string | null;
    isVariant: boolean;
    personality: Personality;
    level: number;
    experience: number;
    friendship: number;
    uniquePoints: UniquePoints;
    trainingPoints: TrainingPoints;
    currentHp: number;
    currentStamina: number;
    statusCondition: StatusCondition;
    equippedMoves: ActiveMove[];
    heldItem: string | null;
    activeFormId: string | null;
    originalTrainerId: string;
    captureDate: Date;
    captureLocation: string;
    mementoIds: string[];
}