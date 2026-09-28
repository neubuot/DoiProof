export function tileGrid(latitude, longitude, zoom = 14) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Keine gültigen Koordinaten im Manifest.');
  }
  const n = 2 ** zoom;
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin(lat * Math.PI / 180);
  const px = (longitude + 180) / 360 * n;
  const py = (1 - Math.log((1 + sin) / (1 - sin)) / (2 * Math.PI)) / 2 * n;
  const tx = Math.min(n - 1, Math.floor(px));
  const ty = Math.min(n - 1, Math.floor(py));
  const tiles = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const y = ty + dy;
      if (y >= 0 && y < n) tiles.push({ col: dx + 1, row: dy + 1, x: (tx + dx + n) % n, y, zoom });
    }
  }
  return { tiles, offsetX: 300 - (1 + px - tx) * 256, offsetY: 170 - (1 + py - ty) * 256 };
}
