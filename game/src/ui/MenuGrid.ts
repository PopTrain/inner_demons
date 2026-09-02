import { Container, Graphics, type Text } from "pixi.js";

export type MenuGridOptions = {
  x?: number;
  y?: number;
  /** Cells per row; items lay out row-major and wrap after this many. */
  columns?: number;
  cellWidth?: number;
  cellHeight?: number;
  gapX?: number;
  gapY?: number;
  normalFill?: number;
  selectedFill?: number;
  hoverFill?: number;
  normalTextFill?: number;
  selectedTextFill?: number;
};

const DEFAULT_COLUMNS = 2;
const DEFAULT_CELL_WIDTH = 168;
const DEFAULT_CELL_HEIGHT = 32;
const DEFAULT_GAP_X = 12;
const DEFAULT_GAP_Y = 8;
const DEFAULT_NORMAL_FILL = 0x22222f;
const DEFAULT_SELECTED_FILL = 0x4a4a70;
const DEFAULT_HOVER_FILL = 0x33334a;
const DEFAULT_NORMAL_TEXT_FILL = 0xaaaaaa;
const DEFAULT_SELECTED_TEXT_FILL = 0xffcc66;

interface Cell {
  container: Container;
  background: Graphics;
  label: Text;
}

/**
 * A 2D grid of button cells (background + centered label) with keyboard/
 * gamepad cursor navigation and direct mouse/touch interaction - the grid
 * counterpart to MenuList's single-column layout, for menus that read better
 * as a block of buttons (the main menu) than a scrolling list.
 *
 * Items lay out row-major, left to right, wrapping to a new row every
 * `columns` cells; the last row may be short if the item count isn't a
 * multiple of `columns`. moveCursor(dx, dy) clamps the column to whatever
 * exists in the destination row, so moving into a short last row never lands
 * on a nonexistent cell.
 *
 * Each cell's background is drawn once in white and recolored via `.tint`
 * (selected/hovered/normal) rather than redrawn, since a redraw would need
 * to re-tessellate the rounded rect on every highlight change.
 */
export class MenuGrid extends Container {
  private cells: Cell[] = [];
  private cursorIndex = 0;
  private hoveredIndex = -1;

  private readonly columns: number;
  private readonly cellWidth: number;
  private readonly cellHeight: number;
  private readonly gapX: number;
  private readonly gapY: number;
  private readonly normalFill: number;
  private readonly selectedFill: number;
  private readonly hoverFill: number;
  private readonly normalTextFill: number;
  private readonly selectedTextFill: number;

  /** Fired when a cell is activated by mouse/touch (click/tap), e.g. to route it through the same activation path as a keyboard Confirm. */
  onActivate?: (index: number) => void;

  constructor(options: MenuGridOptions = {}) {
    super();
    this.position.set(options.x ?? 0, options.y ?? 0);
    this.columns = options.columns ?? DEFAULT_COLUMNS;
    this.cellWidth = options.cellWidth ?? DEFAULT_CELL_WIDTH;
    this.cellHeight = options.cellHeight ?? DEFAULT_CELL_HEIGHT;
    this.gapX = options.gapX ?? DEFAULT_GAP_X;
    this.gapY = options.gapY ?? DEFAULT_GAP_Y;
    this.normalFill = options.normalFill ?? DEFAULT_NORMAL_FILL;
    this.selectedFill = options.selectedFill ?? DEFAULT_SELECTED_FILL;
    this.hoverFill = options.hoverFill ?? DEFAULT_HOVER_FILL;
    this.normalTextFill = options.normalTextFill ?? DEFAULT_NORMAL_TEXT_FILL;
    this.selectedTextFill = options.selectedTextFill ?? DEFAULT_SELECTED_TEXT_FILL;
  }

