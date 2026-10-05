/**
 * PDF-Prüfbericht nach docs/design/PRUEFBERICHT-DESIGN.md und der Mustervorlage.
 * Erzeugt das PDF vollständig in JavaScript (pdf-lib), mit eingebetteten Schriften und ohne
 * Netzwerkzugriff. Identischer Code für Kommandozeile, Windows-Prüfer und Handy-App.
 */
import fontkit from '@pdf-lib/fontkit';
import qrcode from 'qrcode-generator';
import {
  LineCapStyle, PDFDocument, appendBezierCurve, clip, closePath, concatTransformationMatrix, drawObject,
  endPath, lineTo, moveTo, popGraphicsState, pushGraphicsState, rgb, setCharacterSpacing,
} from 'pdf-lib';
import { formatInt, formatMeasure, formatTime, UTC } from './format.mjs';
import { samplePhase } from './report-model.mjs';

const W = 595.28;
const H = 841.89;
const M = 36;
const RIGHT = 559.5;
const CONTENT_W = RIGHT - M;

/** @param {string} hex */
const c = hex => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);

// Farben laut Designvorlage (Tokens) und Mustervorlage (Zwischentöne).
const C = {
  bg: c('#fdfbf7'), banner: c('#123d3a'), petrol: c('#1c5c56'), petrolLight: c('#e6efec'), sand: c('#f2efe6'),
  line: c('#ddd5c7'), rowLine: c('#e8e2d5'), text: c('#14201e'), text2: c('#3d4b48'), text3: c('#5b6865'),
  terra: c('#a3532e'), bannerItalic: c('#e7b48f'), bannerTitle: c('#f5f1e8'), bannerText: c('#dbe5e3'),
  ring: c('#7fb0a8'), timelineLine: c('#c9bfae'), chainLine: c('#b9cbc7'), sub: c('#4a5a57'),
  boxText: c('#2c3a37'), darkHash: c('#c9d7d4'), white: c('#ffffff'), photoBg: c('#ece7dc'),
  red: c('#a52a1f'), redBg: c('#fbecea'), redBanner: c('#7e2a20'), redText: c('#f7ddd6'), redAccent: c('#f3bfae'),
  redRing: c('#d98a7a'), redInner: c('#9b3427'), warnBg: c('#fbf1ea'), gray: c('#9aa5a2'),
};

/**
 * @typedef {{ serif: Uint8Array, serifItalic: Uint8Array, sans: Uint8Array, sansBold: Uint8Array, mono: Uint8Array, monoMedium: Uint8Array }} FontBytes
 * @typedef {import('pdf-lib').PDFFont} Font
 * @typedef {import('pdf-lib').PDFPage} Page
 * @typedef {import('pdf-lib').RGB} Color
 */

/** @param {number} w @param {number} h @param {number} r */
function roundRectPath(w, h, r) {
  const k = 0.5523 * r;
  return `M ${r} 0 L ${w - r} 0 C ${w - r + k} 0 ${w} ${r - k} ${w} ${r} L ${w} ${h - r} C ${w} ${h - r + k} ${w - r + k} ${h} ${w - r} ${h} `
    + `L ${r} ${h} C ${r - k} ${h} 0 ${h - r + k} 0 ${h - r} L 0 ${r} C 0 ${r - k} ${r - k} 0 ${r} 0 Z`;
}

class Canvas {
  /** @param {PDFDocument} doc @param {Record<string, Font>} fonts */
  constructor(doc, fonts) {
    this.doc = doc;
    this.f = fonts;
    /** @type {Page[]} */
    this.pages = [];
    /** @type {Page} */
    this.page = /** @type {any} */ (null);
  }

