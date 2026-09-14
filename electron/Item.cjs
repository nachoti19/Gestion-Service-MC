const { ipcMain, dialog, app } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { db } = require("./database.cjs");

function guardarImagen(originalImage) {
  if (!originalImage) {
    console.log("No se recibió ninguna imagen");
    return null;
  }

  const imagesPath = path.join(app.getPath("userData"), "images");

  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }

  const extension = path.extname(originalImage).toLowerCase();

  const imageName = `${crypto.randomUUID()}${extension}`;

  const destinationPath = path.join(imagesPath, imageName);

  console.log("Imagen original:", originalImage);
  console.log("Destino:", destinationPath);

  fs.copyFileSync(originalImage, destinationPath);

  console.log("Imagen guardada correctamente:", imageName);

  return imageName;
}

// ======================================
// REGISTRAR TODOS LOS HANDLERS DE ITEMS
// ======================================

function registerItemHandlers() {
  // ======================================
  // OBTENER TODOS LOS ITEMS
  // ======================================

  ipcMain.handle("item:getAll", () => {
    const result = db
      .prepare(
        `
      SELECT *
      FROM item
      ORDER BY id DESC
    `,
      )
      .all();

    return result;
  });

  // ======================================
  // AGREGAR ITEM
  // ======================================

  ipcMain.handle("item:add", (event, item) => {
    try {
      console.log("Item recibido desde React:", item);

      const { name, price, quantity, type, url_image } = item;

      let imageName = "imagen";

      if (url_image) {
        imageName = guardarImagen(url_image);
      }

      const result = db
        .prepare(
          `
        INSERT INTO item (
          name,
          price,
          quantity,
          type,
          url_image
        )
        VALUES (?, ?, ?, ?, ?)
      `,
        )
        .run(name, price, quantity, type, imageName);

      console.log("Item agregado:", result.lastInsertRowid);

      return {
        id: result.lastInsertRowid,
      };
    } catch (error) {
      console.error("Error al agregar item:", error);

      throw error;
    }
  });

  // ======================================
  // ACTUALIZAR ITEM
  // ======================================

  ipcMain.handle("item:update", (event, item) => {
    try {
      console.log("========== UPDATE ITEM ==========");

      console.log("Item recibido:", item);

      const { id, name, price, quantity, type, url_image, old_url_image } =
        item;

      let imageName = old_url_image || "imagen";

      // Si seleccionó una imagen nueva
      if (url_image && url_image !== old_url_image) {
        console.log("Se detectó una imagen nueva");

        const nuevaImagen = guardarImagen(url_image);

        if (!nuevaImagen) {
          throw new Error("No se pudo guardar la nueva imagen");
        }

        imageName = nuevaImagen;

        // Eliminar imagen anterior
        if (old_url_image && old_url_image !== "imagen") {
          const oldImagePath = path.join(
            app.getPath("userData"),
            "images",
            old_url_image,
          );

          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);

            console.log("Imagen anterior eliminada:", oldImagePath);
          }
        }
      }

      const result = db
        .prepare(
          `
        UPDATE item
        SET
          name = ?,
          price = ?,
          quantity = ?,
          type = ?,
          url_image = ?
        WHERE id = ?
      `,
        )
        .run(name, price, quantity, type, imageName, id);

      console.log("Cambios realizados:", result.changes);

      return {
        changes: result.changes,
      };
    } catch (error) {
      console.error("Error en update item:", error);

      throw error;
    }
  });

  // ======================================
  // ELIMINAR ITEM
  // ======================================

  ipcMain.handle("item:delete", (event, id) => {
    try {
      // Primero obtenemos el item
      const item = db
        .prepare(
          `
        SELECT url_image
        FROM item
        WHERE id = ?
      `,
        )
        .get(id);

      if (!item) {
        return {
          changes: 0,
        };
      }

      // Eliminamos de SQLite
      const result = db
        .prepare(
          `
        DELETE FROM item
        WHERE id = ?
      `,
        )
        .run(id);

      // Eliminamos también la imagen
      if (result.changes > 0 && item.url_image && item.url_image !== "imagen") {
        const imagePath = path.join(
          app.getPath("userData"),
          "images",
          item.url_image,
        );

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);

          console.log("Imagen eliminada:", imagePath);
        }
      }

      return {
        changes: result.changes,
      };
    } catch (error) {
      console.error("Error al eliminar item:", error);

      throw error;
    }
  });

  // ======================================
  // SELECCIONAR IMAGEN
  // ======================================

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

      const originalImage = result.filePaths[0];

      console.log("Imagen seleccionada:", originalImage);

      return originalImage;
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);

      return null;
    }
  });

  // ======================================
  // OBTENER IMAGEN PARA MOSTRAR EN REACT
  // ======================================

  ipcMain.handle("image:getData", (event, imageName) => {
    try {
      if (!imageName || imageName === "imagen") {
        return null;
      }

      const imagesPath = path.join(app.getPath("userData"), "images");

      const imagePath = path.join(imagesPath, imageName);

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

      const imageBuffer = fs.readFileSync(imagePath);

      return `
          data:${mimeType};
          base64,
          ${imageBuffer.toString("base64")}
        `.replace(/\s/g, "");
    } catch (error) {
      console.error("Error al cargar imagen:", error);

      return null;
    }
  });
}

module.exports = {
  registerItemHandlers,
};
