import { Container, Graphics } from "pixi.js";
import { PIXEL_FONT_FAMILY } from "@/ui/fonts";
import { LocalizedText } from "@/ui/LocalizedText";

export type BackButtonOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

const DEFAULT_WIDTH = 56;
const DEFAULT_HEIGHT = 18;
const NORMAL_FILL = 0x22222f;
const HOVER_FILL = 0x33334a;
const TEXT_FILL = 0xaaaaaa;

/**
 * A small tappable "Back" button for bottom-screen overlays (main menu,
 * settings, ...). The bottom screen is the touch-primary one, so every
 * overlay it hosts needs a way to close that doesn't require a physical
 * Cancel/Menu button - this is that, wired the same way MenuGrid's cells
 * are (a white-filled background retinted via `.tint` for hover, since a
 * redraw would re-tessellate the rounded rect on every state change).
 */
export class BackButton extends Container {
  private readonly background: Graphics;

  /** Fired on click/tap. Scenes wire this to the same pop() their Cancel/Menu button handling already does. */
  onActivate?: () => void;

  constructor(options: BackButtonOptions = {}) {
    super();
    const width = options.width ?? DEFAULT_WIDTH;
    const height = options.height ?? DEFAULT_HEIGHT;
    this.position.set(options.x ?? 0, options.y ?? 0);

    this.background = new Graphics().roundRect(0, 0, width, height, 5).fill(0xffffff);
    this.background.tint = NORMAL_FILL;
    this.background.eventMode = "static";
    this.background.cursor = "pointer";
    this.background.on("pointerover", () => (this.background.tint = HOVER_FILL));
    this.background.on("pointerout", () => (this.background.tint = NORMAL_FILL));
    this.background.on("pointertap", () => this.onActivate?.());
    this.addChild(this.background);

    const label = new LocalizedText({
      namespace: "ui",
      key: "COMMON.back",
      style: { fill: TEXT_FILL, fontSize: 11, fontFamily: PIXEL_FONT_FAMILY },
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(width / 2, height / 2);
    // "none", not the default "passive" - see the matching comment in
    // MenuGrid.buildCell for why a passive label sitting on top of an
    // interactive background blocks hit-testing from ever reaching it.
    label.eventMode = "none";
    this.addChild(label);
  }
}