  addPage() {
    this.page = this.doc.addPage([W, H]);
    this.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });
    this.pages.push(this.page);
    return this.page;
  }

  /** Ersetzt Zeichen ohne Glyphe, damit fremde Dateinamen keine Lücken erzeugen. @param {Font} font @param {string} text */
  safe(font, text) {
    const glyphs = /** @type {any} */ (font).embedder?.font;
    const cleaned = String(text).replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ');
    if (!glyphs?.hasGlyphForCodePoint) return cleaned;
    let out = '';
    for (const ch of cleaned) out += glyphs.hasGlyphForCodePoint(/** @type {number} */ (ch.codePointAt(0))) ? ch : '?';
    return out;
  }

  /** @param {string} text @param {Font} font @param {number} size @param {number} [spacing] */
  width(text, font, size, spacing = 0) {
    const s = this.safe(font, text);
    return font.widthOfTextAtSize(s, size) + spacing * Math.max(0, [...s].length - 1);
  }

  /**
   * @param {string} text @param {number} x @param {number} baseline
   * @param {{ font: Font, size: number, color: Color, spacing?: number, align?: 'left'|'right'|'center' }} o
   */
  text(text, x, baseline, o) {
    const s = this.safe(o.font, text);
    const w = this.width(s, o.font, o.size, o.spacing);
    const left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    if (o.spacing) this.page.pushOperators(setCharacterSpacing(o.spacing));
    this.page.drawText(s, { x: left, y: H - baseline, font: o.font, size: o.size, color: o.color });
    if (o.spacing) this.page.pushOperators(setCharacterSpacing(0));
    return w;
  }

  /**
   * Zeilenumbruch an Leerzeichen; überlange Wörter (z. B. Hashes) werden zeichenweise getrennt.
   * @param {string} text @param {Font} font @param {number} size @param {number} max @param {number} [spacing]
   */
  wrap(text, font, size, max, spacing = 0) {
    /** @type {string[]} */
    const lines = [];
    for (const paragraph of String(text).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/ +/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.width(candidate, font, size, spacing) <= max) { line = candidate; continue; }
        const hyphen = word.lastIndexOf('-', word.length - 2);
        if (hyphen > 0 && this.width(`${line ? `${line} ` : ''}${word.slice(0, hyphen + 1)}`, font, size, spacing) <= max) {
          lines.push(`${line ? `${line} ` : ''}${word.slice(0, hyphen + 1)}`);
          line = word.slice(hyphen + 1);
          continue;
        }
        if (line) lines.push(line);
        if (this.width(word, font, size, spacing) <= max) { line = word; continue; }
        let part = '';
        for (const ch of word) {
          if (this.width(part + ch, font, size, spacing) > max && part) { lines.push(part); part = ''; }
          part += ch;
        }
        line = part;
      }
      lines.push(line);
    }
    return lines;
  }

  /** @param {number} x @param {number} top @param {number} w @param {number} h @param {{ fill?: Color, stroke?: Color, width?: number, r?: number }} o */
  rect(x, top, w, h, o) {
    if (!o.r) {
      this.page.drawRectangle({ x, y: H - top - h, width: w, height: h, color: o.fill, borderColor: o.stroke, borderWidth: o.stroke ? o.width ?? 0.75 : 0 });
      return;
    }
    this.page.drawSvgPath(roundRectPath(w, h, o.r), { x, y: H - top, color: o.fill, borderColor: o.stroke, borderWidth: o.stroke ? o.width ?? 0.75 : 0 });
  }

  /** @param {number} x @param {number} top @param {number} w @param {number} h @param {number} r */
  clipRound(x, top, w, h, r) {
    const k = 0.5523 * r;
    const y0 = H - top - h; const y1 = H - top;
    this.page.pushOperators(
      pushGraphicsState(),
      moveTo(x + r, y1), lineTo(x + w - r, y1), appendBezierCurve(x + w - r + k, y1, x + w, y1 - r + k, x + w, y1 - r),
      lineTo(x + w, y0 + r), appendBezierCurve(x + w, y0 + r - k, x + w - r + k, y0, x + w - r, y0),
      lineTo(x + r, y0), appendBezierCurve(x + r - k, y0, x, y0 + r - k, x, y0 + r),
      lineTo(x, y1 - r), appendBezierCurve(x, y1 - r + k, x + r - k, y1, x + r, y1),
      closePath(), clip(), endPath(),
    );
  }

  unclip() { this.page.pushOperators(popGraphicsState()); }

  /** @param {number} x @param {number} top @param {number} r @param {{ fill?: Color, stroke?: Color, width?: number, dash?: number[] }} o */
  circle(x, top, r, o) {
    this.page.drawCircle({ x, y: H - top, size: r, color: o.fill, borderColor: o.stroke, borderWidth: o.stroke ? o.width ?? 1 : 0, borderDashArray: o.dash });
  }

  /** Linienzug in Seitenkoordinaten (oben = 0). @param {[number, number][]} points @param {Color} color @param {number} width */
  polyline(points, color, width) {
    const [first, ...rest] = points;
    const path = `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')}`;
    this.page.drawSvgPath(path, { x: 0, y: H, borderColor: color, borderWidth: width, borderLineCap: LineCapStyle.Round });
  }

  /** @param {string} path SVG-Pfad relativ zu (x, top) @param {number} x @param {number} top @param {{ fill?: Color, stroke?: Color, width?: number }} o */
  svg(path, x, top, o) {
    this.page.drawSvgPath(path, { x, y: H - top, color: o.fill, borderColor: o.stroke, borderWidth: o.stroke ? o.width ?? 1 : 0, borderLineCap: LineCapStyle.Round });
  }

  /** @param {number} x0 @param {number} top @param {number} x1 @param {Color} color @param {number} [h] */
  hline(x0, top, x1, color, h = 0.75) {
    this.page.drawRectangle({ x: x0, y: H - top - h, width: x1 - x0, height: h, color });
  }
}

// ---------- Symbole ----------

/** @param {Canvas} cv @param {number} cx @param {number} cy @param {number} r @param {Color} color @param {number} lw */
function checkIcon(cv, cx, cy, r, color, lw) {
  cv.circle(cx, cy, r, { stroke: color, width: lw });
  const s = r / 6.55;
  cv.polyline([[cx - 3.05 * s, cy + 0.05 * s], [cx - 0.75 * s, cy + 2.3 * s], [cx + 3.05 * s, cy - 2.1 * s]], color, lw);
}
/** @param {Canvas} cv @param {number} cx @param {number} cy @param {number} r @param {Color} color @param {number} lw */
function crossIcon(cv, cx, cy, r, color, lw) {
  cv.circle(cx, cy, r, { stroke: color, width: lw });
  const d = r * 0.38;
  cv.polyline([[cx - d, cy - d], [cx + d, cy + d]], color, lw);
  cv.polyline([[cx - d, cy + d], [cx + d, cy - d]], color, lw);
}
/** @param {Canvas} cv @param {number} cx @param {number} cy @param {number} r @param {Color} color @param {number} lw */
function clockIcon(cv, cx, cy, r, color, lw) {
  cv.circle(cx, cy, r, { stroke: color, width: lw });
  cv.polyline([[cx, cy - r * 0.55], [cx, cy], [cx + r * 0.42, cy + r * 0.3]], color, lw);
}
/** @param {Canvas} cv @param {number} cx @param {number} cy @param {number} r @param {Color} color @param {number} lw */
function minusIcon(cv, cx, cy, r, color, lw) {
  cv.circle(cx, cy, r, { stroke: color, width: lw });
  cv.polyline([[cx - r * 0.45, cy], [cx + r * 0.45, cy]], color, lw);
}
/** @param {Canvas} cv @param {number} x @param {number} top @param {Color} color */
function cameraIcon(cv, x, top, color) {
  cv.svg('M 0 1.9 L 2.7 1.9 L 3.6 0 L 7.4 0 L 8.3 1.9 L 11 1.9 L 11 9.6 L 0 9.6 Z', x, top, { stroke: color, width: 1.375 });
  cv.circle(x + 5.5, top + 5.45, 2.35, { stroke: color, width: 1.375 });
}
/** @param {Canvas} cv @param {number} x @param {number} top @param {Color} color */
function pinIcon(cv, x, top, color) {
  cv.svg('M 4.5 12 C 4.5 12 0 7.6 0 4.5 C 0 2.015 2.015 0 4.5 0 C 6.985 0 9 2.015 9 4.5 C 9 7.6 4.5 12 4.5 12 Z', x, top, { stroke: color, width: 1.375 });
  cv.circle(x + 4.5, top + 4.4, 1.6, { stroke: color, width: 1.375 });
}

