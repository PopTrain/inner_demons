import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? (app.isPackaged ? undefined : "http://localhost:5173");

// Fixed content-area size, matching DualScreenStage's stacked-screen aspect
// ratio (TOP_ASPECT = BOTTOM_ASPECT = 4/3, GAP_PX = 4) 1:1 so the default
// window shows both screens with no letterboxing. Keep these in sync with
// src/core/DualScreenStage.ts if that aspect ratio or gap ever changes.
const WINDOW_WIDTH = 480;
const WINDOW_HEIGHT = 724;

function createWindow(): void {
  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    // useContentSize makes width/height above describe the web content area
    // itself (not the outer window including the OS title bar), so the
    // in-game layout math always sees exactly WINDOW_WIDTH x WINDOW_HEIGHT
    // at the "windowed" size, regardless of the OS's title bar height/theme.
    useContentSize: true,
    // Windows couples "maximizable" to "resizable" at the OS level: setting
    // resizable:false disables the native maximize button/snap regardless of
    // maximizable:true, and capping maxWidth/maxHeight at the fixed size
    // blocks maximize outright (there'd be nowhere bigger to grow into). So
    // this stays natively resizable - manual border-dragging is blocked below
    // via will-resize instead, which leaves maximize/fullscreen/snap alone.
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    minWidth: WINDOW_WIDTH,
    minHeight: WINDOW_HEIGHT,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // will-resize only fires for manual border/corner dragging - not for
  // maximize, unmaximize, or setFullScreen - so this blocks drag-resizing
  // while leaving every other way to grow/shrink the window untouched.
  win.on("will-resize", (event) => {
    if (!win.isMaximized() && !win.isFullScreen()) {
      event.preventDefault();
    }
  });

  win.webContents.on("before-input-event", (_event, input) => {
    if (input.type === "keyDown" && input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
    }
  });

  if (DEV_SERVER_URL) {
    void win.loadURL(DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
