/** Matches the column headers in every public/locales/*.csv file exactly. */
export const LOCALE_IDS = ["en", "es-EU", "es-LA", "pt-EU", "pt-LA", "fr"] as const;
export type LocaleId = (typeof LOCALE_IDS)[number];

/** Each language's own name for itself, shown in the language picker regardless of the active locale. */
export const LOCALE_LABELS: Record<LocaleId, string> = {
  en: "English",
  "es-EU": "Español (España)",
  "es-LA": "Español (Latinoamérica)",
  "pt-EU": "Português (Portugal)",
  "pt-LA": "Português (Brasil)",
  fr: "Français",
};

/** One entry per public/locales/*.csv file (basename, no extension). */
export const LOCALE_NAMESPACES = [
  "battle",
  "crops",
  "demon_forms",
  "demonary",
  "demons",
  "items",
  "mementos",
  "moves",
  "names",
  "personalities",
  "personality_traits",
  "phone",
  "region_map",
  "text",
  "trainer_types",
  "trainers",
  "types",
  "ui",
] as const;
export type LocaleNamespace = (typeof LOCALE_NAMESPACES)[number];
