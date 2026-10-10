const { app, BrowserWindow, clipboard, dialog, ipcMain } = require('electron');
const { basename, extname, join, resolve } = require('node:path');
const { mkdir, readFile, stat, writeFile } = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

let reportModule;
const report = async () => {
  reportModule ??= import(pathToFileURL(join(__dirname, 'report.mjs')).href);
  return reportModule;
};
let mapModules;
const maps = async () => {
  mapModules ??= Promise.all([
    import(pathToFileURL(join(__dirname, 'core', 'map.mjs')).href),
    import(pathToFileURL(join(__dirname, 'core', 'node.mjs')).href),
  ]);
  const [map, node] = await mapModules;
  return { map, node };
};
const SIZE_LIMIT = 200 * 1024 * 1024;
const smoke = process.argv.includes('--smoke');
// Letztes vollständiges Prüfergebnis. Bleibt im Hauptprozess; die Oberfläche erhält nur eine Zusammenfassung.
let lastResult = null;

async function checkedZip(path) {
  if (typeof path !== 'string' || extname(path).toLowerCase() !== '.zip') {
    throw new Error('Bitte eine ZIP-Datei auswählen.');
  }
  const file = await stat(path);
  if (!file.isFile() || file.size > SIZE_LIMIT) {
    throw new Error('ZIP fehlt oder ist größer als 200 MiB.');
  }
  return { path: resolve(path), name: basename(path), bytes: file.size };
}

/** Kachelzugriff wie bisher: User-Agent des Prüfers, Cache im Benutzerprofil (7 Tage). */
async function tileLoader() {
  const { map, node } = await maps();
  return {
    fetchImpl: fetch,
    userAgent: map.mapUserAgent(`DoiProof-Pruefer/${app.getVersion()}`),
    cache: node.fileTileCache(join(app.getPath('userData'), 'map-cache')),
  };
}

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
        "Boolean(document.getElementById('verify-button') && document.getElementById('drop-zone') && document.getElementById('reveal-button') && document.getElementById('photo-dialog') && document.getElementById('map-button') && document.getElementById('pdf-photo') && document.getElementById('pdf-location') && document.getElementById('pdf-map') && window.doiproof?.showDetails && window.doiproof?.mapTiles && window.doiproof?.saveReport)"
      );
      if (!ready) throw new Error('GUI oder sichere Preload-Brücke fehlen.');
      const { verifyForDesktop, createDesktopPdf } = await report();
      if (typeof verifyForDesktop !== 'function' || typeof createDesktopPdf !== 'function') throw new Error('Prüfkern fehlt.');
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
    lastResult = null;
    return checkedZip(path);
  });
  ipcMain.handle('verify-zip', async (_event, path, online) => {
    if (typeof online !== 'boolean') throw new Error('Ungültige Prüfoption.');
    await checkedZip(path);
    lastResult = null;
    const { full, summary } = await (await report()).verifyForDesktop(path, online);
    lastResult = full;
    return summary;
  });
  ipcMain.handle('show-details', async (_event, path, expectedHash) => {
    const file = await checkedZip(path);
    const { evidenceDetails } = await import(pathToFileURL(join(__dirname, 'details.mjs')).href);
    return evidenceDetails(new Uint8Array(await readFile(file.path)), expectedHash);
  });
  ipcMain.handle('map-tiles', async (_event, latitude, longitude) => {
    const { map } = await maps();
    const grid = map.tileGrid(latitude, longitude);
    const tiles = await map.loadMapTiles({ tiles: grid.tiles }, await tileLoader());
    return {
      ...grid,
      tiles: tiles.map(tile => ({ col: tile.col, row: tile.row, data: `data:image/png;base64,${Buffer.from(tile.bytes).toString('base64')}` })),
    };
  });
  ipcMain.handle('save-report', async (_event, options) => {
    if (!lastResult) throw new Error('Kein Prüfergebnis vorhanden. Bitte das Paket zuerst prüfen.');
    const includePhoto = options?.includePhoto !== false;
    const includeLocation = options?.includeLocation !== false;
    const includeMap = includeLocation && options?.includeMap === true;
    const cached = lastResult;
    const module = await report();
    const answer = await dialog.showSaveDialog({
      title: 'Prüfbericht sichern',
      defaultPath: module.defaultReportName(cached),
      filters: [{ name: 'PDF-Prüfbericht', extensions: ['pdf'] },
        { name: 'Markdown-Kurzbericht', extensions: ['md'] },
        { name: 'JSON-Daten', extensions: ['json'] }],
    });
    if (answer.canceled || !answer.filePath) return null;
    const extension = extname(answer.filePath).toLowerCase();
    const summary = {
      generatedAtUtc: cached.generatedAtUtc, file: cached.path, local: cached.local, online: cached.online,
    };
    let content;
    let map = null;
    if (extension === '.json') {
      if (!cached.local) throw new Error('JSON gibt es nur nach bestandener lokaler Prüfung. Bitte den PDF-Bericht wählen.');
      content = JSON.stringify(summary, null, 2) + '\n';
    } else if (extension === '.md') content = module.markdownReport(summary);
    else {
      const created = await module.createDesktopPdf(cached, {
        includePhoto, includeLocation, includeMap, mapLoader: includeMap ? await tileLoader() : undefined,
      });
      content = created.pdf;
      map = created.mapStatus;
    }
    await writeFile(answer.filePath, content);
    return { path: answer.filePath, map };
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
