const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("myAPI", {
  openByButton: () => ipcRenderer.invoke("open-by-button"),
  showSaveDialog: (args) => ipcRenderer.invoke("show-save-dialog", args),
  capture: (args) => ipcRenderer.invoke("capture", args),
  analyze: (args) => ipcRenderer.invoke("analyze", args),
  checkDirectory: (args) => ipcRenderer.invoke("check-directory", args),
  getImages: (args) => ipcRenderer.invoke("get-images", args),
  getAllStore: () => ipcRenderer.invoke("get-all-store"),
  getStoreByKey: (args) => ipcRenderer.invoke("get-store-by-key", args),
  result: (args) => ipcRenderer.invoke("result", args),
  home: () => ipcRenderer.invoke("home"),
});
