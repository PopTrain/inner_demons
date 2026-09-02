import { type IndividualDemon } from "./individual-demon.schema";

export interface TrainerDialogue {
    intro: string;
    lastDemon?: string;
    win?: string;
    loss?: string;
}

export interface TrainerRewards {
    gold: number;
    itemDrops?: string[];
}

export interface TrainerProfile {
    trainerId: string;
    name: string;
    spriteAsset: string;
    aiProfileId: string;
    dialogue: TrainerDialogue;
    team: IndividualDemon[];
    rewards: TrainerRewards;
    isRematchable: boolean;
}