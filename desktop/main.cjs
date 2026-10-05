const { app, BrowserWindow, clipboard, dialog, ipcMain } = require('electron');
const { basename, extname, join, resolve } = require('node:path');
const { mkdir, readFile, stat, writeFile } = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

let reportModule;
const report = async () => {
  reportModule ??= import(pathToFileURL(join(__dirname, 'report.mjs')).href);
  return reportModule;
};
const SIZE_LIMIT = 200 * 1024 * 1024;
const smoke = process.argv.includes('--smoke');
const TILE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
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

async function mapTile(tile) {
  const cache = join(app.getPath('userData'), 'map-cache');
  const path = join(cache, `${tile.zoom}-${tile.x}-${tile.y}.png`);
  try {
    if (Date.now() - (await stat(path)).mtimeMs < TILE_MAX_AGE) return (await readFile(path)).toString('base64');
  } catch { /* No cached tile. */ }
  const response = await fetch(`https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`, {
    headers: { 'User-Agent': `DoiProof-Pruefer/${app.getVersion()} (+https://github.com/neubuot/DoiProof)` },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) {
    throw new Error('Kartenkachel nicht verfügbar.');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 1024 * 1024) throw new Error('Kartenkachel ist zu groß.');
  await mkdir(cache, { recursive: true });
  await writeFile(path, bytes);
  return bytes.toString('base64');
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
        "Boolean(document.getElementById('verify-button') && document.getElementById('drop-zone') && document.getElementById('reveal-button') && document.getElementById('photo-dialog') && document.getElementById('map-button') && document.getElementById('pdf-photo') && document.getElementById('pdf-location') && window.doiproof?.showDetails && window.doiproof?.mapTiles && window.doiproof?.saveReport)"
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
    const { tileGrid } = await import(pathToFileURL(join(__dirname, 'map.mjs')).href);
    const grid = tileGrid(latitude, longitude);
    const tiles = await Promise.all(grid.tiles.map(async tile => ({
      col: tile.col, row: tile.row,
      data: `data:image/png;base64,${await mapTile(tile)}`,
    })));
    return { ...grid, tiles };
  });
  ipcMain.handle('save-report', async (_event, options) => {
    if (!lastResult) throw new Error('Kein Prüfergebnis vorhanden. Bitte das Paket zuerst prüfen.');
    const includePhoto = options?.includePhoto !== false;
    const includeLocation = options?.includeLocation !== false;
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
    if (extension === '.json') {
      if (!cached.local) throw new Error('JSON gibt es nur nach bestandener lokaler Prüfung. Bitte den PDF-Bericht wählen.');
      content = JSON.stringify(summary, null, 2) + '\n';
    } else if (extension === '.md') content = module.markdownReport(summary);
    else content = (await module.createDesktopPdf(cached, { includePhoto, includeLocation })).pdf;
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
