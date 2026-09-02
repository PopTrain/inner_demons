export type FlagId = string;
export type VariableId = string;

export interface FlagDefinition {
    id: FlagId;
    description: string;
    defaultValue: boolean;
}

export interface VariableDefinition {
    id: VariableId;
    description: string;
    defaultValue: number;
}

export interface FlagVariablePayload {
    flags: Record <FlagId, boolean>;
    variables: Record<VariableId, number>;
    playerName?: string;
}