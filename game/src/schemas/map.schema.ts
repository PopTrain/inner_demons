export interface MapSchema {
    mapId: string;
    displayName: string;
    gridWidth: number;
    gridHeight: number;
    tileSize: number;
    tilesets: TilesetReference[];
    layers: MapLayer[];
    connections: MapConnection[];
    encounters: EncounterData;
    interactables: MapEntity[];
}

export interface TilesetReference {
    id: string;
    source: string;
    firstGid: number;
}

export interface MapLayer {
    name: string;
    type: "tilelayer" | "objectgroup";
    visible: boolean;
    data?: number[];
    opacity: number;
}

export interface MapConnection {
    targetMapId: string;
    connectionType: "edge" | "warp";
    sourceX?: number;
    sourceY?: number;
    targetX?: number;
    targetY?: number;
    direction?: "north" | "south" | "east" | "west";
    alignmentOffset?: number;
}

export interface EncounterData {
    encounterRate: number;
    zones: EncounterZone[];
}

export interface EncounterZone {
    zoneId: string;
    requiredTerrain: string;
    availableDemons: DemonSpawn[];
}

export interface DemonSpawn {
    speciesId: string;
    minLevel: number;
    maxLevel: number;
    spawnWeight: number;
}

export interface MapEntity {
    entityId: string;
    type: "npc" | "item" | "sign" | "trigger";
    x: number;
    y: number;
    properties: Record<string, any>;
}