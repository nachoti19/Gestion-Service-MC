const { ipcMain } = require("electron");

const { db, getOrCreateTypeId } = require("./database.cjs");

function registerApplianceTypeHandlers() {
  ipcMain.handle("applianceType:getAll", () => {
    return db
      .prepare("SELECT id, name FROM appliance_type ORDER BY name COLLATE NOCASE")
      .all();
  });

  ipcMain.handle("applianceType:add", (event, name) => {
    const id = getOrCreateTypeId(name);
    return db.prepare("SELECT id, name FROM appliance_type WHERE id = ?").get(id);
  });
}

module.exports = {
  registerApplianceTypeHandlers,
};
