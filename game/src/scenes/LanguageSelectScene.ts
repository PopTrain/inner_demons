import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { GameEngine } from "@/core/GameEngine";
import type { GameScene } from "@/core/Scene";
import type { Button } from "@/core/InputManager";
import { UI_VIRTUAL_WIDTH, UI_VIRTUAL_HEIGHT } from "@/core/Screen";
import { PIXEL_FONT_FAMILY } from "@/ui/fonts";
import { LocalizedText } from "@/ui/LocalizedText";
import { MenuList } from "@/ui/MenuList";
import { getTextResolution } from "@/ui/textResolution";
import { LocaleManager } from "@/i18n/LocaleManager";
import { LOCALE_IDS, LOCALE_LABELS, type LocaleId } from "@/i18n/types";

const LIST_TOP = 76;
const ROW_X = 24;

/**
 * A bottom-screen overlay for picking the active language. Moving the
 * cursor previews the locale live (every LocalizedText on screen updates
 * immediately); Confirm keeps it, Cancel/Menu reverts to whatever was
 * active before this scene opened.
 *
 * Adds all of its own content under a private `root` Container rather than
 * directly to `screen.ui`, and only ever removes/destroys that root on
 * exit - `ui` is shared with whatever scene this overlays (still paused
 * underneath, not exited), so clearing the whole container would wrongly
 * wipe that scene's own content too.
 */
export class LanguageSelectScene implements GameScene {
  private root = new Container();
  private list = new MenuList({ x: ROW_X, y: LIST_TOP });
  private initialLocale: LocaleId = "en";
  private unsubs: Array<() => void> = [];

  onEnter(engine: GameEngine): void {
    this.initialLocale = LocaleManager.instance.locale;

    const backdrop = new Graphics().rect(0, 0, UI_VIRTUAL_WIDTH, UI_VIRTUAL_HEIGHT).fill({ color: 0x0a0a12 });
    backdrop.eventMode = "static"; // swallow taps so they can't fall through to the scene underneath
    this.root.addChild(backdrop);

    const title = new LocalizedText({
      namespace: "ui",
      key: "LANGUAGE.title",
      style: new TextStyle({ fill: 0xffffff, fontSize: 16, fontFamily: PIXEL_FONT_FAMILY }),
    });
    title.position.set(ROW_X, 24);
    this.root.addChild(title);

    const rows = LOCALE_IDS.map((id, i) => {
      const row = new Text({
        text: LOCALE_LABELS[id],
        resolution: getTextResolution(),
        style: new TextStyle({ fontSize: 13, fontFamily: PIXEL_FONT_FAMILY }),
      });
      row.eventMode = "static";
      row.cursor = "pointer";
      row.on("pointerdown", () => this.selectAndClose(engine, i));
      return row;
    });
    this.list.setRows(rows);
    this.list.setSelectedIndex(LOCALE_IDS.indexOf(this.initialLocale));
    this.root.addChild(this.list);

    const hint = new LocalizedText({
      namespace: "ui",
      key: "LANGUAGE.hint",
      style: new TextStyle({ fill: 0x8888aa, fontSize: 11, fontFamily: PIXEL_FONT_FAMILY }),
    });
    hint.position.set(ROW_X, UI_VIRTUAL_HEIGHT - 28);
    this.root.addChild(hint);

    engine.stage.bottom.ui.addChild(this.root);

    this.unsubs.push(engine.input.bus.on("buttonDown", (button) => this.onButton(button, engine)));
  }

  private onButton(button: Button, engine: GameEngine): void {
    if (engine.scenes.current !== this) return; // ignore input while another overlay is stacked on top of us

    switch (button) {
      case "up":
        this.moveCursor(-1);
        break;
      case "down":
        this.moveCursor(1);
        break;
      case "confirm":
        engine.scenes.pop();
        break;
      case "cancel":
      case "menu":
        LocaleManager.instance.setLocale(this.initialLocale);
        engine.scenes.pop();
        break;
    }
  }

  private moveCursor(delta: number): void {
    this.list.moveCursor(delta);
    const next = LOCALE_IDS[this.list.selectedIndex];
    if (next) LocaleManager.instance.setLocale(next); // live preview as the cursor moves
  }

  private selectAndClose(engine: GameEngine, index: number): void {
    if (engine.scenes.current !== this) return;
    const id = LOCALE_IDS[index];
    if (id) LocaleManager.instance.setLocale(id);
    engine.scenes.pop();
  }

  update(): void {
    // Static overlay - nothing to animate.
  }

  onExit(engine: GameEngine): void {
    engine.stage.bottom.ui.removeChild(this.root);
    this.root.destroy({ children: true });
    this.unsubs.forEach((u) => u());
  }
}
