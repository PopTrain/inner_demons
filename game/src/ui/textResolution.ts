/**
 * The resolution new Text/LocalizedText should render at to stay crisp.
 *
 * Plain devicePixelRatio isn't enough here: Pixi rasterizes Text to a canvas
 * at its own resolution *before* any further scaling, but every screen's
 * `ui` container is itself scaled up from the fixed UI_VIRTUAL_WIDTH/HEIGHT
 * virtual space to the screen's actual pixel size (see Screen.resize) - a
 * non-integer factor that's usually well above 1. Left at devicePixelRatio
 * alone, text gets rasterized under-sized and then GPU-upscaled on top of
 * that, which is what reads as blurry regardless of how crisp the font
 * itself is at its native size.
 *
 * Screen.resize() keeps this updated to devicePixelRatio * the current
 * virtual-to-real scale factor; new Text picks up whatever's current here
 * at creation time (see LocalizedText).
 */
let resolution = 1;

export function getTextResolution(): number {
  return resolution;
}

export function setTextResolution(value: number): void {
  // Guard against a container mid-layout reporting a zero/negative size
  // (e.g. a resize firing before the browser has settled the DOM) - Text
  // rendered at a bogus resolution would be unreadable outright rather than
  // just soft, and this value stays live until the next real resize.
  if (Number.isFinite(value) && value > 0) resolution = value;
}
