const { ipcMain, dialog, app } = require("electron");

const { db } = require("./database.cjs");

function registerClientHandler() {
  ipcMain.handle("client:getAll", () => {
    const result = db
      .prepare(
        `
    SELECT * FROM client ORDER BY id DESC`,
      )
      .all();
    return result;
  });

  ipcMain.handle("client:add", (event, client) => {
    console.log("cliente recibido desde react: ", client);

    const { name, surname, phone, adress, details, city } = client;

    const result = db
      .prepare(
        `
    INSERT INTO client (
    name, surname, phone, adress, details, city) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(name, surname, phone, adress, details, city);

    console.log("cliente agregado: ", client);

    return { id: result.lastInsertRowid };
  });

  ipcMain.handle("client:update", (event, client) => {
    try {
      const { id, name, surname, phone, adress, details, city } = client;

      const result = db
        .prepare(
          `
      UPDATE client SET 
      name = ?,
      surname = ?,
      phone = ?,
      adress = ?,
      details = ?,
      city = ?
      WHERE id = ?`,
        )
        .run(name, surname, phone, adress, details, city, id);

      console.log("cambios realizados", result.changes);

      return { changes: result.changes };
    } catch (error) {
      console.log("error al actualizar el cliente", client);
    }
  });

  ipcMain.handle("client:delete", (event, id) => {
    const result = db
      .prepare(
        `
    DELETE FROM client WHERE id = ?`,
      )
      .run(id);

    console.log("DELETE result:", result);
    return { changes: result.changes };
  });
  //EVENTOS DE ELECTRON

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

module.exports = {
  registerClientHandler,
};
