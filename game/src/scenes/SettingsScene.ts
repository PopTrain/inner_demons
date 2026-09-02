import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { GameEngine } from "@/core/GameEngine";
import type { GameScene } from "@/core/Scene";
import type { Button } from "@/core/InputManager";
import type { AudioChannel } from "@/audio/AudioManager";
import { UI_VIRTUAL_WIDTH, UI_VIRTUAL_HEIGHT } from "@/core/Screen";
import { PIXEL_FONT_FAMILY } from "@/ui/fonts";
import { BackButton } from "@/ui/BackButton";
import { LocalizedText } from "@/ui/LocalizedText";
import { MenuList } from "@/ui/MenuList";
import { getTextResolution } from "@/ui/textResolution";
import { LanguageSelectScene } from "./LanguageSelectScene";

type SettingsRow = { kind: "language"; labelKey: "LANGUAGE.title" } | { kind: "volume"; channel: AudioChannel; labelKey: string };

const ROWS: SettingsRow[] = [
  { kind: "language", labelKey: "LANGUAGE.title" },
  { kind: "volume", channel: "bgm", labelKey: "SETTINGS.bgm_volume" },
  { kind: "volume", channel: "bgs", labelKey: "SETTINGS.bgs_volume" },
  { kind: "volume", channel: "me", labelKey: "SETTINGS.me_volume" },
  { kind: "volume", channel: "se", labelKey: "SETTINGS.se_volume" },
];

const VOLUME_STEP = 0.1;
const ROW_HEIGHT = 24;
const ROW_X = 24;
const LIST_TOP = 56;
const VALUE_X = UI_VIRTUAL_WIDTH - 56;
const BACK_BUTTON_WIDTH = 56;

/**
 * The settings overlay - reachable from the main menu (or directly from the
 * title screen). "Language" opens the language picker; the four volume rows
 * adjust live via Left/Right, matching SETTINGS.close_hint's own wording.
 */
export class SettingsScene implements GameScene {
  private root = new Container();
  private list = new MenuList({ x: ROW_X, y: LIST_TOP, rowHeight: ROW_HEIGHT });
  private valueTexts: Array<Text | null> = [];
  private unsubs: Array<() => void> = [];

  onEnter(engine: GameEngine): void {
    const backdrop = new Graphics().rect(0, 0, UI_VIRTUAL_WIDTH, UI_VIRTUAL_HEIGHT).fill({ color: 0x0a0a12 });
    backdrop.eventMode = "static";
    this.root.addChild(backdrop);

    const title = new LocalizedText({
      namespace: "ui",
      key: "SETTINGS.title",
      style: new TextStyle({ fill: 0xffffff, fontSize: 16, fontFamily: PIXEL_FONT_FAMILY }),
    });
    title.position.set(ROW_X, 20);
    this.root.addChild(title);

    const backButton = new BackButton({ x: UI_VIRTUAL_WIDTH - ROW_X - BACK_BUTTON_WIDTH, y: 16, width: BACK_BUTTON_WIDTH });
    backButton.onActivate = () => engine.scenes.pop();
    this.root.addChild(backButton);

    const rows = ROWS.map(
      (row) =>
        new LocalizedText({
          namespace: "ui",
          key: row.labelKey,
          style: new TextStyle({ fontSize: 13, fontFamily: PIXEL_FONT_FAMILY }),
        }),
    );
    this.list.setRows(rows);
    this.root.addChild(this.list);

    this.valueTexts = ROWS.map((row, i) => {
      if (row.kind !== "volume") return null;
      const value = new Text({
        text: formatPercent(engine.audio.getChannelVolume(row.channel)),
        resolution: getTextResolution(),
        style: new TextStyle({ fill: 0xccccee, fontSize: 13, fontFamily: PIXEL_FONT_FAMILY }),
      });
      value.position.set(VALUE_X, LIST_TOP + i * ROW_HEIGHT);
      this.root.addChild(value);
      return value;
    });

    const hint = new LocalizedText({
      namespace: "ui",
      key: "SETTINGS.close_hint",
      style: new TextStyle({ fill: 0x8888aa, fontSize: 10, fontFamily: PIXEL_FONT_FAMILY }),
    });
    hint.position.set(ROW_X, UI_VIRTUAL_HEIGHT - 22);
    this.root.addChild(hint);

    engine.stage.bottom.ui.addChild(this.root);

    this.unsubs.push(engine.input.bus.on("buttonDown", (button) => this.onButton(button, engine)));
  }

  private onButton(button: Button, engine: GameEngine): void {
    if (engine.scenes.current !== this) return;

    switch (button) {
      case "up":
        this.list.moveCursor(-1);
        break;
      case "down":
        this.list.moveCursor(1);
        break;
      case "left":
        this.adjustVolume(engine, -VOLUME_STEP);
        break;
      case "right":
        this.adjustVolume(engine, VOLUME_STEP);
        break;
      case "confirm": {
        const row = ROWS[this.list.selectedIndex];
        if (row?.kind === "language") void engine.scenes.push(new LanguageSelectScene());
        break;
      }
      case "cancel":
      case "menu":
        engine.scenes.pop();
        break;
    }
  }

  private adjustVolume(engine: GameEngine, delta: number): void {
    const index = this.list.selectedIndex;
    const row = ROWS[index];
    if (!row || row.kind !== "volume") return;

    const next = Math.min(1, Math.max(0, engine.audio.getChannelVolume(row.channel) + delta));
    engine.audio.setChannelVolume(row.channel, next);

    const valueText = this.valueTexts[index];
    if (valueText) valueText.text = formatPercent(next);
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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
