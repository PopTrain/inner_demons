import { AnimatedSprite, Rectangle, Sprite, Texture, TilingSprite } from "pixi.js";
import { GraphicsManager, type GraphicsRef } from "./GraphicsManager";

export interface GridSpec {
  frameWidth: number;
  frameHeight: number;
  /** Which cells to use, row-major, left-to-right/top-to-bottom. Defaults to every cell in the sheet. Pass this to reorder frames or pick a subset (e.g. just the "walk down" row of a character sheet). */
  frames?: number[];
}

/**
 * Turns a texture loaded by GraphicsManager into the Pixi display objects
 * scenes actually place on stage. Centralizes the pixel-art presentation
 * settings (roundPixels, so sprites always land on integer screen pixels
 * instead of subpixel-interpolating between two pixel-art texels) so no call
 * site has to remember them, and a blurry/shimmering sprite is a bug to fix
 * in one place instead of at every `new Sprite(...)`.
 */
export class SpriteFactory {
  constructor(private readonly graphics: GraphicsManager = GraphicsManager.instance) {}

  async createSprite(ref: GraphicsRef): Promise<Sprite> {
    const texture = await this.graphics.getTexture(ref);
    return new Sprite({ texture, roundPixels: true });
  }

  /** For repeating/scrolling backgrounds (tileset-backed floors, parallax layers) rather than a single static image. */
  async createTilingSprite(ref: GraphicsRef, width: number, height: number): Promise<TilingSprite> {
    const texture = await this.graphics.getTexture(ref);
    return new TilingSprite({ texture, width, height, roundPixels: true });
  }

  /** Slices a sheet into a `frameWidth x frameHeight` grid and returns an AnimatedSprite over those frames, stopped on the first one - call .play() to start it. */
  async createAnimatedSprite(ref: GraphicsRef, grid: GridSpec): Promise<AnimatedSprite> {
    const textures = await this.sliceGrid(ref, grid);
    return new AnimatedSprite({ textures, roundPixels: true });
  }

  /** Slices a sheet into a `frameWidth x frameHeight` grid of sub-textures without building an AnimatedSprite - useful for picking a single frame out of a sheet (e.g. a character's idle pose). */
  async sliceGrid(ref: GraphicsRef, grid: GridSpec): Promise<Texture[]> {
    const sheet = await this.graphics.getTexture(ref);
    const cols = Math.floor(sheet.width / grid.frameWidth);
    const rows = Math.floor(sheet.height / grid.frameHeight);
    const total = cols * rows;

    const indices = grid.frames ?? Array.from({ length: total }, (_, i) => i);
    return indices.map((index) => {
      if (index < 0 || index >= total) {
        throw new Error(`Frame index ${index} out of range for "${ref.category}/${ref.name}" (${cols}x${rows} grid)`);
      }
      const col = index % cols;
      const row = Math.floor(index / cols);
      return new Texture({
        source: sheet.source,
        frame: new Rectangle(col * grid.frameWidth, row * grid.frameHeight, grid.frameWidth, grid.frameHeight),
        label: `${ref.category}/${ref.name}#${index}`,
      });
    });
  }
}