/** Kopfzeile: groß auf Seite 1, kompakt auf Folgeseiten. @param {Canvas} cv @param {any} model @param {boolean} first */
function header(cv, model, first) {
  const f = cv.f;
  if (first) {
    cv.circle(47.25, 41.95, 10.25, { stroke: C.petrol, width: 0.99 });
    cv.rect(41.6, 36.4, 11.2, 11.2, { fill: C.petrol, r: 3.3 });
    cv.polyline([[44.3, 42.0], [46.6, 44.1], [50.2, 39.9]], C.bg, 1.32);
    cv.text('DoiProof Prüfbericht', 66, 42, { font: f.serif, size: 15, color: C.banner });
    cv.text('Echtheitsnachweis für Fotos auf der Doichain', 66, 53.2, { font: f.sans, size: 8.25, color: C.text3, spacing: 0.12 });
    cv.text(`Nr. ${model.number}`, RIGHT, 40.5, { font: f.monoMedium, size: 9, color: C.banner, align: 'right', spacing: 0.3 });
    cv.text(model.createdText, RIGHT, 51, { font: f.sans, size: 8.25, color: C.text3, align: 'right', spacing: 0.12 });
    cv.hline(M, 63, RIGHT, C.line);
  } else {
    cv.circle(45, 37.5, 8.2, { stroke: C.petrol, width: 0.79 });
    cv.rect(40.5, 33, 9, 9, { fill: C.petrol, r: 2.6 });
    cv.polyline([[42.6, 37.5], [44.4, 39.2], [47.4, 35.8]], C.bg, 1.06);
    cv.text('DoiProof Prüfbericht', 61.5, 42, { font: f.serif, size: 12, color: C.banner });
    cv.text(`Nr. ${model.number}`, RIGHT, 41.2, { font: f.mono, size: 9, color: C.banner, align: 'right', spacing: 0.3 });
    cv.hline(M, 54, RIGHT, C.line);
  }
}

// ---------- Seite 1 ----------

