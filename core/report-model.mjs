/**
 * Berichtsmodell für den PDF-Prüfbericht nach docs/design/PRUEFBERICHT-DESIGN.md.
 * Reine Daten: alle Texte, Zustände und Tabellen. Das Rendering übernimmt report-pdf.mjs.
 */
import {
  formatBytes, formatCoordinate, formatDate, formatDateTime, formatDateTimeMinutes,
  formatDuration, formatInt, formatLongDate, formatMeasure, formatTime, formatUtc, reportNumber,
  systemTimeZone, UTC, zoneLabel,
} from './format.mjs';
import { ORIENTATION_TEXT } from './image.mjs';
import { SENSORS, SENSOR_KEYS, STATUS_TEXT, barometricAltitude, sensorOverview, seriesStats } from './sensors.mjs';
import { isPlainObject } from './util.mjs';

export const VERIFILE_URL = 'https://verifile.it/#';
const DEVICE_NOTE = 'Geräteangabe, nicht unabhängig belegt';
const PLATFORM = { android: 'Android', ios: 'iOS', web: 'Web' };
const STEP_TEXT = { ok: 'stimmt', failed: 'stimmt nicht', skipped: 'nicht geprüft' };

/**
 * @typedef {'proof'|'hint'|'neutral'|'warning'|'failed'} TileKind
 * @typedef {{ kind: TileKind, icon: 'check'|'camera'|'pin'|'clock'|'cross'|'minus', title: string, text: string }} Tile
 * @typedef {{ quantity: string, value: string, time: string, source: string, note: string }} AppendixRow
 */

/** @param {unknown} value */
const iso = value => (typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(Date.parse(value)) : null);
/** @param {unknown} value */
const num = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** @param {Date | null} date */
function utcStamp(date) {
  if (!date) return '–';
  const ms = date.getUTCMilliseconds();
  return `${formatDate(date, UTC)} ${formatTime(date, UTC)}${ms ? `,${String(ms).padStart(3, '0')}` : ''} UTC`;
}

/** @param {Record<string, any>} manifest */
function locationState(manifest) {
  const location = manifest.location;
  if (!isPlainObject(location)) return { status: 'absent', location: null };
  const status = location.status ?? 'recorded';
  return { status, location: status === 'recorded' ? location : null, reason: location.reason };
}

/**
 * Sammelt alle Blattpfade eines Objekts, um im Anhang keine Angabe zu übersehen.
 * @param {unknown} value
 * @param {string} prefix
 * @param {Map<string, unknown>} out
 */
function leaves(value, prefix, out) {
  if (Array.isArray(value)) {
    if (!value.length) out.set(prefix, '[]');
    value.forEach((item, index) => leaves(item, `${prefix}[${index}]`, out));
  } else if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (!entries.length) out.set(prefix, '{}');
    for (const [key, item] of entries) leaves(item, prefix ? `${prefix}.${key}` : key, out);
  } else out.set(prefix, value);
  return out;
}

/** Betriebssystem lesbar: Android meldet als osVersion den API-Level. @param {Record<string, any>} device */
function osText(device) {
  const name = /** @type {Record<string, string>} */ (PLATFORM)[device.platform] ?? String(device.platform);
  if (device.platform === 'android') {
    if (typeof device.osRelease === 'string' && device.osRelease) return `${name} ${device.osRelease}`;
    return typeof device.osVersion === 'number' ? `${name} (API ${device.osVersion})` : name;
  }
  return device.osVersion !== undefined ? `${name} ${device.osVersion}` : name;
}

/** @param {unknown} value */
function plain(value) {
  if (value === null) return 'nicht erfasst (null)';
  if (typeof value === 'boolean') return value ? 'ja' : 'nein';
  if (typeof value === 'number') return formatMeasure(value);
  return String(value);
}

/**
 * @param {{
 *   analysis: import('./verify.mjs').BundleAnalysis,
 *   online?: import('./verify.mjs').OnlineResult | null,
 *   fileName: string,
 *   generatedAt?: Date,
 *   timeZone?: import('./format.mjs').TimeZone,
 *   includePhoto?: boolean,
 *   includeLocation?: boolean,
 *   producer?: string,
 * }} input
 */
