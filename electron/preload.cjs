const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  //=======================
  //      STOCK
  //=======================
  getAllItems: () => {
    return ipcRenderer.invoke("item:getAll");
  },

  addItem: (item) => {
    return ipcRenderer.invoke("item:add", item);
  },

  updateItem: (item) => {
    return ipcRenderer.invoke("item:update", item);
  },

  deleteItem: (id) => {
    return ipcRenderer.invoke("item:delete", id);
  },

  //Seccion imagen de stock
  selectImage: () => {
    return ipcRenderer.invoke("image:select");
  },

  getImageData: (imageName) => {
    return ipcRenderer.invoke("image:getData", imageName);
  },

  //fin seccion imagen
  //fin stock
});