/** @param {Canvas} cv @param {any} model @param {Record<string, any>} images */
function pageOne(cv, model, images) {
  const f = cv.f;
  cv.addPage();
  header(cv, model, true);

  // Ergebnisbanner
  const o = model.outcome;
  const theme = o === 'passed'
    ? { bg: C.banner, eyebrow: C.bannerItalic, title: C.bannerTitle, accent: C.bannerItalic, body: C.bannerText, ring: C.bannerItalic, inner: C.petrol, innerStroke: C.ring, icon: C.bannerTitle }
    : o === 'incomplete'
      ? { bg: C.sand, eyebrow: C.terra, title: C.banner, accent: C.terra, body: C.text2, ring: C.terra, inner: C.bg, innerStroke: C.terra, icon: C.terra }
      : { bg: C.redBanner, eyebrow: C.redAccent, title: c('#fdf3ef'), accent: C.redAccent, body: C.redText, ring: C.redAccent, inner: C.redInner, innerStroke: C.redRing, icon: c('#fdf3ef') };
  const bodyLines = cv.wrap(model.banner.text, f.sans, 10.12, 395, 0.12);
  const bannerH = Math.max(126, 96 + (bodyLines.length - 1) * 15);
  cv.rect(M, 75.8, CONTENT_W, bannerH, { fill: theme.bg, r: 12 });
  const cy = 75.8 + bannerH / 2;
  cv.circle(94.5, cy, 36.6, { stroke: theme.ring, width: 1.5, dash: [2.2, 2.7] });
  cv.circle(94.5, cy, 30, { fill: theme.inner, stroke: theme.innerStroke, width: 1.125 });
  if (o === 'passed') cv.polyline([[81.8, cy + 0.25], [89.6, cy + 9.05], [107.2, cy - 8.95]], theme.icon, 3.75);
  else if (o === 'incomplete') {
    cv.circle(94.5, cy, 13, { stroke: theme.icon, width: 2.6 });
    cv.polyline([[94.5, cy - 7.5], [94.5, cy], [100, cy + 4]], theme.icon, 2.6);
  } else {
    cv.polyline([[85, cy - 9.5], [104, cy + 9.5]], theme.icon, 3.75);
    cv.polyline([[85, cy + 9.5], [104, cy - 9.5]], theme.icon, 3.75);
  }
  cv.text(model.banner.eyebrow, 150, 100.5, { font: f.sansBold, size: 8.25, color: theme.eyebrow, spacing: 1.62 });
  let titleSize = 24;
  while (titleSize > 16 && cv.width(`${model.banner.title} `, f.serif, titleSize) + cv.width(model.banner.accent, f.serifItalic, titleSize) > 395) titleSize -= 0.5;
  const tw = cv.text(`${model.banner.title} `, 150, 129.8, { font: f.serif, size: titleSize, color: theme.title });
  cv.text(model.banner.accent, 150 + tw, 129.8, { font: f.serifItalic, size: titleSize, color: theme.accent });
  bodyLines.forEach((line, i) => cv.text(line, 150, 151.5 + i * 15, { font: f.sans, size: 10.12, color: theme.body, spacing: 0.12 }));
  const shift = bannerH - 126;

  // Foto
  const photoTop = 214.1 + shift;
  const photoH = 243.8;
  cv.rect(36.4, photoTop, 195.7, photoH, { fill: C.photoBg, r: 8.6 });
  if (images.photo) {
    const img = images.photo;
    const rotated = model.photo.orientation >= 5;
    const iw = rotated ? img.height : img.width;
    const ih = rotated ? img.width : img.height;
    const scale = Math.min(195.7 / iw, photoH / ih);
    const dw = iw * scale; const dh = ih * scale;
    const dx = 36.4 + (195.7 - dw) / 2;
    const dyTop = photoTop + (photoH - dh) / 2;
    cv.clipRound(36.4, photoTop, 195.7, photoH, 8.6);
    drawOriented(cv.page, img, model.photo.orientation, dx, H - dyTop - dh, dw, dh);
    cv.unclip();
  } else {
    const lines = cv.wrap(model.photoNote || 'Kein Foto', f.sans, 8.25, 160);
    lines.forEach((line, i) => cv.text(line, 134.25, photoTop + photoH / 2 - (lines.length - 1) * 5.5 + i * 11, { font: f.sans, size: 8.25, color: C.text3, align: 'center' }));
  }
  cv.rect(36.4, photoTop, 195.7, photoH, { stroke: C.line, width: 0.75, r: 8.6 });

  // Auf einen Blick
  cv.text('Auf einen Blick', 249, 228.8 + shift, { font: f.serif, size: 15, color: C.banner });
  cv.hline(249, 240 + shift, RIGHT, C.line);
  let rowTop = 240.75 + shift;
  for (const row of model.glance) {
    const valueLines = cv.wrap(row.value, f.sansBold, 10.12, RIGHT - 328.5, 0.12).slice(0, 2);
    cv.text(row.label, 249, rowTop + 16.45, { font: f.sans, size: 9, color: C.text3, spacing: 0.12 });
    valueLines.forEach((line, i) => cv.text(line, 328.5, rowTop + 17.25 + i * 13, { font: f.sansBold, size: 10.12, color: C.text, spacing: 0.12 }));
    let h = 28.5 + (valueLines.length - 1) * 13;
    if (row.sub) {
      cv.text(fit(cv, row.sub, f.sans, 9, RIGHT - 328.5, 0.12), 328.5, rowTop + 31.45 + (valueLines.length - 1) * 13, { font: f.sans, size: 9, color: C.text3, spacing: 0.12 });
      h += 14.25;
    }
    rowTop += h;
    cv.hline(249, rowTop - 0.75, RIGHT, C.rowLine);
  }

  // Zeitstrahl
  const tTop = Math.max(486.8 + shift, rowTop + 12);
  cv.rect(M, tTop, CONTENT_W, 93.7, { fill: C.sand, r: 10.5 });
  const title = model.timeline.title;
  const ttw = cv.text(title, 52.5, tTop + 25.4, { font: f.serif, size: 13.5, color: C.banner });
  cv.text(model.timeline.accent, 52.5 + ttw, tTop + 25.4, { font: f.serifItalic, size: 13.5, color: C.terra });
  cv.text(model.timeline.zone, 543.3, tTop + 25.4, { font: f.sans, size: 8.25, color: C.text3, align: 'right', spacing: 0.12 });
  cv.hline(58.5, tTop + 43.4, 537, C.timelineLine, 1.5);
  const dotY = tTop + 44.2;
  const [p0, p1, p2] = model.timeline.points;
  if (p0.state === 'verified') cv.circle(58.5, dotY, 6, { fill: C.terra });
  else cv.circle(58.5, dotY, 4.9, { fill: C.bg, stroke: p0.state === 'claimed' ? C.terra : C.gray, width: 2.25 });
  cv.circle(297.75, dotY, 3.75, { fill: C.bg, stroke: p1.state === 'open' ? C.gray : C.banner, width: 2.25 });
  if (p2.state === 'verified') cv.circle(537, dotY, 6, { fill: C.petrol });
  else cv.circle(537, dotY, 4.9, { fill: C.bg, stroke: C.gray, width: 2.25 });
  const lab = { font: f.sansBold, size: 9.38, color: C.text, spacing: 0.35 };
  const sub = { font: f.sans, size: 8.62, color: C.sub, spacing: 0.15 };
  cv.text(p0.label, 52.5, tTop + 63.7, lab);
  cv.text(p0.sub, 52.5, tTop + 78.7, sub);
  cv.text(p1.label, 297.75, tTop + 63.7, { ...lab, align: 'center' });
  cv.text(p1.sub, 297.75, tTop + 78.7, { ...sub, align: 'center' });
  cv.text(p2.label, 542.6, tTop + 63.7, { ...lab, align: 'right' });
  cv.text(p2.sub, 543, tTop + 78.7, { ...sub, align: 'right' });

  // Was die Prüfung zeigt
  const sTop = tTop + 93.7;
  cv.text('Was die Prüfung zeigt', M, sTop + 27, { font: f.serif, size: 15, color: C.banner });
  cv.rect(386.2, sTop + 18, 7.5, 7.5, { fill: C.petrol, r: 2.2 });
  cv.text('mathematisch belegt', 398.2, sTop + 24.7, { font: f.sans, size: 8.25, color: C.text2, spacing: 0.12 });
  cv.rect(488.6, sTop + 18.4, 6.8, 6.8, { stroke: C.terra, width: 0.75, r: 2 });
  cv.text('stimmiges Indiz', 500.2, sTop + 24.7, { font: f.sans, size: 8.25, color: C.text2, spacing: 0.12 });
  const available = 788 - (sTop + 38.3);
  let textSize = 9;
  /** @type {number[]} */
  let heights = [];
  /** @type {string[][]} */
  let wrapped = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    wrapped = model.tiles.map((/** @type {any} */ tile) => cv.wrap(tile.text, f.sans, textSize, 210, 0.12));
    heights = [0, 1, 2].map(r => 46.5 + (Math.max(wrapped[r * 2].length, wrapped[r * 2 + 1].length) - 1) * 12.7);
    if (heights.reduce((a, b) => a + b, 0) + 2 * 7.6 <= available) break;
    textSize -= 0.4;
  }
  let tileTop = sTop + 38.3;
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 2; col++) {
      const tile = model.tiles[r * 2 + col];
      drawTile(cv, tile, col === 0 ? M : 301.5, tileTop, 258, heights[r], wrapped[r * 2 + col], textSize);
    }
    tileTop += heights[r] + 7.6;
  }
}

/** @param {Canvas} cv @param {string} text @param {Font} font @param {number} size @param {number} max @param {number} [spacing] */
function fit(cv, text, font, size, max, spacing = 0) {
  if (cv.width(text, font, size, spacing) <= max) return text;
  let out = text;
  while (out.length > 1 && cv.width(`${out}…`, font, size, spacing) > max) out = out.slice(0, -1);
  return `${out}…`;
}

/**
 * @param {Canvas} cv @param {any} tile @param {number} x @param {number} top @param {number} w @param {number} h
 * @param {string[]} lines @param {number} size
 */
