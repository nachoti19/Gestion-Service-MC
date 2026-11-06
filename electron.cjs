const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");

//BASE DE DATOS

const { db, dbPath } = require("./electron/database.cjs");
const { registerItemHandlers } = require("./electron/Item.cjs");
const { registerClientHandler } = require("./electron/Client.cjs");
const { registerApplianceHandler } = require("./electron/Appliance.cjs");
const {
  registerApplianceTypeHandlers,
} = require("./electron/ApplianceType.cjs");
const { registerSaleHandlers } = require("./electron/Sale.cjs");
const { registerBudgetHandlers } = require("./electron/Budget.cjs");
const { registerPdfHandlers } = require("./electron/Pdf.cjs");
const { registerPartsReportHandlers } = require("./electron/PartsReport.cjs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "src", "assets", "mc-logo.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      autoHideMenuBar: true,
      preload: path.join(__dirname, "electron", "preload.cjs"),
    },
  });

  if (process.env.ELECTRON_DEV === "true") {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  registerItemHandlers();
  registerClientHandler();
  registerApplianceHandler();
  registerApplianceTypeHandlers();
  registerSaleHandlers();
  registerBudgetHandlers();
  registerPartsReportHandlers();
  registerPdfHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  db.close();
});
