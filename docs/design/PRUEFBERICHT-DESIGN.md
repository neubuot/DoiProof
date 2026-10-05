# Prüfbericht: Designvorlage

Verbindliche Vorlage für den PDF-Prüfbericht, den der Windows-Prüfer, der Kommandozeilen-Prüfer und der Prüfer in der Handy-App gleich erzeugen. Muster: [Pruefbericht-Mustervorlage.pdf](Pruefbericht-Mustervorlage.pdf). Foto und Standort sind darin geschwärzt, alle übrigen Werte stammen aus einem echten Prüflauf vom 01.10.2026.

## Gestaltung

- Format A4 hoch, Ränder etwa 36 pt, Kopf- und Fußzeile auf jeder Seite (Seite x von y, Berichtsnummer = erste 12 Hex-Zeichen des Paket-Hashs in Vierergruppen, z. B. `3DF2 5CFA 586B`).
- Schriften: Überschriften Serifenschrift (z. B. Fraunces), Fließtext IBM Plex Sans, Hashes und Nummern IBM Plex Mono. Schriften einbetten, keine Netzwerkzugriffe beim Erzeugen.
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