export function buildReportModel(input) {
  const { analysis } = input;
  const online = input.online ?? null;
  const generatedAt = input.generatedAt ?? new Date();
  const tz = input.timeZone ?? systemTimeZone();
  const includePhoto = input.includePhoto !== false;
  const includeLocation = input.includeLocation !== false;
  const manifest = analysis.manifest ?? {};
  const verification = analysis.verification ?? {};
  const version = analysis.version ?? '?';
  const evidenceHash = analysis.hashes.evidenceSha256;
  const numberSource = evidenceHash ?? analysis.zip.sha256;
  const number = reportNumber(numberSource);
  const anchor = online?.anchor;
  const anchorMatched = !!online && anchor?.status === 'matched';
  const failed = !analysis.ok || online?.status === 'failed';
  const outcome = failed ? 'failed' : anchorMatched ? 'passed' : 'incomplete';
  const pending = anchor?.status === 'pending';
  const sealed = anchorMatched && anchor?.blockTimeUtc ? new Date(anchor.blockTimeUtc) : null;
  const capture = isPlainObject(manifest.capture) ? manifest.capture : {};
  const captureTime = iso(capture.deviceTime);
  const fromCamera = capture.source === 'camera';
  const pre = isPlainObject(manifest.preCapture) ? manifest.preCapture : null;
  const preStatus = online?.preCapture ?? null;
  const loc = locationState(manifest);
  const device = isPlainObject(manifest.device) ? manifest.device : null;
  const app = isPlainObject(manifest.app) ? manifest.app : null;
  const sensors = isPlainObject(manifest.sensors) ? manifest.sensors : null;
  const overview = sensorOverview(sensors);
  const photoInfo = analysis.photoInfo;
  const fmtLocal = (/** @type {Date} */ date) => formatDateTime(date, tz);

  // Zeitanker: frühester belegter Zeitpunkt = jüngster Vorabblock im Paket.
  /** @type {{ chain: 'bitcoin'|'doichain', time: Date, height: number, verified: boolean } | null} */
  let earliest = null;
  if (pre) {
    for (const key of /** @type {const} */ (['bitcoin', 'doichain'])) {
      const block = pre[key];
      const time = iso(block?.headerTimeUtc);
      if (!time) continue;
      const verified = preStatus?.[key]?.status === 'matched';
      if (!earliest || time > earliest.time) earliest = { chain: key, time, height: block.height, verified };
    }
  }
  const chainName = (/** @type {'bitcoin'|'doichain'} */ key) => (key === 'bitcoin' ? 'Bitcoin' : 'Doichain');

  // ---------- Banner ----------
  /** @type {{ eyebrow: string, title: string, accent: string, text: string }} */
  let banner;
  if (outcome === 'passed') {
    banner = {
      eyebrow: 'ERGEBNIS DER PRÜFUNG', title: 'Echt versiegelt', accent: 'und unverändert.',
      text: `Foto und Aufnahmedaten sind seit dem ${sealed ? formatLongDate(sealed, tz) : 'Bestätigungsblock'} fälschungssicher auf der Doichain versiegelt. Wäre auch nur ein Pixel oder eine einzige Angabe nachträglich verändert worden, hätte diese Prüfung angeschlagen.`,
    };
  } else if (outcome === 'incomplete') {
    const why = !online ? 'Die Doichain wurde bei dieser Prüfung nicht abgefragt'
      : pending ? 'Die Einreichung ist noch in keinem Doichain-Block bestätigt'
        : 'Ein Abfragedienst war nicht erreichbar';
    banner = {
      eyebrow: 'ERGEBNIS DER PRÜFUNG', title: 'Unverändert,',
      accent: !online ? 'Kette nicht abgefragt.' : pending ? 'Versiegelung ausstehend.' : 'Kette nicht erreichbar.',
      text: `Foto und Aufnahmedaten stimmen Bit für Bit mit dem Beweispaket überein. ${why}, daher belegt dieser Bericht noch keinen Zeitpunkt.`,
    };
  } else if (!analysis.ok) {
    banner = {
      eyebrow: 'ERGEBNIS DER PRÜFUNG', title: 'Prüfung', accent: 'fehlgeschlagen.',
      text: `${analysis.error ?? 'Unbekannter Fehler.'} Das Beweispaket ist verändert, beschädigt oder unvollständig und darf nicht als unverändert gelten.`,
    };
  } else {
    const detail = online?.checks.find(check => check.status === 'failed');
    banner = {
      eyebrow: 'ERGEBNIS DER PRÜFUNG', title: 'Widerspruch', accent: 'zur Blockchain.',
      text: `Foto und Aufnahmedaten sind in sich stimmig, aber die Kettenabfrage widerspricht dem Paket (${detail ? `${detail.name}: ${detail.details}` : 'siehe Seite 2'}). Der Nachweis darf so nicht als versiegelt gelten.`,
    };
  }

  // ---------- Auf einen Blick ----------
  /** @type {{ label: string, value: string, sub?: string, mono?: boolean }[]} */
  const glance = [];
  if (captureTime) {
    const gap = sealed ? ` · ${formatDuration(sealed.getTime() - captureTime.getTime())} vor der Versiegelung` : '';
    glance.push({ label: 'Aufgenommen', value: fmtLocal(captureTime), sub: fromCamera ? `laut Gerät${gap}` : `Gerätezeit der Auswahl${gap}` });
  } else {
    glance.push({ label: 'Aufgenommen', value: 'unbekannt', sub: fromCamera ? 'keine Gerätezeit im Manifest' : 'vorhandenes Bild, Aufnahmezeit nicht belegt' });
  }
  if (sealed) {
    glance.push({ label: 'Versiegelt', value: fmtLocal(sealed), sub: `Doichain-Block ${formatInt(anchor?.blockHeight ?? 0)}${anchor?.confirmations ? `, ${formatInt(anchor.confirmations)}-fach bestätigt` : ''}` });
  } else if (anchorMatched) {
    glance.push({ label: 'Versiegelt', value: 'bestätigt', sub: `Doichain-Block ${formatInt(anchor?.blockHeight ?? 0)}, Blockzeit nicht gemeldet` });
  } else if (pending) {
    glance.push({ label: 'Versiegelt', value: 'ausstehend', sub: 'noch in keinem Doichain-Block bestätigt' });
  } else if (!online) {
    glance.push({ label: 'Versiegelt', value: 'nicht abgefragt', sub: `Exportstatus: ${verification.status ? String(verification.status) : 'unbekannt'} (Selbstauskunft)` });
  } else {
    glance.push({ label: 'Versiegelt', value: 'nicht bestätigt', sub: anchor?.status === 'failed' ? 'Kettenabfrage widerspricht dem Paket' : 'Abfragedienst nicht erreichbar' });
  }
  if (loc.location && includeLocation) {
    const l = loc.location;
    const parts = ['GPS'];
    if (num(l.accuracy) !== null) parts.push(`Genauigkeit ± ${formatMeasure(Math.round(l.accuracy))} m`);
    if (num(l.altitude) !== null) parts.push(`Höhe ${formatMeasure(Math.round(l.altitude))} m`);
    glance.push({
      label: 'Ort', value: `${formatCoordinate(l.latitude, 'lat')} · ${formatCoordinate(l.longitude, 'lon')}`,
      sub: l.mocked === true ? 'Gerät meldet einen simulierten Standort!' : parts.join(', '),
    });
  } else if (loc.location) {
    glance.push({ label: 'Ort', value: 'ausgeblendet', sub: 'im Paket enthalten, in diesem Bericht nicht gezeigt' });
  } else {
    glance.push({ label: 'Ort', value: 'nicht erfasst', sub: loc.status === 'permission_denied' ? 'Standortfreigabe verweigert' : loc.status === 'not_requested' || loc.status === 'absent' ? 'im Metadatenprofil nicht angefordert' : 'Standort nicht verfügbar' });
  }
  glance.push(fromCamera
    ? { label: 'Quelle', value: 'Live-Kamera der App', sub: 'nicht aus Galerie oder Download' }
    : { label: 'Quelle', value: capture.source === 'library' ? 'Galerie oder Datei' : 'unbekannt', sub: 'vorhandenes Bild, Herkunft nicht belegt' });
  const deviceParts = [];
  if (device?.platform) deviceParts.push(osText(device));
  deviceParts.push(`DoiProof ${app?.version ?? device?.appVersion ?? '?'}`);
  if (sensors) deviceParts.push(`${overview.recorded.length} Sensor${overview.recorded.length === 1 ? '' : 'en'}`);
  glance.push({ label: 'Gerät', value: deviceParts.join(' · ') });
  const fileParts = [];
  if (photoInfo) fileParts.push(photoInfo.type.label);
  const width = photoInfo?.width ?? num(manifest.photo?.width);
  const height = photoInfo?.height ?? num(manifest.photo?.height);
  if (width && height) fileParts.push(`${width} × ${height} px`);
  if (analysis.photoBytes) fileParts.push(formatBytes(analysis.photoBytes.length));
  glance.push({ label: 'Datei', value: fileParts.join(' · ') || 'nicht lesbar' });

  // ---------- Foto ----------
  /** @type {{ bytes: Uint8Array, kind: 'jpeg'|'png', orientation: number } | null} */
  let photo = null;
  let photoNote = '';
  if (!analysis.photoBytes) photoNote = 'Foto nicht lesbar';
  else if (!includePhoto) photoNote = 'Foto auf Wunsch nicht eingebettet';
  else if (analysis.steps.photo !== 'ok') photoNote = 'Foto stimmt nicht mit dem Hash überein und wird nicht gezeigt';
  else if (!photoInfo?.type.embeddable) photoNote = `Bildformat ${photoInfo?.type.label ?? '?'} kann im PDF nicht dargestellt werden`;
  else if (analysis.photoBytes.length > 40 * 1024 * 1024) photoNote = 'Foto ist für die Einbettung zu groß (über 40 MiB)';
  else photo = { bytes: analysis.photoBytes, kind: /** @type {'jpeg'|'png'} */ (photoInfo.type.embeddable), orientation: photoInfo.exif.orientation ?? 1 };

  // ---------- Zeitstrahl ----------
  const latestState = sealed ? 'verified' : 'open';
  const timeline = {
    title: earliest && sealed ? 'Zeitlich eingeschlossen: ' : 'Zeitliche Einordnung: ',
    accent: earliest && sealed ? formatDuration(sealed.getTime() - earliest.time.getTime()) : sealed ? 'nur spätestens belegt' : 'noch offen',
    zone: `Ortszeit ${zoneLabel(sealed ?? captureTime ?? generatedAt, tz)}`,
    points: [
      earliest
        ? { label: `${formatTime(earliest.time, tz)} · ${chainName(earliest.chain)}-Block ${formatInt(earliest.height)}`, sub: earliest.verified ? 'frühestens: steckt im Beweispaket' : 'frühestens: im Paket, nicht online geprüft', state: earliest.verified ? 'verified' : 'claimed' }
        : { label: 'kein Vorabblock', sub: 'frühestens: nicht belegt', state: 'open' },
      captureTime
        ? { label: `${formatTime(captureTime, tz)} · Aufnahme`, sub: fromCamera ? 'laut Gerät' : 'Auswahl laut Gerät', state: 'claimed' }
        : { label: 'Aufnahme', sub: 'Zeit unbekannt', state: 'open' },
      sealed
        ? { label: `${formatTime(sealed, tz)} · Doichain-Block ${formatInt(anchor?.blockHeight ?? 0)}`, sub: 'spätestens: öffentlich versiegelt', state: latestState }
        : { label: pending ? 'Doichain-Block ausstehend' : 'Doichain-Block', sub: online ? 'spätestens: noch nicht bestätigt' : 'spätestens: nicht abgefragt', state: 'open' },
    ],
  };

  // ---------- Kacheln ----------
  const bound = [];
  if (loc.location) bound.push('Ort');
  if (captureTime) bound.push('Zeit');
  if (device) bound.push('Gerät');
  const sensorCount = overview.recorded.length;
  /** @type {Tile[]} */
  const tiles = [];
  tiles.push(analysis.steps.photo === 'ok'
    ? { kind: 'proof', icon: 'check', title: 'Foto unverändert', text: 'Der digitale Fingerabdruck stimmt Bit für Bit.' }
    : analysis.steps.photo === 'failed'
      ? { kind: 'failed', icon: 'cross', title: 'Foto verändert', text: 'Der Fingerabdruck der Bilddatei stimmt nicht.' }
      : { kind: 'neutral', icon: 'minus', title: 'Foto nicht geprüft', text: 'Die Bilddatei konnte nicht gelesen werden.' });
  const boundItems = [...bound, ...(sensorCount ? [`${sensorCount} Sensor${sensorCount === 1 ? '' : 'en'}`] : [])];
  const boundList = boundItems.length > 1 ? `${boundItems.slice(0, -1).join(', ')} und ${boundItems[boundItems.length - 1]}` : boundItems[0];
  const plural = boundItems.length > 1 || sensorCount > 1;
  const boundText = boundItems.length
    ? `${boundList} ${plural ? 'sind' : 'ist'} ${boundItems.length > 3 ? '' : 'mit dem Foto '}versiegelt.`
    : 'Profil und Bildquelle sind mit dem Foto versiegelt.';
  tiles.push(analysis.steps.manifest === 'ok' && analysis.steps.evidence === 'ok'
    ? { kind: 'proof', icon: 'check', title: 'Aufnahmedaten unverändert', text: boundText }
    : analysis.steps.manifest === 'failed' || analysis.steps.evidence === 'failed'
      ? { kind: 'failed', icon: 'cross', title: 'Aufnahmedaten verändert', text: 'Manifest oder Paket-Hash stimmen nicht.' }
      : { kind: 'neutral', icon: 'minus', title: 'Aufnahmedaten nicht geprüft', text: 'Das Manifest konnte nicht gelesen werden.' });
  if (anchorMatched) tiles.push({ kind: 'proof', icon: 'check', title: 'Öffentlich verankert', text: `Weltweit prüfbar in Block ${formatInt(anchor?.blockHeight ?? 0)} der Doichain.` });
  else if (anchor?.status === 'failed') tiles.push({ kind: 'failed', icon: 'cross', title: 'Verankerung widerspricht', text: 'Die Kettenabfrage passt nicht zum Paket.' });
  else if (pending) tiles.push({ kind: 'neutral', icon: 'clock', title: 'Verankerung ausstehend', text: 'Noch in keinem Doichain-Block bestätigt.' });
  else if (online) tiles.push({ kind: 'neutral', icon: 'clock', title: 'Verankerung offen', text: 'Der Abfragedienst war nicht erreichbar.' });
  else tiles.push({ kind: 'neutral', icon: 'minus', title: 'Verankerung nicht abgefragt', text: 'Für einen Zeitbeleg online prüfen.' });
  if (pre) {
    const btcStatus = preStatus?.bitcoin.status;
    if (btcStatus === 'matched') tiles.push({ kind: 'proof', icon: 'check', title: 'Nicht vorab vorbereitet', text: `Das Paket kann erst nach Bitcoin-Block ${formatInt(pre.bitcoin.height)} entstanden sein.` });
    else if (btcStatus === 'failed') tiles.push({ kind: 'failed', icon: 'cross', title: 'Vorabblock widerspricht', text: 'Der genannte Bitcoin-Block passt nicht zur Kette.' });
    else tiles.push({ kind: 'hint', icon: 'clock', title: 'Vorabblock im Paket', text: `Bitcoin-Block ${formatInt(pre.bitcoin.height)} genannt, online nicht geprüft.` });
  } else tiles.push({ kind: 'neutral', icon: 'minus', title: 'Kein Vorabblock', text: 'Das Paket nennt keinen Block vor der Aufnahme.' });
  tiles.push(fromCamera
    ? { kind: 'hint', icon: 'camera', title: 'Live mit der Kamera aufgenommen', text: 'Laut App kein gespeichertes Bild verwendet.' }
    : { kind: 'neutral', icon: 'camera', title: 'Aus der Galerie gewählt', text: 'Herkunft und Aufnahmezeit sind nicht belegt.' });
  if (loc.location && loc.location.mocked === true) tiles.push({ kind: 'warning', icon: 'pin', title: 'Simulierter Standort', text: 'Das Gerät meldet einen simulierten Standort.' });
  else if (loc.location && !includeLocation) tiles.push({ kind: 'neutral', icon: 'pin', title: 'Standort ausgeblendet', text: 'Im Paket enthalten, hier nicht gezeigt.' });
  else if (loc.location) tiles.push({ kind: 'hint', icon: 'pin', title: 'Echter GPS-Standort', text: loc.location.mocked === false ? 'Das Gerät meldet keinen simulierten Standort.' : 'Ob simuliert, meldet das Gerät nicht.' });
  else tiles.push({ kind: 'neutral', icon: 'pin', title: 'Kein Standort', text: loc.status === 'permission_denied' ? 'Die Standortfreigabe wurde verweigert.' : 'Im Manifest ist kein Standort erfasst.' });

  // ---------- Beweiskette ----------
  /** @param {'ok'|'failed'|'skipped'} status */
  const stepStatus = status => ({ text: STEP_TEXT[status], kind: status === 'ok' ? 'ok' : status === 'failed' ? 'failed' : 'open' });
  const chain = [
    { title: 'Fingerabdruck des Fotos', value: analysis.hashes.photoSha256 ?? '–', ...stepStatus(analysis.steps.photo), style: 'plain' },
    { title: 'Fingerabdruck der Aufnahmedaten (Manifest)', value: analysis.hashes.manifestSha256 ?? '–', ...stepStatus(analysis.steps.manifest), style: 'plain' },
    { title: 'Beweispaket: beide Fingerabdrücke untrennbar verbunden', value: evidenceHash ?? '–', ...stepStatus(analysis.steps.evidence), style: 'accent' },
    {
      title: 'Doichain-Transaktion',
      value: anchor?.txid ?? (typeof verification.txid === 'string' ? `${verification.txid} (laut Export)` : '–'),
      text: anchorMatched ? 'gefunden' : anchor?.status === 'failed' ? 'Widerspruch' : pending ? 'ausstehend' : online ? 'nicht erreichbar' : 'nicht abgefragt',
      kind: anchorMatched ? 'ok' : anchor?.status === 'failed' ? 'failed' : 'open',
      style: 'plain',
    },
    {
      title: sealed ? `Block ${formatInt(anchor?.blockHeight ?? 0)} · ${formatUtc(sealed)}` : 'Bestätigungsblock',
      value: anchor?.blockHash ?? '–',
      text: anchorMatched ? `${formatInt(anchor?.confirmations ?? 0)} Bestätigung${anchor?.confirmations === 1 ? '' : 'en'}` : 'offen',
      kind: anchorMatched ? 'ok' : 'open',
      style: 'dark',
    },
  ];

  // ---------- Zeitanker-Tabelle ----------
  /** @type {{ anchor: string, time: string, hash?: string, note?: string, status: string, kind: 'ok'|'claimed'|'failed'|'open' }[]} */
  const anchors = [];
  if (pre) {
    for (const key of /** @type {const} */ (['bitcoin', 'doichain'])) {
      const block = pre[key];
      const status = preStatus?.[key]?.status;
      anchors.push({
        anchor: `${key === 'bitcoin' ? 'BTC' : 'DOI'}-Vorabblock ${formatInt(block.height)}`,
        time: iso(block.headerTimeUtc) ? formatTime(/** @type {Date} */ (iso(block.headerTimeUtc)), UTC) : '–',
        hash: block.hash,
        status: status === 'matched' ? `auf ${chainName(key)} bestätigt` : status === 'failed' ? 'widerspricht der Kette' : status === 'unavailable' ? 'nicht erreichbar' : 'im Paket enthalten',
        kind: status === 'matched' ? 'ok' : status === 'failed' ? 'failed' : 'open',
      });
    }
  } else {
    anchors.push({ anchor: 'Vorabblöcke', time: '–', note: 'für dieses Paket nicht erfasst', status: 'fehlen', kind: 'open' });
  }
  anchors.push({
    anchor: fromCamera ? 'Aufnahme laut Gerät' : 'Auswahl laut Gerät',
    time: captureTime ? formatTime(captureTime, UTC) : '–',
    note: 'Geräteuhr, nicht unabhängig belegt', status: 'Selbstauskunft', kind: 'claimed',
  });
  anchors.push(sealed
    ? { anchor: `Doichain-Block ${formatInt(anchor?.blockHeight ?? 0)}`, time: formatTime(sealed, UTC), hash: anchor?.blockHash, status: 'auf Doichain bestätigt', kind: 'ok' }
    : { anchor: 'Doichain-Block', time: '–', note: online ? 'noch nicht bestätigt' : 'nicht online abgefragt', status: pending ? 'ausstehend' : 'offen', kind: 'open' });

  // ---------- Belegt / belegt nicht ----------
  let proves;
  if (outcome === 'passed' && sealed) {
    proves = `Genau dieses Foto und genau diese Aufnahmedaten existierten spätestens am ${formatDate(sealed, UTC)} um ${formatTime(sealed, UTC)} UTC und wurden seither nicht verändert.`;
    if (earliest?.verified) proves += ` Das Beweispaket wurde nicht vor ${formatTime(earliest.time, UTC)} UTC erstellt.`;
  } else if (outcome === 'incomplete') {
    proves = 'Genau dieses Foto und genau diese Aufnahmedaten gehören bitgenau zu diesem Beweispaket. Einen Zeitpunkt der Versiegelung belegt diese Prüfung noch nicht.';
  } else {
    proves = `Nicht die Unversehrtheit des Pakets: ${analysis.ok ? 'Die Kettenabfrage widerspricht dem Paket.' : analysis.error ?? 'Prüfung fehlgeschlagen.'} Bestandene Prüfschritte sind in der Beweiskette markiert.`;
  }
  const provesNot = `Wer fotografiert hat, ob das Motiv echt ist, und ob Gerät und App unverfälscht arbeiteten. Gerätezeit, Ort${sensors ? ', Sensorwerte' : ''} und Kamera-Herkunft sind Angaben des Geräts. Kein qualifizierter Zeitstempel nach eIDAS.`;

  const footer = [
    `Geprüft nach DoiProof-Verfahren · Manifest ${version} · ${online ? `Kettenstatus online abgefragt am ${formatDateTimeMinutes(new Date(online.checkedAtUtc), tz)}` : 'Kettenstatus nicht online abgefragt'}`,
    `Paket: ${input.fileName}`,
  ];

  return {
    number,
    title: `DoiProof Prüfbericht ${number}`,
    createdText: `erstellt am ${formatDateTimeMinutes(generatedAt, tz)}`,
    producer: input.producer ?? 'DoiProof-Prüfer',
    outcome,
    banner,
    glance,
    photo,
    photoNote,
    timeline,
    tiles,
    chain,
    anchors,
    qr: evidenceHash ? { url: `${VERIFILE_URL}${evidenceHash}` } : null,
    proves,
    provesNot,
    footer,
    appendix: buildAppendix({ analysis, manifest, verification, includeLocation, version }),
    meta: { evidenceSha256: evidenceHash, zipSha256: analysis.zip.sha256, version, generatedAtUtc: generatedAt.toISOString(), online: !!online },
  };
}

