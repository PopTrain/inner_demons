import { Container, Graphics, TextStyle } from "pixi.js";
import type { GameEngine } from "@/core/GameEngine";
import type { GameScene } from "@/core/Scene";
import type { Button } from "@/core/InputManager";
import { UI_VIRTUAL_WIDTH, UI_VIRTUAL_HEIGHT } from "@/core/Screen";
import { PIXEL_FONT_FAMILY } from "@/ui/fonts";
import { BackButton } from "@/ui/BackButton";
import { LocalizedText } from "@/ui/LocalizedText";
import { MenuGrid } from "@/ui/MenuGrid";
import { SettingsScene } from "./SettingsScene";

type MenuItemId = "demonary" | "demons" | "bag" | "cyberdeck" | "trainer_card" | "save" | "settings";

interface MenuItemDef {
  id: MenuItemId;
  labelKey: string;
  /** GameState flag gating visibility; omit for items that are always available (Save, Settings). */
  flag?: string;
}

/**
 * demonary/demons/bag/cyberdeck/trainer_card don't have real screens yet -
 * selecting one is currently a no-op. The flag gate (and this list) is the
 * actual deliverable; wire a real onSelect in as each screen gets built.
 */
const MENU_ITEMS: MenuItemDef[] = [
  { id: "demonary", labelKey: "MENU.demonary", flag: "OBTAINED_DEMONARY" },
  { id: "demons", labelKey: "MENU.demons", flag: "OBTAINED_STARTER_DEMON" },
  { id: "bag", labelKey: "MENU.bag", flag: "OBTAINED_BAG" },
  { id: "cyberdeck", labelKey: "MENU.cyberdeck", flag: "OBTAINED_CYBERDECK" },
  { id: "trainer_card", labelKey: "MENU.trainer_card", flag: "OBTAINED_TRAINER_CARD" },
  { id: "save", labelKey: "MENU.save" },
  { id: "settings", labelKey: "MENU.settings" },
];

const GRID_TOP = 60;
const GRID_COLUMNS = 2;
const ROW_X = 24;
const BACK_BUTTON_WIDTH = 56;
const SAVED_MESSAGE_SECONDS = 1.5;

/**
 * The bottom-screen main menu, opened with Start or Menu (Z) from the
 * overworld. Laid out as a 2-column button grid (row-major: demonary/demons,
 * bag/cyberdeck, trainer_card/save, settings alone on the last row) rather
 * than a scrolling list, navigable with the d-pad/arrows (up/down move a
 * row, clamping into short rows; left/right wrap within the current row) or
 * directly with the mouse/touch, which both hovers and clicks cells.
 *
 * demonary/demons/bag/cyberdeck/trainer_card are each gated by a GameState
 * flag: false hides the button entirely (and since a hidden button was never
 * added to the grid, it's un-selectable too - no separate "disabled" state
 * to track). Save and Settings are always shown.
 */
export class MainMenuScene implements GameScene {
  private root = new Container();
  private grid = new MenuGrid({ x: ROW_X, y: GRID_TOP, columns: GRID_COLUMNS });
  private visibleItems: MenuItemDef[] = [];
  private savedLabel?: LocalizedText;
  private savedTimer = 0;
  private unsubs: Array<() => void> = [];

  onEnter(engine: GameEngine): void {
    const backdrop = new Graphics().rect(0, 0, UI_VIRTUAL_WIDTH, UI_VIRTUAL_HEIGHT).fill({ color: 0x0a0a12 });
    backdrop.eventMode = "static";
    this.root.addChild(backdrop);

    const title = new LocalizedText({
      namespace: "ui",
      key: "MENU.title",
      style: new TextStyle({ fill: 0xffffff, fontSize: 16, fontFamily: PIXEL_FONT_FAMILY }),
    });
    title.position.set(ROW_X, 20);
    this.root.addChild(title);

    const backButton = new BackButton({ x: UI_VIRTUAL_WIDTH - ROW_X - BACK_BUTTON_WIDTH, y: 16, width: BACK_BUTTON_WIDTH });
    backButton.onActivate = () => engine.scenes.pop();
    this.root.addChild(backButton);

    this.visibleItems = MENU_ITEMS.filter((item) => !item.flag || engine.state.getFlag(item.flag));
    const buttons = this.visibleItems.map(
      (item) =>
        new LocalizedText({
          namespace: "ui",
          key: item.labelKey,
          style: new TextStyle({ fontSize: 13, fontFamily: PIXEL_FONT_FAMILY }),
        }),
    );
    this.grid.setItems(buttons);
    this.grid.onActivate = () => this.activateSelected(engine);
    this.root.addChild(this.grid);

    const hint = new LocalizedText({
      namespace: "ui",
      key: "MENU.hint",
      style: new TextStyle({ fill: 0x8888aa, fontSize: 11, fontFamily: PIXEL_FONT_FAMILY }),
    });
    hint.position.set(ROW_X, UI_VIRTUAL_HEIGHT - 24);
    this.root.addChild(hint);

    engine.stage.bottom.ui.addChild(this.root);

    this.unsubs.push(engine.input.bus.on("buttonDown", (button) => this.onButton(button, engine)));
  }

  private onButton(button: Button, engine: GameEngine): void {
    if (engine.scenes.current !== this) return;

    switch (button) {
      case "up":
        this.grid.moveCursor(0, -1);
        break;
      case "down":
        this.grid.moveCursor(0, 1);
        break;
      case "left":
        this.grid.moveCursor(-1, 0);
        break;
      case "right":
        this.grid.moveCursor(1, 0);
        break;
      case "confirm":
        this.activateSelected(engine);
        break;
      case "cancel":
      case "menu":
      case "start":
        engine.scenes.pop();
        break;
    }
  }

  private activateSelected(engine: GameEngine): void {
    const item = this.visibleItems[this.grid.selectedIndex];
    if (!item) return;

    if (item.id === "settings") {
      void engine.scenes.push(new SettingsScene());
    } else if (item.id === "save") {
      void engine.state.save();
      this.showSavedMessage();
    }
    // demonary/demons/bag/cyberdeck/trainer_card: no screen to open yet.
  }

  private showSavedMessage(): void {
    if (!this.savedLabel) {
      this.savedLabel = new LocalizedText({
        namespace: "ui",
        key: "MENU.saved",
        style: new TextStyle({ fill: 0x9be89b, fontSize: 12, fontFamily: PIXEL_FONT_FAMILY }),
      });
      this.savedLabel.position.set(ROW_X, UI_VIRTUAL_HEIGHT - 44);
      this.root.addChild(this.savedLabel);
    }
    this.savedLabel.visible = true;
    this.savedTimer = SAVED_MESSAGE_SECONDS;
  }

  update(dt: number): void {
    if (this.savedTimer <= 0) return;
    this.savedTimer -= dt;
    if (this.savedTimer <= 0 && this.savedLabel) this.savedLabel.visible = false;
  }

  onExit(engine: GameEngine): void {
    engine.stage.bottom.ui.removeChild(this.root);
    this.root.destroy({ children: true });
    this.unsubs.forEach((u) => u());
  }
}
