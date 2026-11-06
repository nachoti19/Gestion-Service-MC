const { ipcMain } = require("electron");

const { db, getOrCreateTypeId } = require("./database.cjs");
const { restockPendingBudgetsOf } = require("./Budget.cjs");

// "type" se devuelve como texto (nombre del tipo) para que el front no cambie.
const SELECT_APPLIANCE = `
  SELECT a.id, t.name AS type, a.brand, a.model, a.serial_number, a.client_id
  FROM appliance a
  JOIN appliance_type t ON t.id = a.type_id`;

function registerApplianceHandler() {
  ipcMain.handle("appliance:getAll", () => {
    return db
      .prepare(`${SELECT_APPLIANCE} WHERE a.deleted = 0 ORDER BY a.id DESC`)
      .all();
  });

  ipcMain.handle("appliance:getByClient", (event, client_id, deleted = false) => {
    return db
      .prepare(
        `${SELECT_APPLIANCE} WHERE a.client_id = ? AND a.deleted = ? ORDER BY a.id DESC`,
      )
      .all(client_id, deleted ? 1 : 0);
  });

  ipcMain.handle("appliance:getById", (event, id) => {
    return db.prepare(`${SELECT_APPLIANCE} WHERE a.id = ?`).get(id);
  });

  ipcMain.handle("appliance:add", (event, appliance) => {
    const { type, brand, model, serial_number, client_id } = appliance;

    const typeId = getOrCreateTypeId(type);

    const result = db
      .prepare(
        `INSERT INTO appliance (type_id, brand, model, serial_number, client_id)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(typeId, brand, model ?? "", serial_number ?? "", client_id);

    return { id: result.lastInsertRowid };
  });

  ipcMain.handle("appliance:update", (event, appliance) => {
    const { id, type, brand, model, serial_number, client_id } = appliance;

    const typeId = getOrCreateTypeId(type);

    const result = db
      .prepare(
        `UPDATE appliance SET
           type_id = ?,
           brand = ?,
           model = ?,
           serial_number = ?,
           client_id = ?
         WHERE id = ?`,
      )
      .run(typeId, brand, model ?? "", serial_number ?? "", client_id, id);

    return { changes: result.changes };
  });

  // Borrado lógico (se puede restaurar)
  ipcMain.handle("appliance:delete", (event, id) => {
    const result = db
      .prepare("UPDATE appliance SET deleted = 1 WHERE id = ?")
      .run(id);
    return { changes: result.changes };
  });

  ipcMain.handle("appliance:restore", (event, id) => {
    const result = db
      .prepare("UPDATE appliance SET deleted = 0 WHERE id = ?")
      .run(id);
    return { changes: result.changes };
  });

  // BORRADO COMPLETO: elimina el equipo y sus presupuestos.
  ipcMain.handle("appliance:deletePermanent", (event, id) => {
    const remove = db.transaction(() => {
      restockPendingBudgetsOf("appliance_id", id);
      return db.prepare("DELETE FROM appliance WHERE id = ?").run(id);
    });

    return { changes: remove().changes };
  });
}

module.exports = {
  registerApplianceHandler,
};
