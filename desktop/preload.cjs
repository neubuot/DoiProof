const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('doiproof', {
  selectZip: () => ipcRenderer.invoke('select-zip'),
  checkFile: path => ipcRenderer.invoke('check-file', path),
  verify: (path, online) => ipcRenderer.invoke('verify-zip', path, online),
  showDetails: (path, evidenceHash) => ipcRenderer.invoke('show-details', path, evidenceHash),
  mapTiles: (latitude, longitude) => ipcRenderer.invoke('map-tiles', latitude, longitude),
  saveReport: report => ipcRenderer.invoke('save-report', report),
  copyHash: hash => ipcRenderer.invoke('copy-hash', hash),
  pathForFile: file => webUtils.getPathForFile(file),
});
