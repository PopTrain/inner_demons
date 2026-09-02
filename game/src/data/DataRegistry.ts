import type { DemonSpeciesSchema } from "@/schemas/demon.schema";
import type { DemonMoveSchema } from "@/schemas/move.schema";
import type { ElementalTypeSchema } from "@/schemas/type-chart.schema";
import type { GameItem } from "@/schemas/item.schema";
import type { DemonPersonality } from "@/schemas/personality.schema";
import type { PersonalityTrait } from "@/schemas/personality-traits.schema";
import type { StatusEffectDefinition } from "@/schemas/status-effects.schema";

/** Base path the JSON data files are served from (Vite's /public passthrough). */
const DATA_BASE = "data";

async function loadJson<T>(file: string): Promise<T> {
  const res = await fetch(`${DATA_BASE}/${file}`);
  if (!res.ok) {
    throw new Error(`Failed to load data file "${file}": ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * Loads and indexes every static data table the game needs. Shapes are the
 * canonical interfaces from src/schemas - /public/data holds the actual
 * content, typed against those schemas rather than a parallel copy of them.
 *
 * Note: personality_traits.json and status_effects.json are currently still
 * placeholder stubs ({} per entry) that don't populate the required fields
 * PersonalityTrait/StatusEffectDefinition now declare (trigger, effectPayload,
 * preventsAction, etc.). They load without error but callers that read those
 * fields will get `undefined` until that data is authored.
 *
 * Call `DataRegistry.load()` once during boot before any scene reads from it.
 */
export class DataRegistry {
  private static _instance: DataRegistry | null = null;

  private demons = new Map<string, DemonSpeciesSchema>();
  private moves = new Map<string, DemonMoveSchema>();
  private types = new Map<string, ElementalTypeSchema>();
  private items = new Map<string, GameItem>();
  private personalities = new Map<string, DemonPersonality>();
  private personalityTraits = new Map<string, PersonalityTrait>();
  private statusEffects = new Map<string, StatusEffectDefinition>();

  private constructor() {}

  static get instance(): DataRegistry {
    if (!this._instance) this._instance = new DataRegistry();
    return this._instance;
  }

  static async load(): Promise<DataRegistry> {
    const reg = DataRegistry.instance;

    const [demons, moves, types, items, personalities, personalityTraits, statusEffects] =
      await Promise.all([
        loadJson<Record<string, DemonSpeciesSchema>>("demons.json"),
        loadJson<Record<string, DemonMoveSchema>>("moves.json"),
        loadJson<Record<string, ElementalTypeSchema>>("types.json"),
        loadJson<Record<string, GameItem>>("items.json"),
        loadJson<Record<string, DemonPersonality>>("personalities.json"),
        loadJson<Record<string, PersonalityTrait>>("personality_traits.json"),
        loadJson<Record<string, StatusEffectDefinition>>("status_effects.json"),
      ]);

    reg.index(reg.demons, demons);
    reg.index(reg.moves, moves);
    reg.index(reg.types, types);
    reg.index(reg.items, items);
    reg.index(reg.personalities, personalities);
    reg.index(reg.personalityTraits, personalityTraits);
    reg.index(reg.statusEffects, statusEffects);

    return reg;
  }

  private index<T>(target: Map<string, T>, source: Record<string, T>): void {
    target.clear();
    for (const [key, value] of Object.entries(source)) {
      target.set(key, value);
    }
  }

  getDemon(id: string): DemonSpeciesSchema {
    const v = this.demons.get(id.toUpperCase());
    if (!v) throw new Error(`Unknown demon species "${id}"`);
    return v;
  }

  tryGetDemon(id: string): DemonSpeciesSchema | undefined {
    return this.demons.get(id.toUpperCase());
  }

  getMove(id: string): DemonMoveSchema {
    const v = this.moves.get(id.toUpperCase());
    if (!v) throw new Error(`Unknown move "${id}"`);
    return v;
  }

  getType(id: string): ElementalTypeSchema {
    const v = this.types.get(id.toUpperCase());
    if (!v) throw new Error(`Unknown elemental type "${id}"`);
    return v;
  }

  getItem(id: string): GameItem {
    const v = this.items.get(id.toUpperCase());
    if (!v) throw new Error(`Unknown item "${id}"`);
    return v;
  }

  getPersonality(id: string): DemonPersonality {
    const v = this.personalities.get(id.toUpperCase());
    if (!v) throw new Error(`Unknown personality "${id}"`);
    return v;
  }

  allDemons(): DemonSpeciesSchema[] {
    return [...this.demons.values()];
  }

  allMoves(): DemonMoveSchema[] {
    return [...this.moves.values()];
  }

  allTypes(): ElementalTypeSchema[] {
    return [...this.types.values()];
  }
}
