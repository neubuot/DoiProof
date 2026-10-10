# Prüfbericht: Designvorlage

Verbindliche Vorlage für den PDF-Prüfbericht, den der Windows-Prüfer, der Kommandozeilen-Prüfer und der Prüfer in der Handy-App gleich erzeugen. Muster: [Pruefbericht-Mustervorlage.pdf](Pruefbericht-Mustervorlage.pdf). Foto und Standort sind darin geschwärzt, alle übrigen Werte stammen aus einem echten Prüflauf vom 01.10.2026.

## Gestaltung

- Format A4 hoch, Ränder etwa 36 pt, Kopf- und Fußzeile auf jeder Seite (Seite x von y, Berichtsnummer = erste 12 Hex-Zeichen des Paket-Hashs in Vierergruppen, z. B. `3DF2 5CFA 586B`).
- Schriften: Überschriften Serifenschrift (z. B. Fraunces), Fließtext IBM Plex Sans, Hashes und Nummern IBM Plex Mono. Schriften einbetten, keine Netzwerkzugriffe beim Erzeugen. Einzige Ausnahme ist der optionale Kartenausschnitt: Seine Kacheln werden nur auf ausdrücklichen Wunsch **vor** dem Rendern geladen; der Renderer selbst greift nie auf das Netz zu.
- Farben: Hintergrund `#fdfbf7`, Ergebnisbanner `#123d3a`, Akzent Petrol `#1c5c56`, helle Petrolfläche `#e6efec`, Sandfläche `#f2efe6`, Linien `#ddd5c7`, Text `#14201e` / `#3d4b48` / `#5b6865`, Hervorhebung Terrakotta `#a3532e`, Banner-Kursivtext `#e7b48f`.
- Ergebnisbanner je nach Ausgang: bestanden (Petrol, Haken), unvollständig (Sand/Terrakotta, Uhr), fehlgeschlagen (Rot, Kreuz). Die Kopfzeile darf nie „echt“ sagen, wenn eine Prüfung fehlschlug.

## Seite 1: Ergebnis

1. Banner „Ergebnis der Prüfung“ mit Satz in Klartext.
2. Links das verkleinerte Originalfoto, rechts „Auf einen Blick“: Aufgenommen, Versiegelt, Ort, Quelle, Gerät, Datei.
3. „Zeitlich eingeschlossen“: Zeitstrahl frühestens (BTC-Vorabblock) → Aufnahme laut Gerät → spätestens (Doichain-Block), Angabe der Ortszeitzone.
4. „Was die Prüfung zeigt“: Kacheln, gefüllt = mathematisch belegt, umrandet = stimmiges Indiz (Geräteangabe).

## Seite 2: Beweiskette

1. Nummerierte Kette: Foto-Hash, Manifest-Hash, Paket-Hash, Doichain-Transaktion, Block mit Bestätigungen, je mit Status.
2. Tabelle „Zeitanker im Beweispaket“ (Anker, Zeit UTC, Block-Hash, Status).
3. QR-Code zu verifile.it mit dem Paket-Hash, Hinweis auf Selbstprüfung.
4. Zwei Kästen „Dieser Bericht belegt“ / „Dieser Bericht belegt nicht“.
5. Fußzeile mit Verfahren, Manifestversion, Zeitpunkt der Onlineabfrage und Paketdateiname.

## Neu: Anhang „Alle erhobenen Messwerte“

Ab Seite 3 jede einzelne im Manifest gebundene Angabe als Tabelle, gruppiert nach Quelle (Standort/GNSS, Bewegungssensoren, Magnetfeld/Kompass, Luftdruck, Licht, Kamera/EXIF, Gerät/App, Netz/Zeitanker). Spalten: Messgröße, Wert mit Einheit, Messzeitpunkt, Quelle/Sensor, Hinweis (z. B. „Geräteangabe, nicht unabhängig belegt“, „nicht verfügbar“, „Berechtigung verweigert“). Nicht erhobene Sensoren ausdrücklich als „nicht erfasst“ aufführen. Rohreihen (Mehrfachmessungen) mit Min/Max/Mittel und Anzahl, die vollständige Reihe bleibt im Manifest.

## Neu: Kartenausschnitt (optional)

Auf ausdrücklichen Wunsch (App: „Kartenausschnitt (OpenStreetMap)“, Windows-Prüfer: „Karte im PDF“, Kommandozeile: `--karte`) zeigt der Anhang in der Gruppe „Standort / GNSS“ vor der Tabelle eine Karte, die der Detailkarte „02 / STANDORT“ des Windows-Prüfers entspricht:

- Weiße Karte mit Titelzeile „KARTENAUSSCHNITT“ / „OPENSTREETMAP · ZOOMSTUFE 14“ (`#66877b`), Koordinaten in IBM Plex Mono (`#205b58`, Format `48.137154°, 11.575382°`) und dem Hinweis des Prüfers „Koordinaten sind Selbstauskünfte des Geräts; eine Kartenmarkierung attestiert keinen Aufnahmeort.“
- Kartenbild 504 × 255 pt (672 × 340 px im Maßstab des Prüfers, 1 px = 0,75 pt), Radius 8,25 pt, Grund `#dfe6dd`, OSM-Kacheln in Zoomstufe 14, Koordinate genau in der Mitte.
- Markierung wie im Prüfer: Kreis mit 15 pt Durchmesser, 3 pt weißer Rand, Füllung `#bb775b`, weicher Schatten.
- Quellenangabe unten rechts im Bild („© OpenStreetMap contributors“, `#245a57` auf halbtransparentem Weiß) und darunter „Kartendaten © OpenStreetMap-Mitwirkende, openstreetmap.org/copyright“, Zoomstufe, Abrufzeit und der Satz, dass die Karte nicht Teil des Beweispakets ist.
- Meldet das Gerät einen simulierten Standort, steht der Warnhinweis in Terrakotta über der Karte.
- Ist der Kartendienst nicht erreichbar, enthält die Karte statt des Bildes den Hinweis „Kartenausschnitt nicht verfügbar …“; der Bericht entsteht trotzdem.
- Die Karte erscheint nur, wenn der Standort im Bericht eingeblendet ist und das Paket die lokale Prüfung bestanden hat. Die Fußzeile von Seite 1 nennt dann „Karte und alle Messwerte ab Seite 3“.

## Umsetzung (ab Version 1.0.0)

Der Bericht entsteht in `core/report-model.mjs` (Inhalte und Zustände) und `core/report-pdf.mjs` (Layout mit pdf-lib nach den Koordinaten, Schriftgrößen, Farben und Radien der Mustervorlage). Den Kartenausschnitt berechnet und lädt `core/map.mjs` (gemeinsam mit der Kartenansicht des Windows-Prüfers); `core/pipeline.mjs` reicht die geladenen Kacheln an das Modell weiter. Kommandozeile (`npm run verify -- paket.zip --pdf bericht.pdf`), Windows-Prüfer und App verwenden denselben Code und dieselben eingebetteten Schriften (`assets/fonts/`). [Pruefbericht-Beispiel-1.0.pdf](Pruefbericht-Beispiel-1.0.pdf) zeigt das Ergebnis mit **synthetischen Daten** (künstliches Testbild, Platzhalterort 48° N / 11° O, erfundene Block- und Transaktions-Hashes); es ist kein echter Nachweis und auf keiner Kette auffindbar.
