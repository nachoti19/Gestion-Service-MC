const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

//BASE DE DATOS

const { db, dbPath } = require("./electron/database.cjs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
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
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

//=================================
//  SECCION STOCK
//=================================

//FUNCION PARA GUARDAR LA IMAGEN...

function guardarImagen(originalImage) {
  if (!originalImage) {
    console.log("No se recibió ninguna imagen");
    return null;
  }

  const imagesPath = path.join(app.getPath("userData"), "images");

  // Crear carpeta si no existe
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }

  // Obtener extensión
  const extension = path.extname(originalImage).toLowerCase();

  // Crear nombre único
  const imageName = `${crypto.randomUUID()}${extension}`;

  // Ruta final donde se va a guardar
  const destinationPath = path.join(imagesPath, imageName);

  console.log("Imagen original:", originalImage);
  console.log("Destino:", destinationPath);

  // Copiar imagen
  fs.copyFileSync(originalImage, destinationPath);

  console.log("Imagen guardada correctamente:", imageName);

  // IMPORTANTE:
  // devolvemos solamente el nombre,
  // NO la ruta completa
  return imageName;
}

//Solicitamos los items
ipcMain.handle("item:getAll", () => {
  const result = db
    .prepare(
      `
    SELECT * FROM item ORDER BY id DESC`,
    )
    .all();
  return result;
});

//Agregar item al stock

ipcMain.handle("item:add", (event, item) => {
  console.log("item recibido desde react: ", item);

  const { name, price, quantity, type, url_image } = item;

  let imageName = "image";

  if (url_image) {
    imageName = guardarImagen(url_image);
  }

  const result = db
    .prepare(
      `
    INSERT INTO item (
    name , price, quantity, type, url_image) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(name, price, quantity, type, imageName);

  console.log("item agregado correctamente: ", result.lastInsertRowid);

  return { id: result.lastInsertRowid };
});

//Actualizar item

ipcMain.handle("item:update", (event, item) => {
  try {
    console.log("========== UPDATE ITEM ==========");
    console.log("Item recibido:", item);

    const { id, name, price, quantity, type, url_image, old_url_image } = item;

    let imageName = old_url_image || "imagen";

    // Si se seleccionó una imagen nueva
    if (url_image && url_image !== old_url_image) {
      console.log("Se detectó una imagen nueva");

      const nuevaImagen = guardarImagen(url_image);

      if (!nuevaImagen) {
        throw new Error("No se pudo guardar la nueva imagen");
      }

      imageName = nuevaImagen;

      console.log("Nueva imagen guardada:", imageName);

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

    console.log("Imagen que se guardará en SQLite:", imageName);

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
    console.error("ERROR EN UPDATE ITEM:", error);

    throw error;
  }
});

//Eliminar item

ipcMain.handle("item:delete", (event, id) => {
  const result = db
    .prepare(
      `
    DELETE FROM item WHERE id = ?`,
    )
    .run(id);
  return { changes: result.changes };
});

//Cargar imagen del producto

ipcMain.handle("image:select", async () => {
  const result = await dialog.showOpenDialog({
    title: "Seleccione una imagen",
    properties: ["openFile"],
    filters: [
      {
        name: "Imágenes",
        extensions: ["jpg", "jpeg", "png", "webp"],
      },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const originalImage = result.filePaths[0];

  console.log("Imagen seleccionada:", originalImage);

  return originalImage;
});

ipcMain.handle("image:getData", (event, imageName) => {
  try {
    if (!imageName || imageName === "imagen") {
      return null;
    }
    const imagesPath = path.join(app.getPath("userData"), "images");
    const imagePath = path.join(imagesPath, imageName);

    if (!fs.existsSync(imagePath)) {
      console.error("no existe la imagen", imagePath);
      return null;
    }
    const extend = path.extname(imageName).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };
    const mimeType = mimeTypes[extend] || "application/octet-stream";

    const imageBuffer = fs.readFileSync(imagePath);

    return `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Error al cargar imagen:", error);
    return null;
  }
});

//EVENTOS DE ELECTRON

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

//PARA CERRAR CORRECTAMENTE LA BASE DE DATOS...
app.on("will-quit", () => {
  db.close();
});