function drawTile(cv, tile, x, top, w, h, lines, size) {
  const f = cv.f;
  const kind = tile.kind;
  let iconColor = C.petrol;
  let titleColor = C.text;
  if (kind === 'proof') cv.rect(x, top, w, h, { fill: C.petrolLight, r: 9 });
  else if (kind === 'hint') { cv.rect(x + 0.4, top + 0.4, w - 0.8, h - 0.8, { stroke: C.terra, width: 0.75, r: 8.6 }); iconColor = C.terra; }
  else if (kind === 'warning') { cv.rect(x + 0.4, top + 0.4, w - 0.8, h - 0.8, { fill: C.warnBg, stroke: C.terra, width: 1.25, r: 8.6 }); iconColor = C.terra; }
  else if (kind === 'failed') { cv.rect(x + 0.4, top + 0.4, w - 0.8, h - 0.8, { fill: C.redBg, stroke: C.red, width: 1, r: 8.6 }); iconColor = C.red; }
  else { cv.rect(x + 0.4, top + 0.4, w - 0.8, h - 0.8, { stroke: C.line, width: 0.75, r: 8.6 }); iconColor = C.text3; titleColor = C.text2; }
  const icx = x + 18.75; const icy = top + 17.25;
  if (tile.icon === 'check') checkIcon(cv, icx, icy, 5.85, iconColor, 1.375);
  else if (tile.icon === 'cross') crossIcon(cv, icx, icy, 5.85, iconColor, 1.375);
  else if (tile.icon === 'clock') clockIcon(cv, icx, icy, 5.85, iconColor, 1.375);
  else if (tile.icon === 'minus') minusIcon(cv, icx, icy, 5.85, iconColor, 1.375);
  else if (tile.icon === 'camera') cameraIcon(cv, x + 13.6, top + 12.8, iconColor);
  else if (tile.icon === 'pin') pinIcon(cv, x + 14.6, top + 11.8, iconColor);
  cv.text(tile.title, x + 36.4, top + 19.4, { font: f.sansBold, size: 10.5, color: titleColor, spacing: 0.12 });
  lines.forEach((line, i) => cv.text(line, x + 36.4, top + 33.7 + i * 12.7, { font: f.sans, size, color: C.text2, spacing: 0.12 }));
}

/**
 * Zeichnet ein Bild unter Berücksichtigung der EXIF-Ausrichtung.
 * @param {Page} page @param {import('pdf-lib').PDFImage} image @param {number} orientation
 * @param {number} x @param {number} y @param {number} w @param {number} h  Zielrechteck in PDF-Koordinaten
 */
function drawOriented(page, image, orientation, x, y, w, h) {
  /** @type {Record<number, number[]>} */
  const m = {
    1: [w, 0, 0, h, x, y], 2: [-w, 0, 0, h, x + w, y], 3: [-w, 0, 0, -h, x + w, y + h], 4: [w, 0, 0, -h, x, y + h],
    5: [0, -h, -w, 0, x + w, y + h], 6: [0, -h, w, 0, x, y + h], 7: [0, h, w, 0, x, y], 8: [0, h, -w, 0, x + w, y],
  };
  const [a, b, cc, d, e, f] = m[orientation] ?? m[1];
  const name = /** @type {any} */ (page).node.newXObject('Image', image.ref);
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(a, b, cc, d, e, f), drawObject(name), popGraphicsState());
}

// ---------- Seite 2 ----------

