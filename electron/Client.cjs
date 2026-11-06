const { ipcMain } = require("electron");

const { db } = require("./database.cjs");
const { restockPendingBudgetsOf } = require("./Budget.cjs");

const text = (value) => String(value ?? "").trim();

function validateClient({ name, surname, phone, adress }) {
  if (!text(name)) throw new Error("El nombre es obligatorio");
  if (!text(surname)) throw new Error("El apellido es obligatorio");
  if (!text(phone)) throw new Error("El celular es obligatorio");
  if (!text(adress)) throw new Error("La dirección es obligatoria");
}

const softDeleteClient = db.transaction((id) => {
  db.prepare("UPDATE appliance SET deleted = 1 WHERE client_id = ?").run(id);
  return db.prepare("UPDATE client SET deleted = 1 WHERE id = ?").run(id);
});

const restoreClient = db.transaction((id) => {
  db.prepare("UPDATE appliance SET deleted = 0 WHERE client_id = ?").run(id);
  return db.prepare("UPDATE client SET deleted = 0 WHERE id = ?").run(id);
});

// BORRADO COMPLETO: elimina cliente, equipos y presupuestos.
// Lo reservado en presupuestos pendientes vuelve al stock.
const deleteClientPermanently = db.transaction((id) => {
  restockPendingBudgetsOf("client_id", id);
  return db.prepare("DELETE FROM client WHERE id = ?").run(id);
});

function registerClientHandler() {
  ipcMain.handle("client:getAll", () => {
    return db
      .prepare("SELECT * FROM client WHERE deleted = 0 ORDER BY id DESC")
      .all();
  });

  ipcMain.handle("client:getDeleted", () => {
    return db
      .prepare("SELECT * FROM client WHERE deleted = 1 ORDER BY id DESC")
      .all();
  });

  ipcMain.handle("client:add", (event, client) => {
    validateClient(client);

    const { name, surname, phone, adress, details, city } = client;

    const result = db
      .prepare(
        `INSERT INTO client (name, surname, phone, adress, details, city)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        text(name),
        text(surname),
        text(phone),
        text(adress),
        text(details),
        text(city) || "Tandil",
      );

    return { id: result.lastInsertRowid };
  });

  ipcMain.handle("client:update", (event, client) => {
    validateClient(client);

    const { id, name, surname, phone, adress, details, city } = client;

    const result = db
      .prepare(
        `UPDATE client SET
           name = ?, surname = ?, phone = ?, adress = ?, details = ?, city = ?
         WHERE id = ?`,
      )
      .run(
        text(name),
        text(surname),
        text(phone),
        text(adress),
        text(details),
        text(city) || "Tandil",
        id,
      );

    return { changes: result.changes };
  });

  // Borrado lógico (se puede restaurar)
  ipcMain.handle("client:delete", (event, id) => {
    return { changes: softDeleteClient(id).changes };
  });

  ipcMain.handle("client:restore", (event, id) => {
    return { changes: restoreClient(id).changes };
  });

  ipcMain.handle("client:deletePermanent", (event, id) => {
    return { changes: deleteClientPermanently(id).changes };
  });

  ipcMain.handle("client:getById", (event, id) => {
    return db.prepare("SELECT * FROM client WHERE id = ?").get(id);
  });
}

module.exports = {
  registerClientHandler,
};
