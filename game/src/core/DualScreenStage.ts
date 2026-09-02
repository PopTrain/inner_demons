import { Screen } from "./Screen";

/** Logical resolution per screen, DS/3DS-proportioned (4:3-ish top, square-ish bottom). */
const TOP_ASPECT = 4 / 3;
const BOTTOM_ASPECT = 4 / 3;
const GAP_PX = 4;

export type LayoutMode = "stacked" | "side-by-side";

/**
 * Owns the two Screens (top/bottom) and the DOM layout that mimics a DS/3DS:
 * stacked vertically by default (mobile portrait, and desktop by choice),
 * with a side-by-side mode available for wide desktop/Electron windows.
 */
export class DualScreenStage {
  readonly root: HTMLElement;
  readonly top: Screen;
  readonly bottom: Screen;

  private frame: HTMLDivElement;
  private mode: LayoutMode = "stacked";

  constructor(root: HTMLElement) {
    this.root = root;
    root.style.display = "flex";
    root.style.alignItems = "center";
    root.style.justifyContent = "center";
    root.style.width = "100%";
    root.style.height = "100%";

    this.frame = document.createElement("div");
    this.frame.style.display = "flex";
    this.frame.style.gap = `${GAP_PX}px`;
    root.appendChild(this.frame);

    this.top = new Screen("top");
    this.bottom = new Screen("bottom");
    this.frame.appendChild(this.top.container);
    this.frame.appendChild(this.bottom.container);

    window.addEventListener("resize", () => this.layout());
    this.watchDevicePixelRatio();
  }

  /**
   * `resize` doesn't fire when the window is dragged to a different-DPI
   * monitor without changing size (or the OS display scale changes in
   * place), which would otherwise leave both renderers rasterizing at a
   * stale pixel ratio. matchMedia's resolution query re-fires exactly when
   * devicePixelRatio changes; each firing re-subscribes at the new value.
   */
  private watchDevicePixelRatio(): void {
    const mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mql.addEventListener(
      "change",
      () => {
        this.layout();
        this.watchDevicePixelRatio();
      },
      { once: true },
    );
  }

  async ready(): Promise<void> {
    await Promise.all([this.top.ready(), this.bottom.ready()]);
    this.layout();
  }

  setMode(mode: LayoutMode): void {
    this.mode = mode;
    this.layout();
  }

  private layout(): void {
    const viewportW = this.root.clientWidth;
    const viewportH = this.root.clientHeight;
    const auto = this.mode === "stacked" || viewportW < viewportH ? "stacked" : this.mode;

    if (auto === "stacked") {
      this.frame.style.flexDirection = "column";
      // Fit two stacked screens (with a gap) inside the viewport, each keeping its own aspect ratio.
      const maxWByHeight = viewportH - GAP_PX;
      let width = Math.min(viewportW, maxWByHeight / (1 / TOP_ASPECT + 1 / BOTTOM_ASPECT));
      let topH = width / TOP_ASPECT;
      let botH = width / BOTTOM_ASPECT;

      if (topH + botH + GAP_PX > viewportH) {
        const scale = (viewportH - GAP_PX) / (topH + botH);
        width *= scale;
        topH *= scale;
        botH *= scale;
      }

      this.applySize(this.top, width, topH);
      this.applySize(this.bottom, width, botH);
    } else {
      this.frame.style.flexDirection = "row";
      const maxHByWidth = viewportW - GAP_PX;
      let height = Math.min(viewportH, maxHByWidth / (TOP_ASPECT + BOTTOM_ASPECT));
      let topW = height * TOP_ASPECT;
      let botW = height * BOTTOM_ASPECT;

      if (topW + botW + GAP_PX > viewportW) {
        const scale = (viewportW - GAP_PX) / (topW + botW);
        height *= scale;
        topW *= scale;
        botW *= scale;
      }

      this.applySize(this.top, topW, height);
      this.applySize(this.bottom, botW, height);
    }
  }

  private applySize(screen: Screen, width: number, height: number): void {
    screen.container.style.width = `${width}px`;
    screen.container.style.height = `${height}px`;
    screen.resize(width, height);
  }

  renderFrame(): void {
    this.top.renderFrame();
    this.bottom.renderFrame();
  }
}
