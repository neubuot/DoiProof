const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('doiproof', {
  selectZip: () => ipcRenderer.invoke('select-zip'),
  checkFile: path => ipcRenderer.invoke('check-file', path),
  verify: (path, online) => ipcRenderer.invoke('verify-zip', path, online),
  saveReport: report => ipcRenderer.invoke('save-report', report),
  copyHash: hash => ipcRenderer.invoke('copy-hash', hash),
  pathForFile: file => webUtils.getPathForFile(file),
});