  /** Replaces the button set (destroying any previous cells - matters for LocalizedText labels, whose destroy() unsubscribes them from locale changes). */
  setItems(labels: Text[]): void {
    this.cells.forEach((cell) => cell.container.destroy({ children: true }));
    this.cells = labels.map((label, index) => this.buildCell(label, index));
    this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, labels.length - 1));
    this.hoveredIndex = -1;
    this.refreshHighlight();
  }

  get selectedIndex(): number {
    return this.cursorIndex;
  }

  get itemCount(): number {
    return this.cells.length;
  }

  /** Jumps directly to a cell without moving through the ones in between. */
  setSelectedIndex(index: number): void {
    if (this.cells.length === 0) return;
    this.cursorIndex = Math.min(Math.max(index, 0), this.cells.length - 1);
    this.refreshHighlight();
  }

  /**
   * Moves the cursor by one row (dy) and/or column (dx). Row movement wraps
   * top/bottom and clamps the column to the destination row's length (the
   * last row can be shorter than `columns`); column movement wraps within
   * the current row only, never spilling into the next/previous one.
   */
  moveCursor(dx: number, dy: number): void {
    if (this.cells.length === 0) return;
    const rows = Math.ceil(this.cells.length / this.columns);
    let row = Math.floor(this.cursorIndex / this.columns);
    let col = this.cursorIndex % this.columns;

    if (dy !== 0) {
      row = (row + dy + rows) % rows;
      col = Math.min(col, this.rowLength(row) - 1);
    }
    if (dx !== 0) {
      const len = this.rowLength(row);
      col = (col + dx + len) % len;
    }

    this.cursorIndex = row * this.columns + col;
    this.refreshHighlight();
  }

  private rowLength(row: number): number {
    const start = row * this.columns;
    return Math.min(this.columns, this.cells.length - start);
  }

  private buildCell(label: Text, index: number): Cell {
    const col = index % this.columns;
    const row = Math.floor(index / this.columns);

    const container = new Container();
    container.position.set(col * (this.cellWidth + this.gapX), row * (this.cellHeight + this.gapY));

    // Drawn white so highlight changes can be a cheap `.tint` set instead of re-tessellating the rounded rect every time.
    const background = new Graphics().roundRect(0, 0, this.cellWidth, this.cellHeight, 6).fill(0xffffff);
    background.eventMode = "static";
    background.cursor = "pointer";
    background.on("pointerover", () => this.onPointerOver(index));
    background.on("pointerout", () => this.onPointerOut(index));
    background.on("pointertap", () => this.onPointerTap(index));
    container.addChild(background);

    label.anchor.set(0.5, 0.5);
    label.position.set(this.cellWidth / 2, this.cellHeight / 2);
    // "none", not the default "passive": Pixi's hit-test walks a cell's
    // children topmost-first, so this label (added after background) is
    // checked before it. A passive object that geometrically contains the
    // point but isn't itself interactive still returns a (non-null, empty)
    // hit result, which stops the sibling search outright instead of
    // falling through to background - "none" excludes it from hit-testing
    // entirely so the search actually reaches background underneath.
    label.eventMode = "none";
    container.addChild(label);

    this.addChild(container);
    return { container, background, label };
  }

  private onPointerOver(index: number): void {
    this.hoveredIndex = index;
    this.refreshHighlight();
  }

  private onPointerOut(index: number): void {
    if (this.hoveredIndex === index) this.hoveredIndex = -1;
    this.refreshHighlight();
  }

  private onPointerTap(index: number): void {
    this.cursorIndex = index; // clicking a cell moves the keyboard/gamepad cursor there too, so the two input modes never disagree
    this.refreshHighlight();
    this.onActivate?.(index);
  }

  private refreshHighlight(): void {
    this.cells.forEach((cell, i) => {
      const selected = i === this.cursorIndex;
      const hovered = i === this.hoveredIndex;
      cell.background.tint = selected ? this.selectedFill : hovered ? this.hoverFill : this.normalFill;
      cell.label.style.fill = selected ? this.selectedTextFill : this.normalTextFill;
    });
  }
}
