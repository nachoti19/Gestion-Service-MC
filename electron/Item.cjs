const { ipcMain, dialog, app } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { db, getOrCreateTypeId } = require("./database.cjs");

const IMAGES_DIR = () => path.join(app.getPath("userData"), "images");

function guardarImagen(originalImage) {
  if (!originalImage) {
    return null;
  }

  const imagesPath = IMAGES_DIR();

  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }

  const extension = path.extname(originalImage).toLowerCase();
  const imageName = `${crypto.randomUUID()}${extension}`;

  fs.copyFileSync(originalImage, path.join(imagesPath, imageName));

  return imageName;
}

function borrarImagen(imageName) {
  if (!imageName || imageName === "imagen") return;

  const imagePath = path.join(IMAGES_DIR(), imageName);

  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
}

function validateItem({ name, price, quantity }) {
  if (!String(name ?? "").trim()) {
    throw new Error("El nombre es obligatorio");
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("El precio no es válido");
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("El stock debe ser un número entero mayor o igual a 0");
  }
}

// ======================================
// REGISTRAR TODOS LOS HANDLERS DE ITEMS
// ======================================

function registerItemHandlers() {
  ipcMain.handle("item:getAll", () => {
    return db
      .prepare(
        `SELECT i.id, i.name, i.price, i.quantity, i.url_image, t.name AS type
         FROM item i
         JOIN appliance_type t ON t.id = i.type_id
         WHERE i.deleted = 0
         ORDER BY i.id DESC`,
      )
      .all();
  });

  ipcMain.handle("item:add", (event, item) => {
    const { name, price, quantity, type, url_image } = item;

    validateItem({ name, price, quantity });

    const typeId = getOrCreateTypeId(type);

    let imageName = "imagen";

    if (url_image) {
      imageName = guardarImagen(url_image) || "imagen";
    }

    const result = db
      .prepare(
        `INSERT INTO item (name, price, quantity, type_id, url_image)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(String(name).trim(), price, quantity, typeId, imageName);

    return { id: result.lastInsertRowid };
  });

  ipcMain.handle("item:update", (event, item) => {
    const { id, name, price, quantity, type, url_image, old_url_image } = item;

    validateItem({ name, price, quantity });

    const typeId = getOrCreateTypeId(type);

    let imageName = old_url_image || "imagen";

    // Si seleccionó una imagen nueva
    if (url_image && url_image !== old_url_image) {
      const nuevaImagen = guardarImagen(url_image);

      if (!nuevaImagen) {
        throw new Error("No se pudo guardar la nueva imagen");
      }

      imageName = nuevaImagen;
    }

    const result = db
      .prepare(
        `UPDATE item SET
           name = ?,
           price = ?,
           quantity = ?,
           type_id = ?,
           url_image = ?
         WHERE id = ?`,
      )
      .run(String(name).trim(), price, quantity, typeId, imageName, id);

    // Recién cuando se guardó bien, borramos la imagen anterior
    if (imageName !== (old_url_image || "imagen")) {
      borrarImagen(old_url_image);
    }

    return { changes: result.changes };
  });

  // Si el repuesto ya se usó en una venta o presupuesto no se puede borrar
  // sin romper el historial: se oculta (borrado lógico).
  ipcMain.handle("item:delete", (event, id) => {
    const item = db
      .prepare("SELECT url_image FROM item WHERE id = ?")
      .get(id);

    if (!item) {
      return { changes: 0, archived: false };
    }

    const used = db
      .prepare(
        `SELECT 1 AS used FROM sale_item WHERE item_id = ?
         UNION
         SELECT 1 AS used FROM budget_item WHERE item_id = ?`,
      )
      .get(id, id);

    if (used) {
      const result = db
        .prepare("UPDATE item SET deleted = 1, quantity = 0 WHERE id = ?")
        .run(id);

      return { changes: result.changes, archived: true };
    }

    const result = db.prepare("DELETE FROM item WHERE id = ?").run(id);

    if (result.changes > 0) {
      borrarImagen(item.url_image);
    }

    return { changes: result.changes, archived: false };
  });

  ipcMain.handle("image:select", async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: "Seleccione una imagen",
        properties: ["openFile"],
        filters: [
          {
            name: "Imágenes",
            extensions: ["jpg", "jpeg", "png", "webp", "gif"],
          },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      return null;
    }
  });

  ipcMain.handle("image:getData", (event, imageName) => {
    try {
      if (!imageName || imageName === "imagen") {
        return null;
      }

      const imagePath = path.join(IMAGES_DIR(), imageName);

      if (!fs.existsSync(imagePath)) {
        console.error("No existe la imagen:", imagePath);
        return null;
      }

      const extension = path.extname(imageName).toLowerCase();

      const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
      };

      const mimeType = mimeTypes[extension] || "application/octet-stream";

      return `data:${mimeType};base64,${fs.readFileSync(imagePath).toString("base64")}`;
    } catch (error) {
      console.error("Error al cargar imagen:", error);
      return null;
    }
  });
}

module.exports = {
  registerItemHandlers,
};
