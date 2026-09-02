import { ImageSource, Texture } from "pixi.js";

export type GraphicsCategory = "characters" | "demons" | "items" | "tilesets" | "ui";

const GRAPHICS_BASE_PATH: Record<GraphicsCategory, string> = {
  characters: "graphics/characters",
  demons: "graphics/demons",
  items: "graphics/items",
  tilesets: "graphics/tilesets",
  ui: "graphics/ui",
};

export interface GraphicsRef {
  category: GraphicsCategory;
  /** File name without extension, relative to the category's folder - may include subfolders, e.g. "dialogue_box/dialogue_box". */
  name: string;
}

/**
 * Loads the game's 2D art (public/graphics/<category>/<name>.png) as
 * GPU-ready textures rather than handing scenes a raw <img> to size and
 * scale themselves. Every source image is decoded once via createImageBitmap
 * - off the main thread where the browser supports it - so decode cost
 * doesn't stall a scene transition, then wrapped in a Pixi ImageSource
 * forced to 'nearest' scaling: pixel art must never be smoothed, and Pixi's
 * default ('linear') blurs hard pixel edges whenever a sprite is scaled or
 * doesn't land on an integer pixel boundary.
 *
 * Mirrors AudioManager's fetch-once/decode-once/cache-forever shape: each
 * texture loads at most once per session and is shared by every sprite that
 * asks for it. This class only owns the texture cache - use SpriteFactory to
 * turn a loaded texture into something you actually put on stage.
 */
export class GraphicsManager {
  private static _instance: GraphicsManager | null = null;

  static get instance(): GraphicsManager {
    if (!this._instance) this._instance = new GraphicsManager();
    return this._instance;
  }

  private readonly textureCache = new Map<string, Promise<Texture>>();

  private constructor() {}

  private keyOf(ref: GraphicsRef): string {
    return `${ref.category}/${ref.name}`;
  }

  /** Loads (or returns the already-cached/in-flight) texture for a graphics asset. */
  getTexture(ref: GraphicsRef): Promise<Texture> {
    const key = this.keyOf(ref);
    let promise = this.textureCache.get(key);
    if (!promise) {
      promise = this.loadTexture(ref, key);
      // Don't cache a rejected load - a later retry (e.g. after adding the missing file) should try again.
      promise.catch(() => this.textureCache.delete(key));
      this.textureCache.set(key, promise);
    }
    return promise;
  }

  /** Warms the cache for a batch of assets, e.g. before a scene that needs them all ready at once. */
  async preload(refs: GraphicsRef[]): Promise<void> {
    await Promise.all(refs.map((ref) => this.getTexture(ref)));
  }

  private async loadTexture(ref: GraphicsRef, key: string): Promise<Texture> {
    const res = await fetch(`${GRAPHICS_BASE_PATH[ref.category]}/${ref.name}.png`);
    if (!res.ok) {
      throw new Error(`Failed to load graphic "${key}.png": ${res.status} ${res.statusText}`);
    }
    const bitmap = await createImageBitmap(await res.blob());

    return new Texture({
      source: new ImageSource({
        resource: bitmap,
        scaleMode: "nearest",
        // Matches Pixi's own image loader: the bitmap keeps straight alpha and
        // gets premultiplied during the GPU upload step instead.
        alphaMode: "premultiply-alpha-on-upload",
        label: key,
      }),
      label: key,
    });
  }

  /** Releases every cached texture (and its decoded bitmap) and clears the cache. */
  dispose(): void {
    for (const promise of this.textureCache.values()) {
      promise.then((texture) => texture.destroy(true)).catch(() => {});
    }
    this.textureCache.clear();
  }
}
