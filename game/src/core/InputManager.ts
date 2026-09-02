import { EventBus } from "./EventBus";

export type Direction = "up" | "down" | "left" | "right";

export type ActionButton =
  | "confirm"
  | "cancel"
  | "menu"
  | "special"
  | "start"
  | "select"
  | "leftTrigger"
  | "rightTrigger";

/** Every command the game responds to, regardless of which device pressed it. */
export type Button = Direction | ActionButton;

const DIRECTIONS: ReadonlySet<Direction> = new Set(["up", "down", "left", "right"]);

export function isDirection(button: Button): button is Direction {
  return DIRECTIONS.has(button as Direction);
}

export type TouchInput = { x: number; y: number; source: "mouse" | "touch" };

export type InputEvents = {
  buttonDown: Button;
  buttonUp: Button;
  touch: TouchInput;
};

const KEY_BUTTON_MAP: Record<string, Button> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyC: "confirm",
  KeyX: "cancel",
  KeyZ: "menu",
  KeyV: "special",
  Enter: "start",
  ShiftLeft: "select",
  ShiftRight: "select",
  KeyQ: "leftTrigger",
  KeyW: "rightTrigger",
};

/**
 * Standard Gamepad API layout (https://w3c.github.io/gamepad/#remapping):
 * face buttons 0-3, shoulder triggers 6-7 (not the bumpers, 4-5 - the user
 * scheme calls out triggers specifically), select/start 8-9, d-pad 12-15.
 * Bluetooth/USB controllers all surface through this same API, so one map
 * covers every "controller" the browser can see.
 */
const GAMEPAD_BUTTON_MAP: Record<number, Button> = {
  0: "confirm",
  1: "cancel",
  2: "special",
  3: "menu",
  6: "leftTrigger",
  7: "rightTrigger",
  8: "select",
  9: "start",
  12: "up",
  13: "down",
  14: "left",
  15: "right",
};

/** Left stick displacement past this (of 1.0) counts as a held direction. */
const STICK_DEADZONE = 0.5;

/**
 * Unifies keyboard, gamepad/controller, and mouse/touch input into one set
 * of semantic commands (Button) plus a general-purpose `touch` signal, so
 * scenes only ever listen to `bus` instead of caring which device fired.
 *
 * Keyboard fires instantly via DOM events. Gamepads have no press/release
 * events in browsers - `pollGamepads()` must be called once per frame (see
 * GameEngine.tick) to diff button/stick state and synthesize the same
 * buttonDown/buttonUp events keyboard produces natively.
 *
 * The same Button can be held via multiple devices at once (e.g. a keyboard
 * key and a gamepad button bound to the same command); buttonDown/buttonUp
 * only fire on the overall held/not-held transition, not per-device, so a
 * second device pressing an already-held button is a no-op and releasing
 * one device doesn't cut off a command still held on another.
 */
export class InputManager {
  readonly bus = new EventBus<InputEvents>();

  private keyboardHeld = new Set<Button>();
  private gamepadHeld = new Set<Button>();
  private readonly target: Window | HTMLElement;

  constructor(target: Window | HTMLElement = window) {
    this.target = target;
    target.addEventListener("keydown", this.onKeyDown as EventListener);
    target.addEventListener("keyup", this.onKeyUp as EventListener);
    target.addEventListener("pointerdown", this.onPointerDown as EventListener);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const button = KEY_BUTTON_MAP[e.code];
    if (!button || this.keyboardHeld.has(button)) return; // ignore unmapped keys and OS key-repeat
    this.setHeld(this.keyboardHeld, button, true);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const button = KEY_BUTTON_MAP[e.code];
    if (!button) return;
    this.setHeld(this.keyboardHeld, button, false);
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.bus.emit("touch", {
      x: e.clientX,
      y: e.clientY,
      source: e.pointerType === "mouse" ? "mouse" : "touch",
    });
  };

  /** Poll connected gamepads/controllers and emit the same events a keyboard press would. Call once per frame. */
  pollGamepads(): void {
    const held = new Set<Button>();
    const pads = navigator.getGamepads?.() ?? [];

    for (const pad of pads) {
      if (!pad) continue;

      for (const [indexStr, button] of Object.entries(GAMEPAD_BUTTON_MAP)) {
        if (pad.buttons[Number(indexStr)]?.pressed) held.add(button);
      }

      const [stickX = 0, stickY = 0] = pad.axes;
      if (stickX < -STICK_DEADZONE) held.add("left");
      if (stickX > STICK_DEADZONE) held.add("right");
      if (stickY < -STICK_DEADZONE) held.add("up");
      if (stickY > STICK_DEADZONE) held.add("down");
    }

    for (const button of held) {
      if (!this.gamepadHeld.has(button)) this.setHeld(this.gamepadHeld, button, true);
    }
    for (const button of [...this.gamepadHeld]) {
      if (!held.has(button)) this.setHeld(this.gamepadHeld, button, false);
    }
  }

  /** True if `button` is currently held on any device. */
  isHeld(button: Button): boolean {
    return this.keyboardHeld.has(button) || this.gamepadHeld.has(button);
  }

  private setHeld(source: Set<Button>, button: Button, held: boolean): void {
    const wasHeldByAny = this.isHeld(button);
    if (held) source.add(button);
    else source.delete(button);
    const isHeldByAny = this.isHeld(button);

    if (!wasHeldByAny && isHeldByAny) this.bus.emit("buttonDown", button);
    else if (wasHeldByAny && !isHeldByAny) this.bus.emit("buttonUp", button);
  }

  dispose(): void {
    this.target.removeEventListener("keydown", this.onKeyDown as EventListener);
    this.target.removeEventListener("keyup", this.onKeyUp as EventListener);
    this.target.removeEventListener("pointerdown", this.onPointerDown as EventListener);
  }
}
