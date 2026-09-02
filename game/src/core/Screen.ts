import { Application as PixiApplication, Container, Rectangle } from "pixi.js";
import * as THREE from "three";
import { setTextResolution } from "@/ui/textResolution";

export type ScreenName = "top" | "bottom";

/**
 * Fixed virtual coordinate space every scene's 2D content is authored
 * against, regardless of the screen's actual pixel size. Matches
 * DualScreenStage's TOP_ASPECT/BOTTOM_ASPECT (4/3) - keep them in sync.
 * Scenes should add children to `screen.ui` (not `screen.pixi.stage`
 * directly) and position them in these units.
 */
export const UI_VIRTUAL_WIDTH = 400;
export const UI_VIRTUAL_HEIGHT = 300;

/**
 * One physical DS-style screen. Composites a ThreeJS canvas (3D world/battle
 * content) behind a transparent PixiJS canvas (2D sprites/UI) so scenes can
 * freely mix both renderers on either screen.
 *
 * Three owns perspective 3D content; Pixi owns everything flat (HUD, menus,
 * dialogue, touch controls). Most scenes will only use one of the two per
 * screen, but both are always available.
 */
export class Screen {
  readonly name: ScreenName;
  readonly container: HTMLDivElement;

  readonly pixi: PixiApplication;
  readonly three: {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
  };

  /**
   * 2D content root, scaled and centered to fill the screen's actual pixel
   * size every resize while staying UI_VIRTUAL_WIDTH x UI_VIRTUAL_HEIGHT
   * internally - so content authored at fixed virtual coordinates stays in
   * the same place (proportionally) whether the window is at its default
   * fixed size, maximized, or fullscreen, instead of staying pinned to the
   * top-left corner of a now-larger canvas.
   */
  readonly ui: Container;

  private pixiReady: Promise<void>;

  constructor(name: ScreenName) {
    this.name = name;

    this.container = document.createElement("div");
    this.container.className = `screen screen-${name}`;
    this.container.style.position = "relative";
    this.container.style.width = "100%";
    this.container.style.overflow = "hidden";
    this.container.style.background = "#0a0a0f";

    const threeCanvas = document.createElement("canvas");
    threeCanvas.style.position = "absolute";
    threeCanvas.style.inset = "0";
    this.container.appendChild(threeCanvas);

    const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    this.three = { renderer, scene, camera };

    this.ui = new Container();

    this.pixi = new PixiApplication();
    this.pixiReady = this.pixi.init({
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: this.container,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      // Driven explicitly from renderFrame() instead - see the comment there.
      autoStart: false,
    }).then(() => {
      this.pixi.canvas.style.position = "absolute";
      this.pixi.canvas.style.inset = "0";
      this.pixi.canvas.style.pointerEvents = "auto";
      this.container.appendChild(this.pixi.canvas);

      // Full-canvas hit area: without an explicit hitArea, Pixi only counts
      // pointer events that land on top of a visible child's own bounds, so
      // taps on empty background wouldn't register. resize() keeps this
      // sized to the screen's actual (non-virtual) pixel dimensions.
      this.pixi.stage.eventMode = "static";
      this.pixi.stage.addChild(this.ui);
    });
  }

  async ready(): Promise<void> {
    await this.pixiReady;
  }

  resize(width: number, height: number): void {
    // Re-read on every resize, not just at construction: maximizing/entering
    // fullscreen can move the window onto a monitor with a different DPI
    // (or the OS scale factor can change), and both renderers must match
    // the *current* device pixel ratio to stay crisp instead of blurring.
    const dpr = window.devicePixelRatio || 1;

    this.three.renderer.setPixelRatio(dpr);
    this.three.renderer.setSize(width, height, false);
    this.three.camera.aspect = width / Math.max(height, 1);
    this.three.camera.updateProjectionMatrix();

    // resizeTo (ResizeObserver) fires asynchronously, which races scenes that
    // read pixi.screen.width/height during onEnter. Resize synchronously too
    // so the size is always correct by the time a scene starts building UI.
    if (this.pixi.renderer) {
      this.pixi.renderer.resolution = dpr;
      this.pixi.renderer.resize(width, height);
      this.pixi.stage.hitArea = new Rectangle(0, 0, width, height);

      // Uniform scale (virtual aspect always matches the screen's own, per
      // DualScreenStage, so this never needs to letterbox) plus centering
      // for rounding safety - this is what keeps `ui` content in the same
      // relative spot at any window size instead of pinned to the corner.
      const scale = Math.min(width / UI_VIRTUAL_WIDTH, height / UI_VIRTUAL_HEIGHT);
      this.ui.scale.set(scale);
      this.ui.x = (width - UI_VIRTUAL_WIDTH * scale) / 2;
      this.ui.y = (height - UI_VIRTUAL_HEIGHT * scale) / 2;

      // Keep new Text rendering at a resolution that matches how much this
      // screen's ui content actually gets magnified - see textResolution.ts.
      setTextResolution(dpr * scale);
    }
  }

  renderFrame(): void {
    this.three.renderer.render(this.three.scene, this.three.camera);

    // autoStart is off (see init above) so Pixi doesn't also run its own
    // private ticker in parallel with this one - one render authority per
    // frame, driven by the same loop that just updated scene state, instead
    // of two independently-scheduled rAF loops both painting the same canvas.
    if (this.pixi.renderer) this.pixi.render();
  }
}
