const { ipcMain, dialog, shell, app, BrowserWindow } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { getBudgetDetail } = require("./Budget.cjs");
const { getPartsReport } = require("./PartsReport.cjs");
const {
  buildBudgetPdf,
  buildPartsReportPdf,
  parseInsurerPdf,
} = require("./pdfBuilder.cjs");

const cleanFileName = (name) =>
  name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ");

async function buildBudgetFile(budgetId) {
  const detail = getBudgetDetail(budgetId);

  if (!detail) {
    throw new Error("El presupuesto no existe");
  }

  const bytes = Buffer.from(await buildBudgetPdf(detail));

  const { client, appliance, budget } = detail;
  const kind = budget.type === "CON_SEGURO" ? "Seguro" : "Particular";

  return {
    bytes,
    fileName: cleanFileName(
      `Presupuesto ${client.surname} ${client.name} - ${appliance.type} ${appliance.brand} - ${kind} - ${String(budget.date).slice(0, 10)}.pdf`,
    ),
  };
}

async function buildPartsReportFile(reportId) {
  const report = getPartsReport(reportId);

  if (!report) {
    throw new Error("El informe no existe");
  }

  const bytes = Buffer.from(await buildPartsReportPdf(report));

  return {
    bytes,
    fileName: cleanFileName(
      `Pedido de repuestos ${String(report.created_at).slice(0, 10)}.pdf`,
    ),
  };
}

// Registra los 3 handlers (ver / guardar / abrir) para un tipo de PDF
function registerPdfKind(prefix, build) {
  // Devuelve el PDF en base64 para mostrarlo dentro de la aplicación
  ipcMain.handle(`pdf:get${prefix}`, async (event, id) => {
    try {
      const { bytes, fileName } = await build(id);
      return { ok: true, base64: bytes.toString("base64"), fileName };
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(`pdf:save${prefix}`, async (event, id) => {
    try {
      const { bytes, fileName } = await build(id);

      const result = await dialog.showSaveDialog(
        BrowserWindow.getFocusedWindow() ?? undefined,
        {
          title: "Guardar PDF",
          defaultPath: path.join(app.getPath("documents"), fileName),
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        },
      );

      if (result.canceled || !result.filePath) {
        return { ok: false, canceled: true };
      }

      fs.writeFileSync(result.filePath, bytes);

      return { ok: true, path: result.filePath };
    } catch (error) {
      console.error("Error al guardar el PDF:", error);
      return { ok: false, error: error.message };
    }
  });

  // Abre el PDF con el visor predeterminado del sistema
  ipcMain.handle(`pdf:open${prefix}`, async (event, id) => {
    try {
      const { bytes, fileName } = await build(id);

      const dir = path.join(os.tmpdir(), "ServiceMC");
      fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, bytes);

      const problem = await shell.openPath(filePath);

      return problem ? { ok: false, error: problem } : { ok: true };
    } catch (error) {
      console.error("Error al abrir el PDF:", error);
      return { ok: false, error: error.message };
    }
  });
}

function registerPdfHandlers() {
  registerPdfKind("Budget", buildBudgetFile);
  registerPdfKind("PartsReport", buildPartsReportFile);

  // Lee el PDF que envía la aseguradora y devuelve los datos que trae cargados
  ipcMain.handle("pdf:parseInsurer", async () => {
    try {
      const result = await dialog.showOpenDialog(
        BrowserWindow.getFocusedWindow() ?? undefined,
        {
          title: "Seleccioná el PDF de la aseguradora",
          properties: ["openFile"],
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        },
      );

      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, canceled: true };
      }

      const bytes = fs.readFileSync(result.filePaths[0]);
      const data = await parseInsurerPdf(bytes);

      return { ok: true, data };
    } catch (error) {
      console.error("Error al leer el PDF de la aseguradora:", error);
      return {
        ok: false,
        error: "No se pudo leer el PDF. Verificá que sea el informe de la aseguradora.",
      };
    }
  });
}

module.exports = {
  registerPdfHandlers,
};
