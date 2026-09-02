import "./css/style.css";
import { GameEngine } from "@/core/GameEngine";
import { TitleScene } from "@/scenes/TitleScene";

async function main(): Promise<void> {
  const root = document.getElementById("game-root");
  if (!root) throw new Error("#game-root not found");

  const engine = await GameEngine.boot(root);
  await engine.start(new TitleScene());

  if (import.meta.env.DEV) {
    (window as unknown as { __engine: GameEngine }).__engine = engine;
  }
}

void main();
