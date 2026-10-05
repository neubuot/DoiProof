/**
 * Kanonisches JSON für den Manifest-Hash.
 *
 * v1/v2 (historisch): Objektschlüssel mit `localeCompare` sortiert, `undefined` ausgelassen.
 * Diese Reihenfolge hängt theoretisch von ICU/Locale der JavaScript-Engine ab. Für alle in v1/v2
 * verwendeten Schlüssel stimmt sie mit der Code-Unit-Reihenfolge überein; sie bleibt zur
 * Prüfung alter Pakete unverändert.
 *
 * v3: Sortierung nach UTF-16-Code-Units wie RFC 8785 (JSON Canonicalization Scheme).
 * Zahlen und Zeichenketten folgen der ECMAScript-Serialisierung (identisch mit JCS).
 * Nicht endliche Zahlen und `undefined` in Arrays sind unzulässig.
 */

/** @param {string} a @param {string} b */
function codeUnitCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** @param {unknown} value @returns {string} */
function legacy(value) {
  if (Array.isArray(value)) return `[${value.map(legacy).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(/** @type {Record<string, unknown>} */ (value))
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${legacy(item)}`).join(',')}}`;
  }
  return /** @type {string} */ (JSON.stringify(value));
}

/** @param {unknown} value @param {string} path @returns {string} */
function jcs(value, path) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Nicht endliche Zahl im Manifest: ${path}`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item, index) => {
      if (item === undefined) throw new Error(`Undefinierter Arraywert im Manifest: ${path}[${index}]`);
      return jcs(item, `${path}[${index}]`);
    }).join(',')}]`;
  }
  if (typeof value === 'object') {
    return `{${Object.entries(/** @type {Record<string, unknown>} */ (value))
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => codeUnitCompare(a, b))
      .map(([key, item]) => `${JSON.stringify(key)}:${jcs(item, `${path}.${key}`)}`).join(',')}}`;
  }
  throw new Error(`Nicht serialisierbarer Wert im Manifest: ${path}`);
}

/**
 * @param {unknown} value
 * @param {'v1'|'v2'|'v3'} version
 */
export function canonicalJson(value, version) {
  return version === 'v3' ? jcs(value, 'manifest') : legacy(value);
}
