import * as THREE from "three";
import { TextStyle } from "pixi.js";
import type { GameEngine } from "@/core/GameEngine";
import type { GameScene } from "@/core/Scene";
import { UI_VIRTUAL_WIDTH, UI_VIRTUAL_HEIGHT } from "@/core/Screen";
import { PIXEL_FONT_FAMILY } from "@/ui/fonts";
import { LocalizedText } from "@/ui/LocalizedText";
import { OverworldScene } from "./OverworldScene";
import { SettingsScene } from "./SettingsScene";

/** Proves the 3D (top) + 2D (bottom) pipelines both work: a spinning placeholder "demon" + a tap-to-start prompt. */
export class TitleScene implements GameScene {
  private mesh?: THREE.Mesh;
  private light?: THREE.Light;
  private unsubs: Array<() => void> = [];
  private started = false;

  onEnter(engine: GameEngine): void {
    const { scene, camera } = engine.stage.top.three;
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 0.4, 0);

    const geometry = new THREE.IcosahedronGeometry(0.9, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0x7a3ff2, flatShading: true });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 0.4, 0);
    scene.add(this.mesh);

    this.light = new THREE.DirectionalLight(0xffffff, 2.2);
    this.light.position.set(2, 3, 2);
    scene.add(this.light);
    scene.add(new THREE.AmbientLight(0x404060, 1.5));
    scene.background = new THREE.Color(0x0a0a14);

    // Positioned in the bottom screen's fixed virtual space (UI_VIRTUAL_WIDTH
    // x UI_VIRTUAL_HEIGHT) - Screen scales/centers that space to fit the
    // actual window size, so this stays put whether windowed or maximized.
    // LocalizedText re-renders itself automatically when the player changes
    // language via the menu button below.
    const title = new LocalizedText({
      namespace: "ui",
      key: "TITLE.heading",
      style: new TextStyle({ fill: 0xf2e9ff, fontSize: 22, align: "center", fontFamily: PIXEL_FONT_FAMILY }),
    });
    title.anchor.set(0.5);
    title.x = UI_VIRTUAL_WIDTH / 2;
    title.y = UI_VIRTUAL_HEIGHT * 0.35;
    engine.stage.bottom.ui.addChild(title);

    const prompt = new LocalizedText({
      namespace: "ui",
      key: "TITLE.prompt",
      style: new TextStyle({ fill: 0xaaaadd, fontSize: 13, fontFamily: PIXEL_FONT_FAMILY }),
    });
    prompt.anchor.set(0.5);
    prompt.x = UI_VIRTUAL_WIDTH / 2;
    prompt.y = UI_VIRTUAL_HEIGHT * 0.6;
    engine.stage.bottom.ui.addChild(prompt);

    // The stage's hitArea (covering the whole screen, kept in sync by
    // Screen.resize) is what makes a tap anywhere register, not just on top
    // of the text itself.
    engine.stage.bottom.pixi.stage.on("pointerdown", () => this.beginGame(engine));

    // Paused scenes stay subscribed to the input bus (nothing auto-mutes
    // them), so every handler that acts on input has to check it's still
    // the scene on top before reacting - otherwise pressing Confirm while
    // the language picker is open on top of this scene would both close
    // the picker AND start the game in the same keypress.
    this.unsubs.push(
      engine.input.bus.on("buttonDown", (button) => {
        if (engine.scenes.current !== this) return;
        if (button === "confirm") this.beginGame(engine);
        else if (button === "menu") void engine.scenes.push(new SettingsScene());
      }),
    );
  }

  private beginGame(engine: GameEngine): void {
    if (engine.scenes.current !== this || this.started) return;
    this.started = true;
    void engine.scenes.replace(new OverworldScene());
  }

  update(dt: number): void {
    if (this.mesh) this.mesh.rotation.y += dt * 0.6;
  }

  onExit(engine: GameEngine): void {
    engine.stage.top.three.scene.clear();
    engine.stage.bottom.ui.removeChildren().forEach((child) => child.destroy());
    this.unsubs.forEach((u) => u());
  }
}
