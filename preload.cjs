const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quicktext', {
  getLicenseStatus: () => ipcRenderer.invoke('license:status'),
  activateLicense: (key) => ipcRenderer.invoke('license:activate', key),
  deactivateLicense: () => ipcRenderer.invoke('license:deactivate'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
});
