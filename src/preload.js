const { contextBridge, ipcRenderer } = require("electron");

// ここに記述してあるAPIの内容は、main.jsに書いてある。
contextBridge.exposeInMainWorld("myAPI", {
  openByButton: () => ipcRenderer.invoke("open-by-button"),
  // pdfを保存するためのダイアログを表示する
  showSaveDialog: (args) => ipcRenderer.invoke("show-save-dialog", args),
  capture: (args) => ipcRenderer.invoke("capture", args),
  // 差分を図る
  analyze: (args) => ipcRenderer.invoke("analyze", args),
  // 引数に指定された、画像のpathを取得
  checkDirectory: (args) => ipcRenderer.invoke("check-directory", args),
  // 引数に指定された、画像を取得
  getImages: (args) => ipcRenderer.invoke("get-images", args),
  // storeの値を取得
  getAllStore: () => ipcRenderer.invoke("get-all-store"),
  // 引数に指定されたstoreの値を取得
  getStoreByKey: (args) => ipcRenderer.invoke("get-store-by-key", args),
  // resultページに移動
  result: (args) => ipcRenderer.invoke("result", args),
  // homeページに移動
  home: () => ipcRenderer.invoke("home"),
});
