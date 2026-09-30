const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  //=======================
  //      ITEM
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

  selectImage: () => {
    return ipcRenderer.invoke("image:select");
  },

  getImageData: (imageName) => {
    return ipcRenderer.invoke("image:getData", imageName);
  },

  //=======================
  // CLIENTE
  //=======================

  getAllClients: () => {
    return ipcRenderer.invoke("client:getAll");
  },

  addClient: (client) => {
    return ipcRenderer.invoke("client:add", client);
  },

  updateClient: (client) => {
    return ipcRenderer.invoke("client:update", client);
  },

  deleteClient: (id) => {
    return ipcRenderer.invoke("client:delete", id);
  },

  getClientById: (id) => {
    return ipcRenderer.invoke("client:getById", id);
  },

  //=======================
  // ELECTRODOMESTICO
  //=======================

  getAllAppliance: () => {
    return ipcRenderer.invoke("appliance:getAll");
  },

  addAppliance: (appliance) => {
    return ipcRenderer.invoke("appliance:add", appliance);
  },

  updateAppliance: (appliance) => {
    return ipcRenderer.invoke("appliance:update", appliance);
  },

  deleteAppliance: (id) => {
    return ipcRenderer.invoke("appliance:delete", id);
  },

  getApplianceByClient: (client_id) => {
    return ipcRenderer.invoke("appliance:getByClient", client_id);
  },
});
