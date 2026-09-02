/** The game's pixel font (public/fonts/FSEX302.ttf = Fixedsys Excelsior 3.02). */
export const PIXEL_FONT_FAMILY = "Fixedsys Excelsior";

/**
 * Loads the pixel font via the FontFace API and waits for it to be ready.
 * PixiJS Text renders to a canvas immediately using whatever font is
 * available at creation time and won't retroactively swap fonts once a
 * @font-face finishes downloading, so this must be awaited before any scene
 * creates Text using PIXEL_FONT_FAMILY (GameEngine.boot() does this).
 */
export async function loadFonts(): Promise<void> {
  const font = new FontFace(PIXEL_FONT_FAMILY, "url(/fonts/FSEX302.ttf)");
  await font.load();
  document.fonts.add(font);
}
