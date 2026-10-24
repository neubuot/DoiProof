/**
 * Erdmagnetfeld nach dem World Magnetic Model 2025 (WMM2025, NOAA NCEI und BGS, veröffentlicht
 * 17.12.2024, gültig 2025.0 bis 2030.0). Die Rechnung läuft vollständig offline mit den
 * eingebetteten Gauß-Koeffizienten (Grad und Ordnung 12, Hauptfeld in nT und Säkularvariation in
 * nT je Jahr). Ergebnis sind Modellwerte: Das WMM beschreibt das Hauptfeld aus dem Erdkern,
 * nicht lokale Anomalien durch Gestein, Gebäude oder Geräte.
 * Plattformneutral (Node und Hermes): nur Math.
 */

/** Referenzradius des Erdmagnetfeldmodells in km. */
const GEOMAGNETIC_RADIUS_KM = 6371.2;
/** WGS84: große Halbachse in km und Abplattung. */
const WGS84_A_KM = 6378.137;
const WGS84_F = 1 / 298.257223563;
const DEG = Math.PI / 180;

/**
 * Gauß-Koeffizienten des WMM2025 je Zeile: [n, m, g (nT), h (nT), ġ (nT/Jahr), ḣ (nT/Jahr)].
 * Quelle: WMM2025.COF (Epoche 2025.0, Stand 13.11.2024), gemeinfrei (US-Regierung).
 * @type {ReadonlyArray<readonly [number, number, number, number, number, number]>}
 */
const WMM2025_COEFFICIENTS = [
  [1, 0, -29351.8, 0.0, 12.0, 0.0], [1, 1, -1410.8, 4545.4, 9.7, -21.5], [2, 0, -2556.6, 0.0, -11.6, 0.0],
  [2, 1, 2951.1, -3133.6, -5.2, -27.7], [2, 2, 1649.3, -815.1, -8.0, -12.1], [3, 0, 1361.0, 0.0, -1.3, 0.0],
  [3, 1, -2404.1, -56.6, -4.2, 4.0], [3, 2, 1243.8, 237.5, 0.4, -0.3], [3, 3, 453.6, -549.5, -15.6, -4.1],
  [4, 0, 895.0, 0.0, -1.6, 0.0], [4, 1, 799.5, 278.6, -2.4, -1.1], [4, 2, 55.7, -133.9, -6.0, 4.1],
  [4, 3, -281.1, 212.0, 5.6, 1.6], [4, 4, 12.1, -375.6, -7.0, -4.4], [5, 0, -233.2, 0.0, 0.6, 0.0],
  [5, 1, 368.9, 45.4, 1.4, -0.5], [5, 2, 187.2, 220.2, 0.0, 2.2], [5, 3, -138.7, -122.9, 0.6, 0.4],
  [5, 4, -142.0, 43.0, 2.2, 1.7], [5, 5, 20.9, 106.1, 0.9, 1.9], [6, 0, 64.4, 0.0, -0.2, 0.0],
  [6, 1, 63.8, -18.4, -0.4, 0.3], [6, 2, 76.9, 16.8, 0.9, -1.6], [6, 3, -115.7, 48.8, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.9, 0.9], [6, 5, 14.9, 10.9, 0.3, 0.7], [6, 6, -60.7, 72.7, 0.9, 0.9],
  [7, 0, 79.5, 0.0, -0.0, 0.0], [7, 1, -77.0, -48.9, -0.1, 0.6], [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1.0, 0.5, -0.8], [7, 4, 15.8, 23.4, -0.1, 0.0], [7, 5, 2.5, -7.4, -0.8, -1.0],
  [7, 6, -11.1, -25.1, -0.8, 0.6], [7, 7, 14.2, -2.3, 0.8, -0.2], [8, 0, 23.2, 0.0, -0.1, 0.0],
  [8, 1, 10.8, 7.1, 0.2, -0.2], [8, 2, -17.5, -12.6, 0.0, 0.5], [8, 3, 2.0, 11.4, 0.5, -0.4],
  [8, 4, -21.7, -9.7, -0.1, 0.4], [8, 5, 16.9, 12.7, 0.3, -0.5], [8, 6, 15.0, 0.7, 0.2, -0.6],
  [8, 7, -16.8, -5.2, -0.0, 0.3], [8, 8, 0.9, 3.9, 0.2, 0.2], [9, 0, 4.6, 0.0, -0.0, 0.0],
  [9, 1, 7.8, -24.8, -0.1, -0.3], [9, 2, 3.0, 12.2, 0.1, 0.3], [9, 3, -0.2, 8.3, 0.3, -0.3],
  [9, 4, -2.5, -3.3, -0.3, 0.3], [9, 5, -13.1, -5.2, 0.0, 0.2], [9, 6, 2.4, 7.2, 0.3, -0.1],
  [9, 7, 8.6, -0.6, -0.1, -0.2], [9, 8, -8.7, 0.8, 0.1, 0.4], [9, 9, -12.9, 10.0, -0.1, 0.1],
  [10, 0, -1.3, 0.0, 0.1, 0.0], [10, 1, -6.4, 3.3, 0.0, 0.0], [10, 2, 0.2, 0.0, 0.1, -0.0],
  [10, 3, 2.0, 2.4, 0.1, -0.2], [10, 4, -1.0, 5.3, -0.0, 0.1], [10, 5, -0.6, -9.1, -0.3, -0.1],
  [10, 6, -0.9, 0.4, 0.0, 0.1], [10, 7, 1.5, -4.2, -0.1, 0.0], [10, 8, 0.9, -3.8, -0.1, -0.1],
  [10, 9, -2.7, 0.9, -0.0, 0.2], [10, 10, -3.9, -9.1, -0.0, -0.0], [11, 0, 2.9, 0.0, 0.0, 0.0],
  [11, 1, -1.5, 0.0, -0.0, -0.0], [11, 2, -2.5, 2.9, 0.0, 0.1], [11, 3, 2.4, -0.6, 0.0, -0.0],
  [11, 4, -0.6, 0.2, 0.0, 0.1], [11, 5, -0.1, 0.5, -0.1, -0.0], [11, 6, -0.6, -0.3, 0.0, -0.0],
  [11, 7, -0.1, -1.2, -0.0, 0.1], [11, 8, 1.1, -1.7, -0.1, -0.0], [11, 9, -1.0, -2.9, -0.1, 0.0],
  [11, 10, -0.2, -1.8, -0.1, 0.0], [11, 11, 2.6, -2.3, -0.1, 0.0], [12, 0, -2.0, 0.0, 0.0, 0.0],
  [12, 1, -0.2, -1.3, 0.0, -0.0], [12, 2, 0.3, 0.7, -0.0, 0.0], [12, 3, 1.2, 1.0, -0.0, -0.1],
  [12, 4, -1.3, -1.4, -0.0, 0.1], [12, 5, 0.6, -0.0, -0.0, -0.0], [12, 6, 0.6, 0.6, 0.1, -0.0],
  [12, 7, 0.5, -0.1, -0.0, -0.0], [12, 8, -0.1, 0.8, 0.0, 0.0], [12, 9, -0.4, 0.1, 0.0, -0.0],
  [12, 10, -0.2, -1.0, -0.1, -0.0], [12, 11, -1.3, 0.1, -0.0, 0.0], [12, 12, -0.7, 0.2, -0.1, -0.1],];