/** @param {Canvas} cv @param {any} model */
function pageTwo(cv, model) {
  const f = cv.f;
  cv.addPage();
  header(cv, model, false);
  cv.text('Die Beweiskette', M, 84, { font: f.serif, size: 18, color: C.banner });
  const intro = cv.wrap('Jedes Glied wurde neu berechnet und mit dem nächsten verglichen. Ein einziges geändertes Bit an beliebiger Stelle hätte die Kette unterbrochen.', f.sans, 9.38, 505, 0.12);
  intro.forEach((line, i) => cv.text(line, M, 102 + i * 13.5, { font: f.sans, size: 9.38, color: C.text2, spacing: 0.12 }));

  cv.page.drawRectangle({ x: 47.25, y: H - 338.2, width: 1.5, height: 338.2 - 145.5, color: C.chainLine });
  model.chain.forEach((/** @type {any} */ step, /** @type {number} */ i) => {
    const top = 130.9 + i * 45.75;
    const dark = step.style === 'dark' && step.kind === 'ok';
    const circleColor = step.kind === 'failed' ? C.red : step.kind === 'open' ? C.gray : dark ? C.banner : C.petrol;
    cv.circle(48, top + 19.9, 12, { fill: circleColor });
    cv.text(String(i + 1), 48, top + 22.9, { font: f.sansBold, size: 9.75, color: C.bg, align: 'center' });
    const stroke = step.kind === 'failed' ? C.red : step.style === 'accent' ? C.petrol : dark ? C.banner : C.line;
    cv.rect(70.9, top, 488.2, 39, { fill: dark ? C.banner : step.kind === 'failed' ? C.redBg : C.white, stroke, width: 0.75, r: 7.1 });
    cv.text(fit(cv, step.title, f.sansBold, 9.75, 390, 0.12), 81.8, top + 16.9, { font: f.sansBold, size: 9.75, color: dark ? C.bannerTitle : C.text, spacing: 0.12 });
    const valueFont = step.style === 'accent' ? f.monoMedium : f.mono;
    cv.text(fit(cv, step.value, valueFont, 8.25, 395, 0.3), 81.8, top + 29.6, { font: valueFont, size: 8.25, color: dark ? C.darkHash : step.style === 'accent' ? C.banner : C.text2, spacing: 0.3 });
    const statusColor = dark ? C.bannerItalic : step.kind === 'ok' ? C.petrol : step.kind === 'failed' ? C.red : C.text3;
    cv.text(step.text, 548.5, top + 22.9, { font: f.sansBold, size: 8.25, color: statusColor, align: 'right', spacing: 0.12 });
  });

  // Zeitanker
  cv.text('Zeitanker im Beweispaket', M, 378.8, { font: f.serif, size: 13.5, color: C.banner });
  const rows = model.anchors.map((/** @type {any} */ row) => ({ ...row, h: row.hash ? 33 : 24 }));
  const tableH = 21.3 + rows.reduce((/** @type {number} */ sum, /** @type {any} */ row) => sum + row.h, 0);
  const tTop = 388.9;
  cv.rect(36.4, tTop, 522.7, tableH, { fill: C.white, r: 7.1 });
  cv.clipRound(36.4, tTop, 522.7, tableH, 7.1);
  cv.rect(36.4, tTop, 522.7, 21.3, { fill: C.sand });
  cv.unclip();
  cv.rect(36.4, tTop, 522.7, tableH, { stroke: C.line, width: 0.75, r: 7.1 });
  const head = { font: f.sansBold, size: 7.88, color: C.sub, spacing: 1.1 };
  cv.text('ANKER', 47.2, 402.8, head);
  cv.text('ZEIT (UTC)', 174.8, 402.8, head);
  cv.text('BLOCK-HASH', 242.2, 402.8, head);
  cv.text('STATUS', 459.8, 402.8, head);
  let y = tTop + 21.3;
  rows.forEach((/** @type {any} */ row) => {
    cv.hline(36.8, y, 558.8, C.rowLine);
    const mid = y + row.h / 2;
    cv.text(row.anchor, 47.2, mid + 3.4, { font: f.sansBold, size: 9, color: C.text, spacing: 0.12 });
    cv.text(row.time, 174.8, mid + 3.4, { font: f.sans, size: 9, color: C.text, spacing: 0.12 });
    if (row.hash) {
      cv.text(row.hash.slice(0, 46), 242.2, mid - 2.1, { font: f.mono, size: 7.5, color: C.text2 });
      cv.text(row.hash.slice(46), 242.2, mid + 8.4, { font: f.mono, size: 7.5, color: C.text2 });
    } else cv.text(fit(cv, row.note ?? '', f.sans, 8.62, 210), 242.2, mid + 3.4, { font: f.sans, size: 8.62, color: C.text3, spacing: 0.12 });
    const color = row.kind === 'ok' ? C.petrol : row.kind === 'claimed' ? C.terra : row.kind === 'failed' ? C.red : C.text3;
    cv.text(row.status, 459.8, mid + 3.4, { font: f.sansBold, size: 8.25, color, spacing: 0.12 });
    y += row.h;
  });

  // Selbst nachprüfen
  const qTop = y + 12.8;
  cv.rect(36.4, qTop, 522.7, 102.7, { fill: C.white, stroke: C.petrol, width: 0.75, r: 10 });
  if (model.qr) drawQr(cv, model.qr.url, 50.2, qTop + 12.4, 78);
  cv.text('Selbst nachprüfen, ohne uns zu vertrauen', 141.8, qTop + 33.4, { font: f.serif, size: 13.5, color: C.banner });
  const qrText = model.qr
    ? 'QR-Code scannen oder ‹verifile.it› mit dem Beweispaket-Hash öffnen. Jeder Doichain-Knoten weltweit liefert dasselbe Ergebnis. Die Rechenschritte stehen offen im kostenlosen DoiProof-Prüfer.'
    : 'Ohne gültigen Paket-Hash ist keine Kettenabfrage möglich. Die Rechenschritte stehen offen im kostenlosen DoiProof-Prüfer.';
  drawRichParagraph(cv, qrText, 141.8, qTop + 52.1, 395, 14);

  // Belegt / belegt nicht
  const bTop = qTop + 115.1;
  const left = cv.wrap(model.proves, f.sans, 9, 233, 0.12);
  const right = cv.wrap(model.provesNot, f.sans, 9, 233, 0.12);
  const bh = Math.max(94.5, 36.3 + Math.max(left.length, right.length) * 13.5);
  const failed = model.outcome === 'failed';
  cv.rect(M, bTop, 257.2, bh, { fill: failed ? C.redBg : C.petrolLight, r: 9 });
  cv.rect(302.6, bTop + 0.4, 256.5, bh - 0.8, { stroke: C.line, width: 0.75, r: 9 });
  cv.text('Dieser Bericht belegt', 48, bTop + 21, { font: f.sansBold, size: 10.12, color: failed ? C.red : C.banner, spacing: 0.12 });
  cv.text('Dieser Bericht belegt nicht', 315, bTop + 21.7, { font: f.sansBold, size: 10.12, color: C.terra, spacing: 0.12 });
  left.forEach((line, i) => cv.text(line, 48, bTop + 38.3 + i * 13.5, { font: f.sans, size: 9, color: C.boxText, spacing: 0.12 }));
  right.forEach((line, i) => cv.text(line, 315, bTop + 39 + i * 13.5, { font: f.sans, size: 9, color: C.boxText, spacing: 0.12 }));
}

/** Absatz mit Hervorhebung ‹…› in Mono-Schrift. @param {Canvas} cv @param {string} text @param {number} x @param {number} baseline @param {number} max @param {number} lh */
function drawRichParagraph(cv, text, x, baseline, max, lh) {
  const f = cv.f;
  /** @type {{ word: string, mono: boolean }[]} */
  const words = [];
  for (const part of text.split(/(‹[^›]*›)/)) {
    if (!part) continue;
    const mono = part.startsWith('‹');
    for (const word of part.replace(/[‹›]/g, '').split(' ')) if (word) words.push({ word, mono });
  }
  const style = (/** @type {boolean} */ mono) => (mono ? { font: f.mono, size: 8.62, color: C.banner } : { font: f.sans, size: 9.38, color: C.text2, spacing: 0.12 });
  let cx = x; let line = 0;
  const space = cv.width(' ', f.sans, 9.38);
  for (let i = 0; i < words.length; i++) {
    let { word } = words[i];
    const { mono } = words[i];
    const s = style(mono);
    let w = cv.width(word, s.font, s.size, s.spacing ?? 0);
    const hyphen = word.indexOf('-');
    if (cx > x && cx + w > x + max && hyphen > 0 && hyphen < word.length - 1) {
      const head = word.slice(0, hyphen + 1);
      const hw = cv.width(head, s.font, s.size, s.spacing ?? 0);
      if (cx + hw <= x + max) {
        cv.text(head, cx, baseline + line * lh, s);
        word = word.slice(hyphen + 1);
        w = cv.width(word, s.font, s.size, s.spacing ?? 0);
        line++; cx = x;
      }
    }
    if (cx > x && cx + w > x + max) { line++; cx = x; }
    cv.text(word, cx, baseline + line * lh, s);
    cx += w + space;
  }
}