/**
 * Anhang „Alle erhobenen Messwerte“: jede im Manifest gebundene Angabe, gruppiert nach Quelle.
 * @param {{ analysis: import('./verify.mjs').BundleAnalysis, manifest: Record<string, any>, verification: Record<string, any>, includeLocation: boolean, version: string }} input
 */
export function buildAppendix({ analysis, manifest, verification, includeLocation, version }) {
  const all = leaves(manifest, '', new Map());
  const used = new Set();
  /** @param {string} prefix */
  const use = prefix => { for (const path of all.keys()) if (path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`)) used.add(path); };
  /** @type {{ title: string, rows: AppendixRow[] }[]} */
  const groups = [];
  /** @param {string} title @returns {AppendixRow[]} */
  const group = title => { const rows = /** @type {AppendixRow[]} */ ([]); groups.push({ title, rows }); return rows; };
  /** @param {string} path */
  const get = path => all.get(path);

  // Standort / GNSS
  {
    const rows = group('Standort / GNSS');
    const { status, location, reason } = locationState(manifest);
    use('location');
    if (location) {
      const time = utcStamp(iso(location.measuredAt));
      const source = 'GNSS (expo-location)';
      /** @type {[string, string, (v: number) => string][]} */
      const fields = [
        ['latitude', 'Breitengrad', v => formatCoordinate(v, 'lat')],
        ['longitude', 'Längengrad', v => formatCoordinate(v, 'lon')],
        ['altitude', 'Höhe über Ellipsoid', v => `${formatMeasure(v, 1)} m`],
        ['accuracy', 'Horizontale Genauigkeit', v => `± ${formatMeasure(v, 1)} m`],
        ['altitudeAccuracy', 'Vertikale Genauigkeit', v => `± ${formatMeasure(v, 1)} m`],
        ['heading', 'Bewegungsrichtung', v => `${formatMeasure(v, 1)}°`],
        ['speed', 'Geschwindigkeit', v => `${formatMeasure(v, 2)} m/s`],
      ];
      for (const [field, label, format] of fields) {
        const value = location[field];
        if (value === undefined) continue;
        rows.push({
          quantity: label,
          value: !includeLocation ? 'ausgeblendet' : value === null ? 'nicht gemeldet' : format(value),
          time, source, note: value === null ? 'vom Gerät nicht geliefert' : DEVICE_NOTE,
        });
      }
      rows.push({ quantity: 'Messzeit des Standorts', value: utcStamp(iso(location.measuredAt)), time, source, note: 'Zeitstempel des Standortdienstes' });
      if (location.mocked !== undefined) rows.push({ quantity: 'Simulierter Standort', value: location.mocked ? 'ja – vom Gerät als simuliert gemeldet' : 'nein', time, source, note: 'Selbstauskunft des Betriebssystems' });
    } else {
      rows.push({
        quantity: 'Standort', value: 'nicht erfasst', time: '–', source: 'GNSS / Standortdienst',
        note: status === 'permission_denied' ? 'Berechtigung verweigert' : status === 'absent' || status === 'not_requested' ? 'im Metadatenprofil nicht angefordert' : `${status}${reason ? `: ${reason}` : ''}`,
      });
    }
  }

  // Sensorgruppen
  const sensors = isPlainObject(manifest.sensors) ? manifest.sensors : null;
  if (sensors) use('sensors');
  /** @type {{ key: string, title: string, fields: string[], units: Record<string, string>, samples: Record<string, any>[], reading: Record<string, any>, window: Record<string, any> | null }[]} */
  const series = [];
  /** @param {string} key @param {AppendixRow[]} rows */
  const sensorRows = (key, rows) => {
    const definition = SENSORS[key];
    const record = sensors?.[key];
    const source = definition.source;
    if (!sensors) {
      rows.push({ quantity: definition.label, value: 'nicht erfasst', time: '–', source, note: `Manifest ${version} enthält keine Sensordaten` });
      return;
    }
    if (!isPlainObject(record) || record.status !== 'recorded') {
      const status = isPlainObject(record) ? record.status : 'error';
      const text = /** @type {Record<string, string>} */ (STATUS_TEXT)[status] ?? String(status);
      rows.push({ quantity: definition.label, value: 'nicht erfasst', time: '–', source, note: `${text}${record?.reason && status !== 'not_requested' ? ` – ${record.reason}` : ''}` });
      return;
    }
    const reading = record.reading;
    const time = utcStamp(iso(reading.at));
    for (const field of definition.fields) {
      if (reading[field] === undefined) continue;
      const unit = record.units?.[field] ?? definition.units[field];
      rows.push({
        quantity: definition.names[field],
        value: reading[field] === null ? 'nicht gemeldet' : key === 'compass' && field === 'accuracy' ? `Stufe ${formatMeasure(reading[field])}` : `${formatMeasure(reading[field])} ${unit}`,
        time, source, note: 'Einzelwert zur Aufnahme; Geräteangabe',
      });
    }
    if (definition.fields.join() === 'x,y,z' && [reading.x, reading.y, reading.z].every(v => typeof v === 'number')) {
      const magnitude = Math.hypot(reading.x, reading.y, reading.z);
      rows.push({ quantity: `Betrag |${key === 'magnetometer' ? 'B' : key === 'gyroscope' ? 'ω' : 'a'}|`, value: `${formatMeasure(magnitude, 4)} ${definition.units.x}`, time, source, note: 'berechnet aus dem Einzelwert' });
    }
    if (key === 'barometer' && typeof reading.pressure === 'number') {
      rows.push({ quantity: 'Barometrische Höhe', value: `${formatMeasure(barometricAltitude(reading.pressure), 1)} m`, time, source, note: 'berechnet, Normatmosphäre 1013,25 hPa, nicht kalibriert' });
    }
    const samples = Array.isArray(record.series) ? record.series : [];
    const first = iso(samples[0]?.at); const last = iso(samples[samples.length - 1]?.at);
    const span = first && last ? `${formatTime(first, UTC)}–${formatTime(last, UTC)} UTC` : '–';
    for (const field of definition.fields) {
      const stats = seriesStats(samples, field);
      if (!stats) continue;
      const unit = record.units?.[field] ?? definition.units[field];
      rows.push({
        quantity: `Messreihe: ${definition.names[field]}`,
        value: `min ${formatMeasure(stats.min)} / max ${formatMeasure(stats.max)} / Ø ${formatMeasure(stats.mean)}${key === 'compass' && field === 'accuracy' ? '' : ` ${unit}`} (n = ${stats.count})`,
        time: span, source, note: 'vollständige Reihe in Anhang B',
      });
    }
    if (typeof record.received === 'number') rows.push({ quantity: `Empfangene Messungen (${definition.label})`, value: formatInt(record.received), time: span, source, note: 'davon höchstens 30 im Manifest' });
    if (key === 'barometer') {
      const p = seriesStats(samples, 'pressure');
      if (p && samples.length > 1) {
        const firstP = samples.find(s => typeof s.pressure === 'number')?.pressure;
        const lastP = [...samples].reverse().find(s => typeof s.pressure === 'number')?.pressure;
        if (typeof firstP === 'number' && typeof lastP === 'number') {
          rows.push({ quantity: 'Höhenänderung in der Messreihe', value: `${formatMeasure(barometricAltitude(lastP) - barometricAltitude(firstP), 2)} m`, time: span, source, note: 'berechnet aus Druckänderung' });
        }
      }
    }
    series.push({ key, title: definition.label, fields: definition.fields, units: { ...definition.units, ...(record.units ?? {}) }, samples, reading, window: isPlainObject(sensors.window) ? sensors.window : null });
  };
  const motion = group('Bewegungssensoren');
  sensorRows('accelerometer', motion);
  sensorRows('gyroscope', motion);
  const magnetic = group('Magnetfeld / Kompass');
  sensorRows('magnetometer', magnetic);
  sensorRows('compass', magnetic);
  sensorRows('barometer', group('Luftdruck'));
  sensorRows('light', group('Licht'));

  // Kamera / EXIF
  {
    const rows = group('Kamera / EXIF');
    use('photo');
    const photo = isPlainObject(manifest.photo) ? manifest.photo : {};
    const info = analysis.photoInfo;
    const appSource = 'App (Bildauswahl)';
    rows.push({ quantity: 'SHA-256 des Originalfotos', value: String(photo.sha256 ?? '–'), time: '–', source: 'Manifest', note: 'mathematisch geprüft (Beweiskette Glied 1)' });
    /** @type {[string, string, (v: any) => string][]} */
    const photoFields = [
      ['width', 'Bildbreite laut App', v => `${formatInt(v)} px`],
      ['height', 'Bildhöhe laut App', v => `${formatInt(v)} px`],
      ['fileSize', 'Dateigröße laut App', v => `${formatInt(v)} Byte`],
      ['mimeType', 'Dateityp laut App', v => String(v)],
      ['fileName', 'Dateiname laut App', v => String(v)],
    ];
    for (const [field, label, format] of photoFields) {
      if (photo[field] !== undefined) rows.push({ quantity: label, value: photo[field] === null ? 'nicht gemeldet' : format(photo[field]), time: '–', source: appSource, note: DEVICE_NOTE });
    }
    if (info && analysis.photoBytes) {
      const fileSource = 'Bilddatei im Paket';
      rows.push({ quantity: 'Dateiformat (aus Bilddaten)', value: info.type.label, time: '–', source: fileSource, note: 'aus den Dateibytes bestimmt' });
      if (info.width && info.height) rows.push({ quantity: 'Abmessungen (aus Bilddaten)', value: `${formatInt(info.width)} × ${formatInt(info.height)} px`, time: '–', source: fileSource, note: 'aus den Dateibytes bestimmt' });
      rows.push({ quantity: 'Dateigröße im Paket', value: `${formatInt(analysis.photoBytes.length)} Byte`, time: '–', source: fileSource, note: 'gezählt' });
      const exif = info.exif;
      const exifSource = 'EXIF der Bilddatei';
      const exifNote = 'Kameraangabe; durch Foto-Hash gebunden';
      if (exif.make) rows.push({ quantity: 'Kamerahersteller', value: exif.make, time: '–', source: exifSource, note: exifNote });
      if (exif.model) rows.push({ quantity: 'Kameramodell', value: exif.model, time: '–', source: exifSource, note: exifNote });
      if (exif.lensModel) rows.push({ quantity: 'Objektiv', value: exif.lensModel, time: '–', source: exifSource, note: exifNote });
      if (exif.dateTimeOriginal) rows.push({ quantity: 'Aufnahmezeit laut EXIF', value: `${exif.dateTimeOriginal}${exif.offsetTimeOriginal ? ` (${exif.offsetTimeOriginal})` : ' (ohne Zeitzone)'}`, time: '–', source: exifSource, note: 'Kamerauhr, nicht unabhängig belegt' });
      if (exif.orientation) rows.push({ quantity: 'Ausrichtung', value: `${exif.orientation} – ${/** @type {Record<number, string>} */ (ORIENTATION_TEXT)[exif.orientation]}`, time: '–', source: exifSource, note: 'für die Darstellung angewandt' });
      if (exif.exposureTime) rows.push({ quantity: 'Belichtungszeit', value: exif.exposureTime >= 1 ? `${formatMeasure(exif.exposureTime, 2)} s` : `1/${Math.round(1 / exif.exposureTime)} s`, time: '–', source: exifSource, note: exifNote });
      if (exif.fNumber) rows.push({ quantity: 'Blende', value: `f/${formatMeasure(exif.fNumber, 1)}`, time: '–', source: exifSource, note: exifNote });
      if (exif.iso) rows.push({ quantity: 'ISO', value: formatInt(exif.iso), time: '–', source: exifSource, note: exifNote });
      if (exif.focalLength) rows.push({ quantity: 'Brennweite', value: `${formatMeasure(exif.focalLength, 2)} mm${exif.focalLength35mm ? ` (KB ${exif.focalLength35mm} mm)` : ''}`, time: '–', source: exifSource, note: exifNote });
      if (exif.software) rows.push({ quantity: 'Software', value: exif.software, time: '–', source: exifSource, note: exifNote });
      rows.push({ quantity: 'GPS-Angaben im EXIF', value: exif.hasGps ? 'vorhanden (nicht ausgewertet)' : 'keine', time: '–', source: exifSource, note: exif.hasGps ? 'Bilddatei enthält eigene Ortsangaben der Kamera' : 'keine eingebetteten Ortsdaten gefunden' });
    }
  }

  // Gerät / App
  {
    const rows = group('Gerät / App');
    use('device'); use('app'); use('profile'); use('schema'); use('createdAt');
    const device = isPlainObject(manifest.device) ? manifest.device : null;
    const app = isPlainObject(manifest.app) ? manifest.app : null;
    rows.push({ quantity: 'Manifestformat', value: String(manifest.schema), time: '–', source: 'Manifest', note: 'bestimmt das Prüfverfahren' });
    rows.push({ quantity: 'Manifest erstellt', value: utcStamp(iso(manifest.createdAt)), time: utcStamp(iso(manifest.createdAt)), source: 'Geräteuhr', note: DEVICE_NOTE });
    rows.push({ quantity: 'Metadatenprofil', value: { private: 'Privat', location: 'Standort und Sensoren', custom: 'Individuell' }[/** @type {'private'} */ (manifest.profile)] ?? String(manifest.profile ?? '–'), time: '–', source: 'App-Einstellung', note: 'vom Nutzer gewählt' });
    if (device) {
      rows.push({ quantity: 'Betriebssystem', value: osText(device), time: '–', source: 'Gerät', note: DEVICE_NOTE });
      if (device.platform === 'android' && device.osVersion !== undefined) rows.push({ quantity: 'Android-API-Level', value: String(device.osVersion), time: '–', source: 'Gerät', note: DEVICE_NOTE });
      if (device.model) rows.push({ quantity: 'Gerätemodell', value: String(device.model), time: '–', source: 'Gerät', note: DEVICE_NOTE });
      if (device.appVersion) rows.push({ quantity: 'App-Version (Gerätedaten)', value: String(device.appVersion), time: '–', source: 'App', note: 'Selbstauskunft, nicht attestiert' });
    } else rows.push({ quantity: 'Gerätedaten', value: 'nicht erfasst', time: '–', source: 'Gerät', note: 'im Metadatenprofil nicht angefordert' });
    if (app) {
      if (app.version) rows.push({ quantity: 'DoiProof-Version', value: String(app.version), time: '–', source: 'App', note: 'Selbstauskunft, nicht attestiert' });
      if (app.sourceCommit) rows.push({ quantity: 'Quellcode-Commit', value: String(app.sourceCommit), time: '–', source: 'App-Build', note: 'Selbstauskunft, nicht attestiert' });
      if (app.identification) rows.push({ quantity: 'Identifikation', value: app.identification === 'self-reported-unattested' ? 'selbst gemeldet, nicht attestiert' : String(app.identification), time: '–', source: 'App', note: 'keine Geräte-/App-Attestierung' });
      if (isPlainObject(app.update)) {
        const u = app.update;
        if (u.channel !== undefined) rows.push({ quantity: 'Update-Kanal', value: String(u.channel ?? 'keiner'), time: '–', source: 'expo-updates', note: 'Selbstauskunft' });
        if (u.runtimeVersion !== undefined) rows.push({ quantity: 'Laufzeitversion (Fingerprint)', value: String(u.runtimeVersion ?? '–'), time: '–', source: 'expo-updates', note: 'Selbstauskunft' });
        if (u.updateId !== undefined) rows.push({ quantity: 'Update-ID', value: String(u.updateId ?? 'eingebettetes Bundle'), time: '–', source: 'expo-updates', note: 'Selbstauskunft' });
        if (u.embedded !== undefined) rows.push({ quantity: 'Eingebettetes JS-Bundle', value: u.embedded ? 'ja' : 'nein (Over-the-Air-Update)', time: '–', source: 'expo-updates', note: 'Selbstauskunft' });
      }
    }
  }

  // Netz / Zeitanker
  {
    const rows = group('Netz / Zeitanker');
    use('preCapture'); use('capture');
    const pre = isPlainObject(manifest.preCapture) ? manifest.preCapture : null;
    if (pre) {
      for (const key of ['bitcoin', 'doichain']) {
        const block = pre[key];
        const name = key === 'bitcoin' ? 'BTC-Vorabblock' : 'DOI-Vorabblock';
        const observed = utcStamp(iso(block.observedAtDeviceUtc));
        rows.push({ quantity: `${name}: Höhe`, value: formatInt(block.height), time: observed, source: String(block.source ?? '–'), note: 'öffentlich nachprüfbar' });
        rows.push({ quantity: `${name}: Hash`, value: String(block.hash), time: observed, source: String(block.source ?? '–'), note: 'öffentlich nachprüfbar' });
        rows.push({ quantity: `${name}: Blockzeit (Header)`, value: utcStamp(iso(block.headerTimeUtc)), time: observed, source: String(block.source ?? '–'), note: 'Blockzeit, keine präzise Uhr' });
        rows.push({ quantity: `${name}: Abfrage laut Gerät`, value: observed, time: observed, source: 'Geräteuhr', note: DEVICE_NOTE });
      }
    } else rows.push({ quantity: 'Vorabblöcke', value: 'nicht erfasst', time: '–', source: 'BTC/DOI-Blockdienste', note: 'keine Kameraaufnahme mit Vorabmodus' });
    const capture = isPlainObject(manifest.capture) ? manifest.capture : {};
    if (capture.source) rows.push({ quantity: 'Bildquelle', value: capture.source === 'camera' ? 'Kamera der App' : 'Galerie / Datei', time: '–', source: 'App', note: DEVICE_NOTE });
    if (capture.cameraOpenedAt) rows.push({ quantity: 'Kamera geöffnet', value: utcStamp(iso(capture.cameraOpenedAt)), time: utcStamp(iso(capture.cameraOpenedAt)), source: 'Geräteuhr', note: DEVICE_NOTE });
    if (capture.deviceTime) rows.push({ quantity: capture.source === 'camera' ? 'Aufnahme (Rückkehr aus der Kamera)' : 'Auswahlzeit', value: utcStamp(iso(capture.deviceTime)), time: utcStamp(iso(capture.deviceTime)), source: 'Geräteuhr', note: DEVICE_NOTE });
    const window = sensors && isPlainObject(sensors.window) ? sensors.window : null;
    if (window) {
      if (window.startedAt) rows.push({ quantity: 'Sensor-Messfenster: Beginn', value: utcStamp(iso(window.startedAt)), time: utcStamp(iso(window.startedAt)), source: 'Geräteuhr', note: DEVICE_NOTE });
      if (window.endedAt) rows.push({ quantity: 'Sensor-Messfenster: Ende', value: utcStamp(iso(window.endedAt)), time: utcStamp(iso(window.endedAt)), source: 'Geräteuhr', note: DEVICE_NOTE });
      if (window.intervalMs) rows.push({ quantity: 'Sensor-Abtastintervall', value: `${formatInt(window.intervalMs)} ms`, time: '–', source: 'App', note: 'angefordert; Gerät kann abweichen' });
      if (window.platform) rows.push({ quantity: 'Sensor-Plattform', value: String(/** @type {Record<string, string>} */ (PLATFORM)[window.platform] ?? window.platform), time: '–', source: 'App', note: window.platform === 'android' ? 'Android pausiert Sensoren, solange die System-Kamera offen ist' : DEVICE_NOTE });
    }
  }

  // Alles Übrige, damit keine gebundene Angabe fehlt.
  const rest = [...all.keys()].filter(path => !used.has(path));
  if (rest.length) {
    const rows = group('Weitere Angaben im Manifest');
    for (const path of rest) rows.push({ quantity: path, value: plain(get(path)), time: '–', source: 'Manifest', note: 'ohne eigene Zuordnung, ungeprüft' });
  }

  // Exportstatus (nicht Teil des Hashs)
  {
    const rows = group('Exportstatus (verification.json, nicht im Hash gebunden)');
    for (const [path, value] of leaves(verification, '', new Map())) {
      rows.push({ quantity: path, value: plain(value), time: '–', source: 'verification.json', note: 'Schnappschuss beim Export, Selbstauskunft' });
    }
  }

  return { groups, series, version };
}

/** Phase einer Einzelmessung relativ zur Kamera. @param {string} at @param {Record<string, any> | null} window */
export function samplePhase(at, window) {
  const t = Date.parse(at);
  const opened = window?.cameraOpenedAt ? Date.parse(window.cameraOpenedAt) : NaN;
  const returned = window?.cameraReturnedAt ? Date.parse(window.cameraReturnedAt) : NaN;
  if (Number.isFinite(opened) && t < opened) return 'vor Kamera';
  if (Number.isFinite(returned) && t < returned) return 'Kamera offen';
  if (Number.isFinite(returned)) return 'nach Rückkehr';
  return '–';
}

