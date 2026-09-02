import { Text, type TextOptions } from "pixi.js";
import { LocaleManager, type LocaleVars } from "@/i18n/LocaleManager";
import type { LocaleNamespace } from "@/i18n/types";
import { getTextResolution } from "@/ui/textResolution";

export type LocalizedTextOptions = Omit<TextOptions, "text"> & {
  namespace: LocaleNamespace;
  key: string;
  vars?: LocaleVars;
};

/**
 * Drop-in replacement for PixiJS `Text` that looks its content up through
 * LocaleManager and re-applies it automatically whenever the active locale
 * changes - every LocalizedText on screen updates live when the player
 * switches languages, no scene reload required. Call destroy() as usual
 * (e.g. via container.removeChildren()'s own destroy, or explicitly) so it
 * unsubscribes instead of leaking a listener.
 */
export class LocalizedText extends Text {
  private readonly namespace: LocaleNamespace;
  private readonly key: string;
  private vars?: LocaleVars;
  private readonly unsubscribe: () => void;

  constructor(options: LocalizedTextOptions) {
    const { namespace, key, vars, ...textOptions } = options;
    // resolution first so an explicit caller-provided value in textOptions still wins.
    super({ resolution: getTextResolution(), ...textOptions, text: LocaleManager.instance.t(namespace, key, vars) });
    this.namespace = namespace;
    this.key = key;
    this.vars = vars;
    this.unsubscribe = LocaleManager.instance.onChange(() => this.refresh());
  }

  /** Update the interpolation variables (e.g. a level-up changing "Lv.{level}") and re-render immediately. */
  setVars(vars: LocaleVars): void {
    this.vars = vars;
    this.refresh();
  }

  private refresh(): void {
    this.text = LocaleManager.instance.t(this.namespace, this.key, this.vars);
  }

  override destroy(options?: Parameters<Text["destroy"]>[0]): void {
    this.unsubscribe();
    super.destroy(options);
  }
}
