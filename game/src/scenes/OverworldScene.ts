import * as THREE from "three";
import { Graphics } from "pixi.js";
import type { GameEngine } from "@/core/GameEngine";
import type { GameScene } from "@/core/Scene";
import { isDirection, type Button, type Direction } from "@/core/InputManager";
import { UI_VIRTUAL_WIDTH, UI_VIRTUAL_HEIGHT } from "@/core/Screen";
import { PIXEL_FONT_FAMILY } from "@/ui/fonts";
import { LocalizedText } from "@/ui/LocalizedText";
import { MainMenuScene } from "./MainMenuScene";

const MOVE_SPEED = 2.4;

/**
 * Placeholder overworld: 3D field on the top screen (ThreeJS, player capsule
 * on a ground plane, orbiting camera), a touch d-pad + live minimap dot on
 * the bottom screen (PixiJS). Demonstrates both screens driven by the same
 * input events, and reads real data from DataRegistry to prove the data
 * layer is wired up end to end.
 *
 * All bottom-screen UI is laid out in the fixed UI_VIRTUAL_WIDTH x
 * UI_VIRTUAL_HEIGHT space (see Screen.ts) rather than the screen's actual
 * pixel size, so it stays in the same relative spot whether the window is
 * windowed, maximized, or fullscreen instead of drifting to a corner.
 */
export class OverworldScene implements GameScene {
  private player = new THREE.Vector3(0, 0, 0);
  private playerMesh?: THREE.Mesh;
  private heldDirections = new Set<Direction>();
  private unsubs: Array<() => void> = [];
  private minimapDot?: Graphics;
  private minimapCenter = { x: 0, y: 0 };
  private minimapHalfSize = 0;
  private readonly halfExtent = 6;

  onEnter(engine: GameEngine): void {
    this.buildTopScreen(engine);
    this.buildBottomScreen(engine);

    const onDown = (button: Button) => {
      if (isDirection(button)) this.heldDirections.add(button);
      // Paused scenes stay subscribed to the input bus, so guard against
      // stacking a second overlay if this scene is already paused under one.
      else if ((button === "menu" || button === "start") && engine.scenes.current === this) {
        void engine.scenes.push(new MainMenuScene());
      }
    };
    const onUp = (button: Button) => {
      if (isDirection(button)) this.heldDirections.delete(button);
    };
    this.unsubs.push(engine.input.bus.on("buttonDown", onDown));
    this.unsubs.push(engine.input.bus.on("buttonUp", onUp));
  }