/** @param {Canvas} cv @param {string} url @param {number} x @param {number} top @param {number} size */
function drawQr(cv, url, x, top, size) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  for (let r = 0; r < n; r++) {
    let start = -1;
    for (let col = 0; col <= n; col++) {
      const dark = col < n && qr.isDark(r, col);
      if (dark && start < 0) start = col;
      if (!dark && start >= 0) {
        cv.page.drawRectangle({ x: x + (quiet + start) * cell, y: H - top - (quiet + r + 1) * cell, width: (col - start) * cell + 0.01, height: cell + 0.01, color: C.banner });
        start = -1;
      }
    }
  }
}

// ---------- Anhang ----------

/**
 * @typedef {{ title: string, width: number, font?: 'sans'|'sansBold'|'mono', color?: Color, size?: number }} Column
 */

/**
 * Tabelle mit Seitenumbruch und wiederholtem Kopf.
 * @param {Canvas} cv @param {{ y: number, newPage: () => number }} flow
 * @param {Column[]} columns @param {string[][]} rows @param {{ highlight?: (index: number) => boolean }} [options]
 */
function table(cv, flow, columns, rows, options = {}) {
  const f = cv.f;
  const bottom = 776;
  const pad = 4.6;
  const lh = 9.2;
  const headerH = 18;
  const fontOf = (/** @type {Column} */ col) => (col.font === 'mono' ? f.mono : col.font === 'sansBold' ? f.sansBold : f.sans);
  const sizeOf = (/** @type {Column} */ col) => col.size ?? (col.font === 'mono' ? 6.6 : 7.4);
  const laid = rows.map(cells => {
    const lines = cells.map((cell, i) => {
      const col = columns[i];
      const font = /^[0-9a-f]{64}$/.test(cell) ? f.mono : fontOf(col);
      const size = /^[0-9a-f]{64}$/.test(cell) ? 6.6 : sizeOf(col);
      return { lines: cv.wrap(cell, font, size, col.width - 2 * pad), font, size };
    });
    const h = Math.max(...lines.map(l => l.lines.length)) * lh + 2 * pad + 1;
    return { lines, h };
  });
  let index = 0;
  while (index < laid.length) {
    if (flow.y + headerH + laid[index].h > bottom) flow.y = flow.newPage();
    const top = flow.y;
    let end = index; let h = headerH;
    while (end < laid.length && top + h + laid[end].h <= bottom) { h += laid[end].h; end++; }
    if (end === index) { h += laid[end].h; end++; }
    cv.rect(M + 0.4, top, CONTENT_W - 0.8, h, { fill: C.white, r: 6 });
    cv.clipRound(M + 0.4, top, CONTENT_W - 0.8, h, 6);
    cv.rect(M, top, CONTENT_W, headerH, { fill: C.sand });
    let x = M;
    for (const col of columns) {
      cv.text(col.title.toUpperCase(), x + pad + 2, top + 12, { font: f.sansBold, size: 6.4, color: C.sub, spacing: 0.75 });
      x += col.width;
    }
    let y = top + headerH;
    for (let r = index; r < end; r++) {
      const row = laid[r];
      if (options.highlight?.(r)) cv.rect(M, y, CONTENT_W, row.h, { fill: C.petrolLight });
      cv.hline(M, y, RIGHT, C.rowLine, 0.6);
      let cx = M;
      row.lines.forEach((cell, i) => {
        const col = columns[i];
        cell.lines.forEach((line, li) => cv.text(line, cx + pad + 2, y + pad + 7 + li * lh, { font: cell.font, size: cell.size, color: col.color ?? C.text }));
        cx += col.width;
      });
      y += row.h;
    }
    cv.unclip();
    cv.rect(M + 0.4, top, CONTENT_W - 0.8, h, { stroke: C.line, width: 0.75, r: 6 });
    flow.y = top + h + 14;
    index = end;
  }
}

