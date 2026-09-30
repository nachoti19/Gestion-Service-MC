const { ipcMain, dialog, app } = require("electron");

const { db } = require("./database.cjs");

function registerApplianceHandler() {
  ipcMain.handle("appliance:getAll", () => {
    const result = db
      .prepare(
        `
            SELECT * FROM appliance ORDER BY id DESC`,
      )
      .all();
    return result;
  });

  ipcMain.handle("appliance:add", (event, appliance) => {
    console.log("Electrodomestico recibido desde react: ", appliance);

    const { type, brand, model, serial_number, client_id } = appliance;

    const result = db
      .prepare(
        `
            INSERT INTO appliance(
            type, brand, model, serial_number, client_id) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(type, brand, model, serial_number, client_id);
    console.log("electrodomestico agregado: ", appliance);

    return { id: result.lastInsertRowid };
  });

  ipcMain.handle("appliance:update", (event, appliance) => {
    try {
      const { id, type, brand, model, serial_number, client_id } = appliance;

      const result = db
        .prepare(
          `UPDATE appliance SET
          type =?,
            brand = ?,
            model = ?,
            serial_number = ?,
            client_id = ?
            WHERE id = ?`,
        )
        .run(type, brand, model, serial_number, client_id, id);

      console.log("cambios realizados: ", result.changes);
      return { changes: result.changes };
    } catch (error) {
      console.log("error al actualizar: ", error);
    }
  });

  ipcMain.handle("appliance:delete", (event, id) => {
    const result = db.prepare(`DELETE FROM appliance WHERE id = ?`).run(id);
    return { changes: result.changes };
  });

  ipcMain.handle("appliance:getByClient", (event, client_id) => {
    const result = db
      .prepare(
        `
      SELECT * FROM appliance WHERE client_id = ?`,
      )
      .all(client_id);
    return result;
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

module.exports = {
  registerApplianceHandler,
};
