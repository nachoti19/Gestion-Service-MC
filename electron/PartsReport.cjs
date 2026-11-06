const { ipcMain } = require("electron");

const { db, localNow } = require("./database.cjs");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseRow(row) {
  if (!row) return null;

  return {
    ...row,
    types: JSON.parse(row.types),
    lines: JSON.parse(row.lines),
  };
}

function getPartsReport(id) {
  return parseRow(db.prepare("SELECT * FROM parts_report WHERE id = ?").get(id));
}

// payload: { date_from, date_to, types: string[], lines: [{ type, name, quantity }] }
function createPartsReport(payload) {
  const { date_from, date_to } = payload;

  if (!DATE_RE.test(String(date_from)) || !DATE_RE.test(String(date_to))) {
    throw new Error("Las fechas del informe no son válidas");
  }

  if (date_from > date_to) {
    throw new Error('La fecha "Desde" no puede ser posterior a "Hasta"');
  }

  const lines = (payload.lines || [])
    .map((l) => ({
      type: String(l.type ?? "").trim(),
      name: String(l.name ?? "").trim(),
      quantity: Number(l.quantity),
    }))
    .filter((l) => l.name && Number.isInteger(l.quantity) && l.quantity > 0);

  if (lines.length === 0) {
    throw new Error("El informe no tiene repuestos para pedir");
  }

  const types = (payload.types || []).map((t) => String(t));

  const result = db
    .prepare(
      `INSERT INTO parts_report (created_at, date_from, date_to, types, lines)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(localNow(), date_from, date_to, JSON.stringify(types), JSON.stringify(lines));

  return Number(result.lastInsertRowid);
}

function registerPartsReportHandlers() {
  ipcMain.handle("partsReport:create", (event, payload) => {
    try {
      return { ok: true, id: createPartsReport(payload) };
    } catch (error) {
      console.error("Error al guardar el informe:", error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("partsReport:getAll", () => {
    return db
      .prepare(
        `SELECT id, created_at, date_from, date_to
         FROM parts_report ORDER BY id DESC`,
      )
      .all();
  });

  ipcMain.handle("partsReport:getById", (event, id) => getPartsReport(id));

  ipcMain.handle("partsReport:delete", (event, id) => {
    const result = db.prepare("DELETE FROM parts_report WHERE id = ?").run(id);
    return { changes: result.changes };
  });
}

module.exports = {
  registerPartsReportHandlers,
  getPartsReport,
};