export const WMM2025 = Object.freeze({
  name: 'WMM2025',
  epoch: 2025.0,
  validFrom: 2025.0,
  validUntil: 2030.0,
  degree: 12,
  coefficients: WMM2025_COEFFICIENTS,
});

/**
 * Dezimaljahr eines Zeitpunkts, z. B. 2026-10-14 → 2026,786.
 * @param {Date} date
 */
export function decimalYear(date) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const next = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (next - start);
}

/**
 * @typedef {{
 *   x: number, y: number, z: number, h: number, f: number,
 *   inclination: number, declination: number,
 *   model: string, epoch: number, year: number, withinValidity: boolean,
 * }} GeomagneticField  x nach Norden, y nach Osten, z nach unten (alle nT), Winkel in Grad
 */

/**
 * Magnetfeldvektor am Ort und Zeitpunkt nach dem WMM. Verfahren wie im NOAA-Referenzcode:
 * geodätische Koordinaten in geozentrisch sphärische umrechnen, Schmidt-halbnormierte Legendre-
 * Funktionen aufsummieren, Vektor zurück ins geodätische System drehen.
 * @param {number} latitude  geodätische Breite in Grad
 * @param {number} longitude Länge in Grad
 * @param {number} altitudeKm Höhe über dem WGS84-Ellipsoid in km
 * @param {number} year Dezimaljahr
 * @param {typeof WMM2025} [model]
 * @returns {GeomagneticField}
 */
