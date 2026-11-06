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

  getApplianceByClient: (client_id, deleted = false) => {
    return ipcRenderer.invoke("appliance:getByClient", client_id, deleted);
  },

  getApplianceById: (id) => {
    return ipcRenderer.invoke("appliance:getById", id);
  },

  //=======================
  // PRESUPUESTOS
  //=======================

  //=======================
  // TIPOS DE EQUIPO
  //=======================

  getApplianceTypes: () => {
    return ipcRenderer.invoke("applianceType:getAll");
  },

  addApplianceType: (name) => {
    return ipcRenderer.invoke("applianceType:add", name);
  },

  //=======================
  // VENTAS PARTICULARES
  //=======================

  createSale: (lines) => {
    return ipcRenderer.invoke("sale:create", lines);
  },

  getAllSales: () => {
    return ipcRenderer.invoke("sale:getAll");
  },

  getSaleItems: (saleId) => {
    return ipcRenderer.invoke("sale:getItems", saleId);
  },

  //=======================
  // CLIENTES (extra)
  //=======================

  getDeletedClients: () => {
    return ipcRenderer.invoke("client:getDeleted");
  },

  restoreClient: (id) => {
    return ipcRenderer.invoke("client:restore", id);
  },

  deleteClientPermanently: (id) => {
    return ipcRenderer.invoke("client:deletePermanent", id);
  },

  //=======================
  // EQUIPOS (extra)
  //=======================

  restoreAppliance: (id) => {
    return ipcRenderer.invoke("appliance:restore", id);
  },

  deleteAppliancePermanently: (id) => {
    return ipcRenderer.invoke("appliance:deletePermanent", id);
  },

  //=======================
  // PRESUPUESTOS
  //=======================

  createBudget: (payload) => {
    return ipcRenderer.invoke("budget:create", payload);
  },

  updateBudget: (payload) => {
    return ipcRenderer.invoke("budget:update", payload);
  },

  setBudgetState: (id, state) => {
    return ipcRenderer.invoke("budget:setState", id, state);
  },

  getBudgetById: (id) => {
    return ipcRenderer.invoke("budget:getById", id);
  },

  getBudgetsByAppliance: (applianceId) => {
    return ipcRenderer.invoke("budget:getByAppliance", applianceId);
  },

  getHistory: () => {
    return ipcRenderer.invoke("history:getAll");
  },

  getPartsReport: (from, to) => {
    return ipcRenderer.invoke("report:parts", from, to);
  },

  //=======================
  // PDF
  //=======================

  getBudgetPdf: (budgetId) => {
    return ipcRenderer.invoke("pdf:getBudget", budgetId);
  },

  saveBudgetPdf: (budgetId) => {
    return ipcRenderer.invoke("pdf:saveBudget", budgetId);
  },

  openBudgetPdf: (budgetId) => {
    return ipcRenderer.invoke("pdf:openBudget", budgetId);
  },

  parseInsurerPdf: () => {
    return ipcRenderer.invoke("pdf:parseInsurer");
  },

  deleteBudget: (id) => {
    return ipcRenderer.invoke("budget:delete", id);
  },

  //=======================
  // INFORMES DE REPUESTOS
  //=======================

  createPartsReport: (payload) => {
    return ipcRenderer.invoke("partsReport:create", payload);
  },

  getPartsReports: () => {
    return ipcRenderer.invoke("partsReport:getAll");
  },

  getPartsReportById: (id) => {
    return ipcRenderer.invoke("partsReport:getById", id);
  },

  deletePartsReport: (id) => {
    return ipcRenderer.invoke("partsReport:delete", id);
  },

  getPartsReportPdf: (id) => {
    return ipcRenderer.invoke("pdf:getPartsReport", id);
  },

  savePartsReportPdf: (id) => {
    return ipcRenderer.invoke("pdf:savePartsReport", id);
  },

  openPartsReportPdf: (id) => {
    return ipcRenderer.invoke("pdf:openPartsReport", id);
  },
});
