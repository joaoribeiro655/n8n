"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// API segura exposta para a tela (renderer). Nada de Node direto no front.
contextBridge.exposeInMainWorld("api", {
  run: (params) => ipcRenderer.invoke("run", params),
  exportCsv: (leads) => ipcRenderer.invoke("export-csv", leads),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onProgress: (cb) => {
    const handler = (_e, msg) => cb(msg);
    ipcRenderer.on("progress", handler);
    return () => ipcRenderer.removeListener("progress", handler);
  },
});