  private buildTopScreen(engine: GameEngine): void {
    const { scene, camera } = engine.stage.top.three;
    scene.background = new THREE.Color(0x1a2a1a);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.halfExtent * 2, this.halfExtent * 2),
      new THREE.MeshStandardMaterial({ color: 0x2f5233 }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(this.halfExtent * 2, 12, 0x1f3a22, 0x1f3a22);
    scene.add(grid);

    this.playerMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 0.6, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffcc66 }),
    );
    this.playerMesh.position.copy(this.player).setY(0.6);
    scene.add(this.playerMesh);

    scene.add(new THREE.AmbientLight(0x556677, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(4, 6, 2);
    scene.add(sun);

    camera.position.set(0, 4, 4.5);
    camera.lookAt(0, 0, 0);
  }

  private buildBottomScreen(engine: GameEngine): void {
    const ui = engine.stage.bottom.ui;

    const starter = engine.data.tryGetDemon("ROOKEEN");
    const label = new LocalizedText({
      namespace: "ui",
      key: "OVERWORLD.party_label",
      vars: { name: starter?.speciesId ?? "?", level: 5 },
      style: { fill: 0xffffff, fontSize: 13, fontFamily: PIXEL_FONT_FAMILY },
    });
    label.position.set(10, 8);
    ui.addChild(label);

    // Demonstrates \pn (player name), \n (forced newline), and a positional
    // {1} placeholder all resolving together in one localized string.
    const welcome = new LocalizedText({
      namespace: "ui",
      key: "OVERWORLD.welcome",
      vars: { 1: starter?.speciesId ?? "?" },
      style: { fill: 0xccccee, fontSize: 9, fontFamily: PIXEL_FONT_FAMILY },
    });
    welcome.position.set(10, 24);
    ui.addChild(welcome);

    // Minimap
    const mapSize = Math.min(UI_VIRTUAL_WIDTH, UI_VIRTUAL_HEIGHT) * 0.5;
    const mapX = UI_VIRTUAL_WIDTH / 2 - mapSize / 2;
    const mapY = 50;
    const mapBorder = new Graphics()
      .rect(mapX, mapY, mapSize, mapSize)
      .stroke({ width: 2, color: 0x8888aa })
      .fill({ color: 0x101018, alpha: 0.6 });
    ui.addChild(mapBorder);

    this.minimapCenter = { x: mapX + mapSize / 2, y: mapY + mapSize / 2 };
    this.minimapHalfSize = mapSize / 2 - 4;

    this.minimapDot = new Graphics().circle(0, 0, 4).fill(0xffcc66);
    this.minimapDot.position.set(this.minimapCenter.x, this.minimapCenter.y);
    ui.addChild(this.minimapDot);

    this.buildDPad(engine);
  }

  private buildDPad(engine: GameEngine): void {
    const btn = Math.max(18, Math.min(34, UI_VIRTUAL_HEIGHT * 0.14));
    const gap = 4;
    const cx = UI_VIRTUAL_WIDTH * 0.22;
    const cy = UI_VIRTUAL_HEIGHT - (btn * 1.5 + gap + 8);

    const dirs: Array<{ dir: Direction; dx: number; dy: number }> = [
      { dir: "up", dx: 0, dy: -(btn + gap) },
      { dir: "down", dx: 0, dy: btn + gap },
      { dir: "left", dx: -(btn + gap), dy: 0 },
      { dir: "right", dx: btn + gap, dy: 0 },
    ];

    for (const { dir, dx, dy } of dirs) {
      const g = new Graphics().roundRect(-btn / 2, -btn / 2, btn, btn, 6).fill(0x33334a);
      g.position.set(cx + dx, cy + dy);
      g.eventMode = "static";
      g.cursor = "pointer";
      g.on("pointerdown", () => this.heldDirections.add(dir));
      g.on("pointerup", () => this.heldDirections.delete(dir));
      g.on("pointerupoutside", () => this.heldDirections.delete(dir));
      engine.stage.bottom.ui.addChild(g);
    }
  }

  update(dt: number): void {
    let dx = 0;
    let dz = 0;
    if (this.heldDirections.has("up")) dz -= 1;
    if (this.heldDirections.has("down")) dz += 1;
    if (this.heldDirections.has("left")) dx -= 1;
    if (this.heldDirections.has("right")) dx += 1;

    if (dx !== 0 || dz !== 0) {
      const len = Math.hypot(dx, dz);
      this.player.x = THREE.MathUtils.clamp(this.player.x + (dx / len) * MOVE_SPEED * dt, -this.halfExtent, this.halfExtent);
      this.player.z = THREE.MathUtils.clamp(this.player.z + (dz / len) * MOVE_SPEED * dt, -this.halfExtent, this.halfExtent);
      this.playerMesh?.position.set(this.player.x, 0.6, this.player.z);
    }

    if (this.minimapDot) {
      const nx = this.player.x / this.halfExtent;
      const nz = this.player.z / this.halfExtent;
      this.minimapDot.x = this.minimapCenter.x + nx * this.minimapHalfSize;
      this.minimapDot.y = this.minimapCenter.y + nz * this.minimapHalfSize;
    }
  }

  onExit(engine: GameEngine): void {
    engine.stage.top.three.scene.clear();
    engine.stage.bottom.ui.removeChildren().forEach((child) => child.destroy());
    this.unsubs.forEach((u) => u());
  }
}
