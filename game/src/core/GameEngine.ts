import { DataRegistry } from "@/data/DataRegistry";
import { GameState } from "@/state/GameState";
import { LocalStorageSaveAdapter } from "@/state/SaveAdapter";
import { loadFonts } from "@/ui/fonts";
import { LocaleManager } from "@/i18n/LocaleManager";
import { AudioManager } from "@/audio/AudioManager";
import { GraphicsManager } from "@/graphics/GraphicsManager";
import { SpriteFactory } from "@/graphics/SpriteFactory";
import { DualScreenStage } from "./DualScreenStage";
import { InputManager } from "./InputManager";
import { SceneManager } from "./SceneManager";
import type { GameScene } from "./Scene";

/**
 * Top-level orchestrator: owns the dual-screen stage, the scene stack,
 * input, data, game state, localization, and audio, and drives the main loop.
 */
export class GameEngine {
  readonly stage: DualScreenStage;
  readonly input: InputManager;
  readonly scenes: SceneManager;
  readonly data: DataRegistry;
  readonly state: GameState;
  readonly locale: LocaleManager;
  readonly audio: AudioManager;
  readonly graphics: GraphicsManager;
  readonly sprites: SpriteFactory;

  private lastTime = 0;
  private rafHandle = 0;

  private constructor(stage: DualScreenStage, data: DataRegistry, state: GameState, locale: LocaleManager) {
    this.stage = stage;
    this.data = data;
    this.state = state;
    this.locale = locale;
    this.audio = AudioManager.instance;
    this.graphics = GraphicsManager.instance;
    this.sprites = new SpriteFactory(this.graphics);
    this.input = new InputManager();
    this.scenes = new SceneManager(this);

    // Browsers suspend AudioContext until a real user gesture; nothing will
    // play until then regardless of what scenes ask for. Resume on whichever
    // comes first, then stop listening.
    const resumeOnce = () => {
      void this.audio.resume();
      unsubButton();
      unsubTouch();
    };
    const unsubButton = this.input.bus.on("buttonDown", resumeOnce);
    const unsubTouch = this.input.bus.on("touch", resumeOnce);
  }

  static async boot(root: HTMLElement): Promise<GameEngine> {
    const stage = new DualScreenStage(root);
    await stage.ready();

    const [data, state, locale] = await Promise.all([
      DataRegistry.load(),
      GameState.createFromDefaults(new LocalStorageSaveAdapter()),
      LocaleManager.load(),
      loadFonts(),
    ]);

    // \pn (and future codes like it) live in LocaleManager as a generic
    // registry so it stays decoupled from GameState - this is where the
    // concrete "player name" behavior actually gets wired in. The resolver
    // re-reads state.getPlayerName() every time \pn is encountered, so it
    // always reflects the current name, not whatever it was at boot.
    locale.registerCommand("pn", () => state.getPlayerName());

    return new GameEngine(stage, data, state, locale);
  }

  async start(initialScene: GameScene): Promise<void> {
    await this.scenes.push(initialScene);
    this.lastTime = performance.now();
    this.rafHandle = requestAnimationFrame(this.tick);
  }

  private tick = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 1 / 15);
    this.lastTime = now;

    // Gamepads have no press/release DOM events - poll once per frame so
    // controller input produces the same buttonDown/buttonUp edges keyboard
    // input already gets natively.
    this.input.pollGamepads();
    this.scenes.update(dt);
    this.stage.renderFrame();

    this.rafHandle = requestAnimationFrame(this.tick);
  };

  stop(): void {
    cancelAnimationFrame(this.rafHandle);
    this.input.dispose();
    this.audio.dispose();
    this.graphics.dispose();
  }
}
