const { app, BrowserWindow, clipboard, dialog, ipcMain } = require('electron');
const { basename, extname, join, resolve } = require('node:path');
const { stat, writeFile } = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

let verifier;
const verify = async () => {
  verifier ??= import(pathToFileURL(join(__dirname, 'verify.mjs')).href);
  return verifier;
};
const SIZE_LIMIT = 200 * 1024 * 1024;
const smoke = process.argv.includes('--smoke');

function createWindow() {
  const window = new BrowserWindow({
    width: 1160, height: 800, minWidth: 890, minHeight: 670,
    backgroundColor: '#f5f3ed', title: 'DoiProof Prüfer',
    icon: join(__dirname, 'assets', 'icon.ico'),
    autoHideMenuBar: true, show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      webSecurity: true,
    },
  });
  window.loadFile(join(__dirname, 'index.html'));
  if (!smoke) window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  if (smoke) window.webContents.once('did-finish-load', async () => {
    try {
      const ready = await window.webContents.executeJavaScript(
        "Boolean(document.getElementById('verify-button') && document.getElementById('drop-zone') && window.doiproof?.selectZip)"
      );
      if (!ready) throw new Error('GUI oder sichere Preload-Brücke fehlen.');
      const snapshot = await window.webContents.capturePage();
      await writeFile(join(__dirname, 'preview.png'), snapshot.toPNG());
      app.quit();
    } catch (error) { process.stderr.write(String(error) + '\n'); app.exit(1); }
  });
}

app.whenReady().then(() => {
  ipcMain.handle('select-zip', async () => {
    const result = await dialog.showOpenDialog({
      title: 'DoiProof-Beweispaket auswählen',
      properties: ['openFile'],
      filters: [{ name: 'DoiProof ZIP', extensions: ['zip'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('check-file', async (_event, path) => {
    if (typeof path !== 'string' || extname(path).toLowerCase() !== '.zip') {
      throw new Error('Bitte eine ZIP-Datei auswählen.');
    }
    const file = await stat(path);
    if (!file.isFile() || file.size > SIZE_LIMIT) {
      throw new Error('ZIP fehlt oder ist größer als 200 MiB.');
    }
    return { path: resolve(path), name: basename(path), bytes: file.size };
  });
  ipcMain.handle('verify-zip', async (_event, path, online) => {
    if (typeof online !== 'boolean') throw new Error('Ungültige Prüfoption.');
    if (typeof path !== 'string' || extname(path).toLowerCase() !== '.zip') {
      throw new Error('Bitte eine ZIP-Datei auswählen.');
    }
    const file = await stat(path);
    if (!file.isFile() || file.size > SIZE_LIMIT) {
      throw new Error('ZIP fehlt oder ist größer als 200 MiB.');
    }
    return (await verify()).verifyBundle(path, online);
  });
  ipcMain.handle('save-report', async (_event, report) => {
    if (!report || typeof report !== 'object' || !report.local?.evidenceSha256
      || !/^[0-9a-f]{64}$/.test(report.local.evidenceSha256)) {
      throw new Error('Kein gültiges Prüfergebnis vorhanden.');
    }
    const answer = await dialog.showSaveDialog({
      title: 'Prüfbericht sichern',
      defaultPath: `DoiProof-Pruefbericht-${report.local.evidenceSha256.slice(0, 12)}.md`,
      filters: [{ name: 'Markdown-Bericht', extensions: ['md'] },
        { name: 'JSON-Daten', extensions: ['json'] }],
    });
    if (answer.canceled || !answer.filePath) return null;
    const content = extname(answer.filePath).toLowerCase() === '.json'
      ? JSON.stringify(report, null, 2) + '\n'
      : (await verify()).reportText(report);
    await writeFile(answer.filePath, content);
    return answer.filePath;
  });
  ipcMain.handle('copy-hash', (_event, hash) => {
    if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) {
      throw new Error('Ungültiger Hash.');
    }
    clipboard.writeText(hash);
    return true;
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => app.quit());