/** @param {Canvas} cv @param {any} model */
function appendix(cv, model) {
  const f = cv.f;
  const startPage = () => { cv.addPage(); header(cv, model, false); return 72; };
  const flow = { y: startPage(), newPage: startPage };
  cv.text('Anhang: Alle erhobenen Messwerte', M, flow.y + 12, { font: f.serif, size: 18, color: C.banner });
  const intro = cv.wrap(`Jede im Manifest ${model.appendix.version} gebundene Angabe, gruppiert nach Quelle. Die Werte stammen vom Gerät und sind inhaltlich nicht unabhängig belegt; jede nachträgliche Änderung hätte aber den Manifest-Hash gebrochen. Nicht erhobene Sensoren sind ausdrücklich aufgeführt. Messreihen sind als Minimum, Maximum, Mittelwert und Anzahl zusammengefasst; Anhang B listet jede Einzelmessung.`, f.sans, 8.6, CONTENT_W, 0.1);
  intro.forEach((line, i) => cv.text(line, M, flow.y + 30 + i * 12, { font: f.sans, size: 8.6, color: C.text2, spacing: 0.1 }));
  flow.y += 30 + intro.length * 12 + 6;
  /** @type {Column[]} */
  const columns = [
    { title: 'Messgröße', width: 114, font: 'sansBold' },
    { title: 'Wert mit Einheit', width: 128 },
    { title: 'Messzeitpunkt', width: 84, color: C.text2, size: 7 },
    { title: 'Quelle / Sensor', width: 88, color: C.text2, size: 7 },
    { title: 'Hinweis', width: CONTENT_W - 414, color: C.text3, size: 7 },
  ];
  for (const group of model.appendix.groups) {
    if (flow.y + 60 > 776) flow.y = flow.newPage();
    cv.text(group.title, M, flow.y + 12, { font: f.serif, size: 12, color: C.banner });
    flow.y += 20;
    table(cv, flow, columns, group.rows.map((/** @type {any} */ row) => [row.quantity, row.value, row.time, row.source, row.note]));
  }

  if (model.appendix.series.length) {
    if (flow.y + 90 > 776) flow.y = flow.newPage();
    cv.text('Anhang B: Einzelmessungen der Messreihen', M, flow.y + 14, { font: f.serif, size: 15, color: C.banner });
    const text = cv.wrap('Jede im Manifest gespeicherte Einzelmessung mit Gerätezeit (UTC). Phase relativ zur Kamera: Android pausiert die Sensoren der App, solange die System-Kamera geöffnet ist; iOS liefert auch währenddessen Werte. Hervorgehoben ist der Einzelwert zum Aufnahmezeitpunkt.', f.sans, 8.6, CONTENT_W, 0.1);
    text.forEach((line, i) => cv.text(line, M, flow.y + 30 + i * 12, { font: f.sans, size: 8.6, color: C.text2, spacing: 0.1 }));
    flow.y += 30 + text.length * 12 + 6;
    for (const s of model.appendix.series) {
      if (flow.y + 60 > 776) flow.y = flow.newPage();
      const date = s.samples[0]?.at ? `${s.samples[0].at.slice(8, 10)}.${s.samples[0].at.slice(5, 7)}.${s.samples[0].at.slice(0, 4)}` : '';
      cv.text(`${s.title} – ${s.samples.length} Einzelmessungen${date ? ` am ${date}` : ''}`, M, flow.y + 11, { font: f.sansBold, size: 9.5, color: C.banner, spacing: 0.1 });
      flow.y += 17;
      const fieldWidth = (CONTENT_W - 28 - 82 - 70) / s.fields.length;
      /** @type {Column[]} */
      const cols = [
        { title: 'Nr.', width: 28, color: C.text3 },
        { title: 'Zeit (UTC)', width: 82 },
        { title: 'Phase', width: 70, color: C.text2 },
        ...s.fields.map((/** @type {string} */ field) => ({ title: `${field} [${s.units[field] ?? ''}]`, width: fieldWidth })),
      ];
      const readingAt = s.reading?.at;
      const rows = s.samples.map((/** @type {any} */ sample, /** @type {number} */ i) => {
        const at = new Date(Date.parse(sample.at));
        return [String(i + 1), `${formatTime(at, UTC)},${String(at.getUTCMilliseconds()).padStart(3, '0')}`, samplePhase(sample.at, s.window),
          ...s.fields.map((/** @type {string} */ field) => (sample[field] === undefined ? '–' : sample[field] === null ? 'null' : formatMeasure(sample[field])))];
      });
      table(cv, flow, cols, rows, { highlight: i => s.samples[i]?.at === readingAt });
    }
  }
}

/** @param {Canvas} cv @param {any} model */
function footers(cv, model) {
  const f = cv.f;
  const total = cv.pages.length;
  cv.pages.forEach((page, i) => {
    cv.page = page;
    const pageText = `Seite ${i + 1} von ${total}`;
    const style = { font: f.sans, size: 8.25, color: C.text3, spacing: 0.12 };
    if (i === 0) {
      cv.hline(M, 799.5, RIGHT, C.line);
      cv.text(total > 2 ? 'Technische Details, Selbstprüfung und Grenzen der Aussage auf Seite 2, alle Messwerte ab Seite 3' : 'Technische Details, Selbstprüfung und Grenzen der Aussage auf Seite 2', M, 816.8, style);
    } else {
      cv.hline(M, 786.8, RIGHT, C.line);
      const first = i === 1 ? model.footer[0] : `Anhang · alle im Manifest gebundenen Angaben · Manifest ${model.appendix.version} · Bericht Nr. ${model.number}`;
      cv.text(fit(cv, first, f.sans, 8.25, CONTENT_W, 0.12), M, 804, style);
      cv.text(fit(cv, model.footer[1], f.sans, 8.25, CONTENT_W - 70, 0.12), M, 816.8, style);
    }
    cv.text(pageText, 559.2, 816.8, { ...style, align: 'right' });
  });
}

/**
 * @param {ReturnType<typeof import('./report-model.mjs').buildReportModel>} model
 * @param {{ fonts: FontBytes }} options
 * @returns {Promise<Uint8Array>}
 */
export async function renderReportPdf(model, { fonts }) {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.registerFontkit(fontkit);
  const embed = (/** @type {Uint8Array} */ bytes) => doc.embedFont(bytes, { subset: true });
  const f = {
    serif: await embed(fonts.serif), serifItalic: await embed(fonts.serifItalic),
    sans: await embed(fonts.sans), sansBold: await embed(fonts.sansBold),
    mono: await embed(fonts.mono), monoMedium: await embed(fonts.monoMedium),
  };
  const created = new Date(model.meta.generatedAtUtc);
  doc.setTitle(model.title, { showInWindowTitleBar: true });
  doc.setAuthor('DoiProof');
  doc.setSubject(`Prüfbericht für das DoiProof-Beweispaket ${model.meta.evidenceSha256 ?? model.meta.zipSha256}`);
  doc.setKeywords(['DoiProof', 'Prüfbericht', 'Doichain', `Manifest ${model.meta.version}`]);
  doc.setCreator(model.producer);
  doc.setProducer('DoiProof-Berichtskern (pdf-lib)');
  doc.setLanguage('de-DE');
  doc.setCreationDate(created);
  doc.setModificationDate(created);

  /** @type {Record<string, any>} */
  const images = {};
  if (model.photo) {
    try {
      images.photo = model.photo.kind === 'jpeg' ? await doc.embedJpg(model.photo.bytes) : await doc.embedPng(model.photo.bytes);
    } catch {
      model = { ...model, photo: null, photoNote: 'Foto konnte nicht eingebettet werden (Bilddaten nicht lesbar)' };
    }
  }
  const cv = new Canvas(doc, f);
  pageOne(cv, model, images);
  pageTwo(cv, model);
  appendix(cv, model);
  footers(cv, model);
  return doc.save({ useObjectStreams: true });
}
