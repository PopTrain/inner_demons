import type { FlagVariablePayload } from "@/schemas/flag.schema";
import type { SaveAdapter } from "./SaveAdapter";

type Listener = (key: string) => void;

const SAVE_KEY = "inner-demons:save";
const DEFAULT_PLAYER_NAME = "Trainer";

/**
 * Runtime store for story flags, numeric variables, and the player's chosen
 * name, seeded from /public/data/flags.json and persisted through a
 * SaveAdapter. Unknown flags/variables are allowed (quests etc. add new keys
 * at runtime) but anything present in flags.json defines the starting shape.
 */
export class GameState {
  private flags = new Map<string, boolean>();
  private variables = new Map<string, number>();
  private playerName: string | null = null;
  private listeners = new Set<Listener>();

  constructor(private readonly saveAdapter: SaveAdapter) {}

  static async createFromDefaults(saveAdapter: SaveAdapter): Promise<GameState> {
    const state = new GameState(saveAdapter);
    const res = await fetch("data/flags.json");
    const defaults = (await res.json()) as FlagVariablePayload;
    for (const [k, v] of Object.entries(defaults.flags)) state.flags.set(k, v);
    for (const [k, v] of Object.entries(defaults.variables)) state.variables.set(k, v);
    state.playerName = defaults.playerName ?? null;
    return state;
  }

  getFlag(key: string): boolean {
    return this.flags.get(key) ?? false;
  }

  setFlag(key: string, value: boolean): void {
    this.flags.set(key, value);
    this.notify(key);
  }

  getVariable(key: string): number {
    return this.variables.get(key) ?? 0;
  }

  setVariable(key: string, value: number): void {
    this.variables.set(key, value);
    this.notify(key);
  }

  incrementVariable(key: string, amount = 1): number {
    const next = this.getVariable(key) + amount;
    this.setVariable(key, next);
    return next;
  }

  /** Falls back to a placeholder until the player has actually named themselves (no name-entry UI yet). */
  getPlayerName(): string {
    return this.playerName ?? DEFAULT_PLAYER_NAME;
  }

  setPlayerName(name: string): void {
    this.playerName = name;
    this.notify("playerName");
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(key: string): void {
    for (const l of this.listeners) l(key);
  }

  async save(): Promise<void> {
    const payload: FlagVariablePayload = {
      flags: Object.fromEntries(this.flags),
      variables: Object.fromEntries(this.variables),
      playerName: this.playerName ?? undefined,
    };
    await this.saveAdapter.write(SAVE_KEY, JSON.stringify(payload));
  }

  async load(): Promise<boolean> {
    const raw = await this.saveAdapter.read(SAVE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw) as FlagVariablePayload;
    this.flags = new Map(Object.entries(payload.flags));
    this.variables = new Map(Object.entries(payload.variables));
    this.playerName = payload.playerName ?? null;
    return true;
  }
}
