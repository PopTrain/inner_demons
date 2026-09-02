export type ItemCategory =
    | 'Medicine'
    | 'Battle'
    | 'Capture'
    | 'Treasure'
    | 'Crop'
    | 'Manuals'
    | 'Key';

export type ItemTarget = 'ACTIVE_DEMON' | 'PARTY_DEMON' | 'OPPONENT' | 'FIELD' | 'NONE';

export type ItemId = string;

export interface ItemEffectPayload {
    target: ItemTarget;
    healAmount?: number;
    healPercentage?: number;
    curesStatus?: string[];
    revives?: boolean;
    statModifier?: { stat: string, stages: number };
    captureRateMultiplier?: number;
}

export interface GameItem {
    itemId: ItemId;
    category: ItemCategory;
    buyPrice: number;
    sellPrice: number;
    isConsumable: boolean;
    maxStack: number;
    effectPayload?: ItemEffectPayload;
}