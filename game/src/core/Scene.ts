import type { GameEngine } from "./GameEngine";

/**
 * A GameScene owns both screens at once (like a DS Pokemon game state does:
 * e.g. "Overworld" = 3D field on top + touch map on bottom). Scenes are
 * pushed/popped on the SceneManager stack; only the top of the stack updates.
 */
export interface GameScene {
  onEnter(engine: GameEngine): void | Promise<void>;
  onExit(engine: GameEngine): void;
  update(dt: number, engine: GameEngine): void;
}
