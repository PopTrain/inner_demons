import { Container, Graphics, type Text } from "pixi.js";

export type MenuListOptions = {
  x?: number;
  y?: number;
  rowHeight?: number;
  normalFill?: number;
  selectedFill?: number;
};

const DEFAULT_ROW_HEIGHT = 24;
const DEFAULT_NORMAL_FILL = 0xaaaaaa;
const DEFAULT_SELECTED_FILL = 0xffcc66;

/**
 * A vertical list of already-built Text (or LocalizedText) rows with cursor
 * navigation and highlight styling - the shared bit of every bottom-screen
 * overlay menu (language picker, main menu, settings). Doesn't know or care
 * what a row's content is (localized or not); it only owns layout, the
 * cursor arrow, and which row is currently selected.
 */
export class MenuList extends Container {
  private rows: Text[] = [];
  private readonly cursorGraphic: Graphics;
  private cursorIndex = 0;

  private readonly rowHeight: number;
  private readonly normalFill: number;
  private readonly selectedFill: number;

  constructor(options: MenuListOptions = {}) {
    super();
    this.position.set(options.x ?? 0, options.y ?? 0);
    this.rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
    this.normalFill = options.normalFill ?? DEFAULT_NORMAL_FILL;
    this.selectedFill = options.selectedFill ?? DEFAULT_SELECTED_FILL;

    this.cursorGraphic = new Graphics().poly([0, 0, 7, 4, 0, 8]).fill(this.selectedFill);
    this.addChild(this.cursorGraphic);
  }

  /** Replaces the row set (destroying any previous rows, which matters for LocalizedText - destroy() is what unsubscribes it from locale changes). */
  setRows(rows: Text[]): void {
    this.rows.forEach((row) => row.destroy());
    this.rows = rows;
    rows.forEach((row, i) => {
      row.position.set(20, i * this.rowHeight);
      this.addChild(row);
    });
    this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, rows.length - 1));
    this.refreshHighlight();
  }

  get selectedIndex(): number {
    return this.cursorIndex;
  }

  get rowCount(): number {
    return this.rows.length;
  }

  /** Jumps directly to a row (e.g. pre-selecting the currently-active language when the picker opens) without moving through the rows in between. */
  setSelectedIndex(index: number): void {
    if (this.rows.length === 0) return;
    this.cursorIndex = Math.min(Math.max(index, 0), this.rows.length - 1);
    this.refreshHighlight();
  }

  moveCursor(delta: number): void {
    if (this.rows.length === 0) return;
    this.cursorIndex = (this.cursorIndex + delta + this.rows.length) % this.rows.length;
    this.refreshHighlight();
  }

  private refreshHighlight(): void {
    this.rows.forEach((row, i) => {
      row.style.fill = i === this.cursorIndex ? this.selectedFill : this.normalFill;
    });
    this.cursorGraphic.position.set(0, this.cursorIndex * this.rowHeight + 3);
  }
}
