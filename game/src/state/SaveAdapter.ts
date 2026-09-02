/** Platform-agnostic persistence. Swap the implementation per-platform without touching game code. */
export interface SaveAdapter {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Web/Electron-renderer default. Capacitor builds should provide a Preferences-backed adapter instead. */
export class LocalStorageSaveAdapter implements SaveAdapter {
  async read(key: string): Promise<string | null> {
    return window.localStorage.getItem(key);
  }

  async write(key: string, value: string): Promise<void> {
    window.localStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    window.localStorage.removeItem(key);
  }
}
