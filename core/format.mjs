/**
 * Deutsche Zahlen-, Datums- und Zeitformate ohne Intl-Abhängigkeit, damit CLI, Windows-Prüfer
 * und App (Hermes) zeichengleich formatieren.
 */

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August',
  'September', 'Oktober', 'November', 'Dezember'];
const CET_ZONES = new Set(['Europe/Berlin', 'Europe/Vienna', 'Europe/Zurich', 'Europe/Amsterdam',
  'Europe/Brussels', 'Europe/Luxembourg', 'Europe/Paris', 'Europe/Rome', 'Europe/Madrid',
  'Europe/Copenhagen', 'Europe/Oslo', 'Europe/Stockholm', 'Europe/Prague', 'Europe/Warsaw',
  'Europe/Budapest', 'Europe/Vaduz', 'Europe/Busingen', 'Europe/Ljubljana', 'Europe/Zagreb',
  'Europe/Bratislava', 'Europe/Monaco', 'Europe/San_Marino', 'Europe/Vatican', 'Europe/Andorra',
  'Europe/Malta', 'Europe/Belgrade', 'Europe/Sarajevo', 'Europe/Skopje', 'Europe/Tirane',
  'Europe/Podgorica', 'Europe/Gibraltar', 'CET']);

/**
 * @typedef {{ name: string | null, offsetMinutes: (date: Date) => number }} TimeZone
 */

/** Zeitzone des ausführenden Systems (Rechner oder Handy). @returns {TimeZone} */
export function systemTimeZone() {
  let name = null;
  try { name = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { /* Intl fehlt. */ }
  return { name, offsetMinutes: date => -date.getTimezoneOffset() };
}

/** @param {number} minutes @param {string | null} [name] @returns {TimeZone} */
export function fixedTimeZone(minutes, name = null) {
  return { name, offsetMinutes: () => minutes };
}

/** @param {number} n @param {number} [width] */
const pad = (n, width = 2) => String(n).padStart(width, '0');

/** @param {Date} date @param {TimeZone} tz */
function shifted(date, tz) {
  return new Date(date.getTime() + tz.offsetMinutes(date) * 60000);
}

/** @param {Date} date @param {TimeZone} tz */
export function zoneLabel(date, tz) {
  const offset = tz.offsetMinutes(date);
  if (tz.name && CET_ZONES.has(tz.name) && (offset === 60 || offset === 120)) return offset === 60 ? 'MEZ' : 'MESZ';
  if (offset === 0 && (tz.name === 'UTC' || tz.name === 'Etc/UTC' || tz.name === null)) return 'UTC';
  const sign = offset < 0 ? '−' : '+';
  const abs = Math.abs(offset);
  return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${pad(abs % 60)}` : ''}`;
}

/** @param {Date} date @param {TimeZone} tz */
export function formatTime(date, tz) {
  const d = shifted(date, tz);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** @param {Date} date @param {TimeZone} tz */
export function formatDate(date, tz) {
  const d = shifted(date, tz);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/** „01.10.2026, 09:31:35 Uhr“ @param {Date} date @param {TimeZone} tz */
export function formatDateTime(date, tz) {
  return `${formatDate(date, tz)}, ${formatTime(date, tz)} Uhr`;
}

/** „01.10.2026, 10:34 Uhr“ @param {Date} date @param {TimeZone} tz */
export function formatDateTimeMinutes(date, tz) {
  return `${formatDate(date, tz)}, ${formatTime(date, tz).slice(0, 5)} Uhr`;
}

/** „1. Oktober 2026, 10:03 Uhr“ @param {Date} date @param {TimeZone} tz */
export function formatLongDate(date, tz) {
  const d = shifted(date, tz);
  return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} Uhr`;
}

export const UTC = fixedTimeZone(0, 'UTC');

/** „01.10.2026, 08:03:06 UTC“ @param {Date} date */
export function formatUtc(date) {
  return `${formatDate(date, UTC)}, ${formatTime(date, UTC)} UTC`;
}

/** ISO-Zeit mit Millisekunden, wie sie im Manifest steht @param {Date} date */
export function formatUtcMs(date) {
  return `${formatDate(date, UTC)}, ${formatTime(date, UTC)}.${pad(date.getUTCMilliseconds(), 3)} UTC`;
}

/** Ganzzahl mit Tausenderpunkt: 434177 → „434.177“ @param {number} value */
export function formatInt(value) {
  const sign = value < 0 ? '−' : '';
  const digits = String(Math.abs(Math.trunc(value)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Dezimalzahl mit Komma: (48.1, 5) → „48,10000“.
 * @param {number} value
 * @param {number} decimals
 */
export function formatDecimal(value, decimals) {
  if (!Number.isFinite(value)) return '–';
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const negative = value < 0 && Number(fixed) !== 0;
  return `${negative ? '−' : ''}${formatInt(Number(int))}${frac ? `,${frac}` : ''}`;
}

/**
 * Messwert mit sinnvoller Stellenzahl (bis zu 6 Nachkommastellen, ohne überflüssige Nullen).
 * @param {number} value
 * @param {number} [maxDecimals]
 */
export function formatMeasure(value, maxDecimals = 6) {
  if (!Number.isFinite(value)) return '–';
  let text = formatDecimal(value, maxDecimals);
  if (text.includes(',')) text = text.replace(/0+$/, '').replace(/,$/, '');
  return text;
}

/** @param {number} bytes */
export function formatBytes(bytes) {
  if (bytes >= 1e6) return `${formatDecimal(bytes / 1e6, 2)} MB`;
  if (bytes >= 1e3) return `${formatDecimal(bytes / 1e3, 1)} kB`;
  return `${formatInt(bytes)} Byte`;
}

/** Zeitspanne in Worten: „40 Minuten“, „2 Std. 5 Min.“ @param {number} ms */
export function formatDuration(ms) {
  if (Math.abs(ms) < 60000) return 'unter 1 Minute';
  const minutes = Math.round(Math.abs(ms) / 60000);
  if (minutes === 1) return '1 Minute';
  if (minutes < 120) return `${minutes} Minuten`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} Std. ${minutes % 60} Min.`;
  const days = Math.floor(hours / 24);
  return `${days} Tage ${hours % 24} Std.`;
}

/** Koordinate: (48.1, 'lat') → „48,10000° N“ @param {number} value @param {'lat'|'lon'} axis */
export function formatCoordinate(value, axis) {
  const dir = axis === 'lat' ? (value < 0 ? 'S' : 'N') : (value < 0 ? 'W' : 'O');
  return `${formatDecimal(Math.abs(value), 5)}° ${dir}`;
}

/** Berichtsnummer: erste 12 Hex-Zeichen in Vierergruppen, groß. @param {string} hash */
export function reportNumber(hash) {
  return (hash.slice(0, 12).toUpperCase().match(/.{1,4}/g) ?? []).join(' ');
}
