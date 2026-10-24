/**
 * Bewertungsstufen der Plausibilitätsprüfung. Eigenes Modul, damit das Berichtsmodell die Legende
 * kennt, ohne das Prüfmodul (das selbst das Berichtsmodell importiert) einzubinden.
 */
export const LEVELS = /** @type {const} */ (['stark', 'stimmig', 'intern', 'auffaellig', 'offen', 'widerspruch']);
/** @typedef {typeof LEVELS[number]} Level */
export const LEVEL_TEXT = /** @type {Record<Level, string>} */ ({
  stark: 'stark', stimmig: 'stimmig', intern: 'intern', auffaellig: 'auffällig', offen: 'offen', widerspruch: 'Widerspruch',
});
export const LEVEL_EXPLANATION = /** @type {Record<Level, string>} */ ({
  stark: 'Unabhängige Quelle, enge Übereinstimmung, hoher Fälschungsaufwand.',
  stimmig: 'Passt, aber die Referenz ist grob (Erfahrungswerte, Modellgitter) oder nur teilweise unabhängig.',
  intern: 'Zwei Gerätewerte bestätigen einander. Kein Beleg nach außen, aber ein Hindernis für erfundene Werte.',
  auffaellig: 'Wert weicht ab, lässt sich aber ohne Widerspruch zur Aufnahme erklären.',
  offen: 'Keine Referenz verfügbar oder Wert nicht verwertbar.',
  widerspruch: 'Wert passt nachweislich nicht zu Ort oder Zeit.',
});
