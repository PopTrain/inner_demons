import type { GameEngine } from "./GameEngine";
import type { GameScene } from "./Scene";

/** Stack-based scene management. Pushing overlays (e.g. a menu) keeps the scene below paused but alive. */
export class SceneManager {
  private stack: GameScene[] = [];

  constructor(private readonly engine: GameEngine) {}

  get current(): GameScene | undefined {
    return this.stack[this.stack.length - 1];
  }

  async push(scene: GameScene): Promise<void> {
    await scene.onEnter(this.engine);
    this.stack.push(scene);

    // A scene built here (often from a click handler, e.g. opening a menu)
    // adds interactive Graphics whose worldTransform is still identity until
    // they've gone through a render pass - Pixi only computes it then, not
    // on construction. A pointer event landing before the next scheduled
    // frame would hit-test those objects against that identity transform
    // and silently miss. Rendering synchronously here closes that gap to
    // zero instead of leaving it to the next tick.
    this.engine.stage.renderFrame();
  }

  pop(): void {
    const scene = this.stack.pop();
    scene?.onExit(this.engine);
  }

  async replace(scene: GameScene): Promise<void> {
    while (this.stack.length > 0) this.pop();
    await this.push(scene);
  }

  update(dt: number): void {
    this.current?.update(dt, this.engine);
  }
}
