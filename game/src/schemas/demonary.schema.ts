export interface DemonaryLore {
    heightMeters: number;
    weightKg: number;
}

export interface DemonaryHabitat {
    locationId: Array<string>;
    timeOfDay:
        | 'Day'
        | 'Night'
        | 'Any';
    typeOfWeather?:
        | 'Clear'
        | 'Rain'
        | 'Snow'
        | 'Sandstorm';
    rarity:
        | 'Common'
        | 'Uncommon'
        | 'Rare'
        | 'Mythic';
}

export interface DemonaryEntry {
    speciesId: string;
    demonaryNumber: number;
    lore: DemonaryLore;
    habitat: DemonaryHabitat;
}

export type DemonaryDatabase = Record<string, DemonaryEntry>