"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, cb) {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

// API segura exposta para a tela (renderer). Nada de Node direto no front.
contextBridge.exposeInMainWorld("api", {
  run: (params) => ipcRenderer.invoke("run", params),
  exportCsv: (leads) => ipcRenderer.invoke("export-csv", leads),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  checkUpdates: () => ipcRenderer.invoke("check-updates"),
  onProgress: (cb) => subscribe("progress", cb),

  // WhatsApp (API não oficial)
  wa: {
    connect: () => ipcRenderer.invoke("wa-connect"),
    status: () => ipcRenderer.invoke("wa-status"),
    send: (payload) => ipcRenderer.invoke("wa-send", payload),
    stop: () => ipcRenderer.invoke("wa-stop"),
    logout: () => ipcRenderer.invoke("wa-logout"),
    onUpdate: (cb) => subscribe("wa-update", cb),
    onProgress: (cb) => subscribe("wa-progress", cb),
  },
});