export function geomagneticField(latitude, longitude, altitudeKm, year, model = WMM2025) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90) throw new Error('Ungültige Koordinaten für das Magnetfeldmodell.');
  if (!Number.isFinite(altitudeKm) || !Number.isFinite(year)) throw new Error('Ungültige Höhe oder Zeit für das Magnetfeldmodell.');
  // Pole: dort ist die Deklination nicht definiert, der Referenzcode weicht minimal aus.
  const lat = Math.max(-89.999, Math.min(89.999, latitude)) * DEG;
  const lon = longitude * DEG;
  const n = model.degree;

  // Geodätisch → geozentrisch sphärisch
  const sinLat = Math.sin(lat); const cosLat = Math.cos(lat);
  const e2 = WGS84_F * (2 - WGS84_F);
  const rc = WGS84_A_KM / Math.sqrt(1 - e2 * sinLat * sinLat);
  const p = (rc + altitudeKm) * cosLat;
  const zc = (rc * (1 - e2) + altitudeKm) * sinLat;
  const r = Math.hypot(p, zc);
  const phi = Math.asin(zc / r);
  const sinPhi = Math.sin(phi); const cosPhi = Math.cos(phi);

  // Koeffizienten zum Zeitpunkt
  const g = [];
  const h = [];
  for (let i = 0; i <= n; i++) { g.push(new Array(n + 1).fill(0)); h.push(new Array(n + 1).fill(0)); }
  const dt = year - model.epoch;
  for (const [nn, mm, g0, h0, gDot, hDot] of model.coefficients) {
    g[nn][mm] = g0 + dt * gDot;
    h[nn][mm] = h0 + dt * hDot;
  }

  // Zugeordnete Legendre-Funktionen P(n,m)(sin φ) und ihre Ableitung nach der Kobreite wie im
  // NOAA-Referenzcode (MAG_PcupLow), anschließend Schmidt-Quasinormierung
  const P = [];
  const dP = [];
  const S = [];
  for (let i = 0; i <= n; i++) { P.push(new Array(n + 1).fill(0)); dP.push(new Array(n + 1).fill(0)); S.push(new Array(n + 1).fill(0)); }
  const sx = sinPhi; const zc2 = cosPhi;
  P[0][0] = 1; dP[0][0] = 0; S[0][0] = 1;
  for (let nn = 1; nn <= n; nn++) {
    for (let mm = 0; mm <= nn; mm++) {
      if (nn === mm) {
        P[nn][mm] = zc2 * P[nn - 1][mm - 1];
        dP[nn][mm] = zc2 * dP[nn - 1][mm - 1] + sx * P[nn - 1][mm - 1];
      } else if (nn === 1 && mm === 0) {
        P[nn][mm] = sx * P[0][0];
        dP[nn][mm] = sx * dP[0][0] - zc2 * P[0][0];
      } else if (mm > nn - 2) {
        P[nn][mm] = sx * P[nn - 1][mm];
        dP[nn][mm] = sx * dP[nn - 1][mm] - zc2 * P[nn - 1][mm];
      } else {
        const k = ((nn - 1) * (nn - 1) - mm * mm) / ((2 * nn - 1) * (2 * nn - 3));
        P[nn][mm] = sx * P[nn - 1][mm] - k * P[nn - 2][mm];
        dP[nn][mm] = sx * dP[nn - 1][mm] - zc2 * P[nn - 1][mm] - k * dP[nn - 2][mm];
      }
      if (mm === 0) S[nn][0] = S[nn - 1][0] * (2 * nn - 1) / nn;
      else S[nn][mm] = S[nn][mm - 1] * Math.sqrt((nn - mm + 1) * (mm === 1 ? 2 : 1) / (nn + mm));
    }
  }
  for (let nn = 1; nn <= n; nn++) {
    for (let mm = 0; mm <= nn; mm++) {
      P[nn][mm] *= S[nn][mm];
      // Ableitung nach der Breite statt nach der Kobreite
      dP[nn][mm] = -dP[nn][mm] * S[nn][mm];
    }
  }

  // Summation im sphärischen System (x' Norden, y' Osten, z' unten)
  let bx = 0; let by = 0; let bz = 0;
  const ratio = GEOMAGNETIC_RADIUS_KM / r;
  let ratioPow = ratio * ratio;
  for (let nn = 1; nn <= n; nn++) {
    ratioPow *= ratio;
    for (let mm = 0; mm <= nn; mm++) {
      const cosM = Math.cos(mm * lon); const sinM = Math.sin(mm * lon);
      const pnm = P[nn][mm];
      const dpnm = dP[nn][mm];
      const gc = g[nn][mm] * cosM + h[nn][mm] * sinM;
      bz -= ratioPow * (nn + 1) * gc * pnm;
      by += ratioPow * mm * (g[nn][mm] * sinM - h[nn][mm] * cosM) * pnm;
      bx -= ratioPow * gc * dpnm;
    }
  }
  by /= cosPhi;

  // Zurück ins geodätische System
  const psi = phi - lat;
  const x = bx * Math.cos(psi) - bz * Math.sin(psi);
  const z = bx * Math.sin(psi) + bz * Math.cos(psi);
  const y = by;
  const hh = Math.hypot(x, y);
  return {
    x, y, z, h: hh, f: Math.hypot(hh, z),
    inclination: Math.atan2(z, hh) / DEG,
    declination: Math.atan2(y, x) / DEG,
    model: model.name, epoch: model.epoch, year,
    withinValidity: year >= model.validFrom && year <= model.validUntil,
  };
}
