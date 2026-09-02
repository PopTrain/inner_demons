import { parseCsv } from "./csv";
import { LOCALE_IDS, LOCALE_NAMESPACES, type LocaleId, type LocaleNamespace } from "./types";

const LOCALE_STORAGE_KEY = "inner-demons:locale";
const DEFAULT_LOCALE: LocaleId = "en";

type LocaleEntry = Partial<Record<LocaleId, string>>;
type Listener = (locale: LocaleId) => void;

/** A resolver for a `\command` escape code - called fresh every time it's encountered, so it can read live state. */
export type LocaleCommandResolver = () => string;

/**
 * Values `{token}` placeholders can substitute: named (`{name}`) or
 * positional/numbered (`{1}`) - both are just object keys, so `{1: "Rookeen"}`
 * and `{name: "Rookeen"}` work the same way. Pass whatever value the caller
 * has on hand; there's no separate global "variable slot" registry.
 */
export type LocaleVars = Record<string | number, string | number>;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Loads every public/locales/*.csv file and serves translated strings for
 * the active locale, with a live "locale changed" notification so already-
 * rendered text (see LocalizedText) can update itself in place - no scene
 * reload needed to switch languages.
 *
 * t() also resolves two kinds of tokens inside the translated string:
 *  - `{token}` placeholders, filled from the `vars` argument (by name or by
 *    number, e.g. "Party: {name} Lv.{level}" or "You found {1}!").
 *  - `\command` escape codes, filled by resolvers registered via
 *    registerCommand() (e.g. `\pn` for the player's name). `\n` (forced
 *    newline) is built in. Resolvers are called at render time, not at
 *    registration time, so they always reflect current state.
 *
 * Most non-English columns in the source CSVs are still blank placeholders;
 * t() falls back to English (then to a visible `[namespace:key]` marker) so
 * missing translations degrade instead of rendering empty strings.
 */
export class LocaleManager {
  private static _instance: LocaleManager | null = null;

  static get instance(): LocaleManager {
    if (!this._instance) this._instance = new LocaleManager();
    return this._instance;
  }

  private tables = new Map<LocaleNamespace, Map<string, LocaleEntry>>();
  private listeners = new Set<Listener>();
  private currentLocale: LocaleId = DEFAULT_LOCALE;

  private commands = new Map<string, LocaleCommandResolver>();
  private tokenPattern: RegExp | null = null;

  private constructor() {
    this.registerCommand("n", () => "\n");
  }

  get locale(): LocaleId {
    return this.currentLocale;
  }

  static async load(): Promise<LocaleManager> {
    const mgr = LocaleManager.instance;
    await Promise.all(LOCALE_NAMESPACES.map((ns) => mgr.loadNamespace(ns)));

    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    mgr.currentLocale = mgr.isLocaleId(saved) ? saved : mgr.detectBrowserLocale();

    return mgr;
  }

  private async loadNamespace(namespace: LocaleNamespace): Promise<void> {
    const res = await fetch(`locales/${namespace}.csv`);
    if (!res.ok) {
      throw new Error(`Failed to load locale file "${namespace}.csv": ${res.status} ${res.statusText}`);
    }

    const rows = parseCsv(await res.text());
    const header = rows[0];
    if (!header) return;

    // header[0] is "KEY"; the rest are locale ids in file-column order.
    const columnLocales = header.slice(1);
    const table = new Map<string, LocaleEntry>();

    for (const row of rows.slice(1)) {
      const key = row[0];
      if (!key) continue;

      const entry: LocaleEntry = {};
      for (let i = 0; i < columnLocales.length; i++) {
        const localeId = columnLocales[i];
        const value = row[i + 1];
        if (localeId && value && this.isLocaleId(localeId)) entry[localeId] = value;
      }
      table.set(key, entry);
    }

    this.tables.set(namespace, table);
  }

  private isLocaleId(value: string | null | undefined): value is LocaleId {
    return !!value && (LOCALE_IDS as readonly string[]).includes(value);
  }

  private detectBrowserLocale(): LocaleId {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const exact = LOCALE_IDS.find((id) => id.toLowerCase() === lang.toLowerCase());
      if (exact) return exact;

      const base = lang.split("-")[0]?.toLowerCase();
      const baseMatch = LOCALE_IDS.find((id) => id.split("-")[0]?.toLowerCase() === base);
      if (baseMatch) return baseMatch;
    }
    return DEFAULT_LOCALE;
  }

  setLocale(locale: LocaleId): void {
    if (locale === this.currentLocale) return;
    this.currentLocale = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    for (const listener of [...this.listeners]) listener(locale);
  }

  /** Notified on every setLocale() call - LocalizedText uses this to refresh its own content. */
  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Registers a `\name` escape code (case-insensitive). The resolver is
   * called fresh every time the code is encountered in a rendered string,
   * so e.g. `\pn` can be wired to read the player's *current* name rather
   * than whatever it was when the command was registered.
   */
  registerCommand(name: string, resolver: LocaleCommandResolver): void {
    this.commands.set(name.toLowerCase(), resolver);
    this.tokenPattern = null; // invalidate the cached matcher
  }

  t(namespace: LocaleNamespace, key: string, vars?: LocaleVars): string {
    const entry = this.tables.get(namespace)?.get(key);
    const raw = entry?.[this.currentLocale] ?? entry?.[DEFAULT_LOCALE] ?? `[${namespace}:${key}]`;
    return this.process(raw, vars);
  }

  private process(template: string, vars?: LocaleVars): string {
    return template.replace(this.getTokenPattern(), (match, command?: string, placeholder?: string) => {
      if (command !== undefined) {
        const resolver = this.commands.get(command.toLowerCase());
        return resolver ? resolver() : match;
      }
      if (placeholder !== undefined) {
        const value = vars?.[placeholder];
        return value !== undefined ? String(value) : match;
      }
      return match;
    });
  }

  /**
   * Matches either a known `\command` or a `{placeholder}`. Command names
   * are matched as an exact alternation (longest first, e.g. "pn" before a
   * hypothetical "p") rather than a generic `\[a-z]+` - that would greedily
   * swallow the run of letters starting the very next word too (`\n` right
   * before "Your" would otherwise become the single unknown command
   * "nYour" instead of stopping right after "n").
   */
  private getTokenPattern(): RegExp {
    if (!this.tokenPattern) {
      const names = [...this.commands.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
      const commandAlt = names.length > 0 ? `\\\\(${names.join("|")})` : null;
      const placeholderAlt = `\\{(\\w+)\\}`;
      this.tokenPattern = new RegExp(commandAlt ? `${commandAlt}|${placeholderAlt}` : placeholderAlt, "gi");
    }
    return this.tokenPattern;
  }
}
