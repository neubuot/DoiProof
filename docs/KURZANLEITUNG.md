# DoiProof: Kurzanleitung

**Gilt für Version 1.0.0 (5. Oktober 2026).** Installation für Tester: [TESTER.md](TESTER.md). Hintergründe und Grenzen: [Produktbeschreibung und Beweiskette](PRODUKT-UND-BEWEISKETTE.md).

## In wenigen Schritten zum Nachweis

1. **Vorbereiten:** App öffnen, Tab „Aufnehmen“, Internetverbindung prüfen und unter „Metadatenprofil“ wählen: „Privat“ (ohne Standort und Sensoren), „Standort & Sensoren“ (GPS, Bewegung, Kompass, Luftdruck, Licht, Bild- und Gerätedaten) oder „Individuell“. Freigaben für Kamera, Standort und – auf dem iPhone – „Bewegung & Fitness“ erteilen. Eine verweigerte Freigabe bricht die Aufnahme nicht ab, sondern wird im Paket vermerkt.
2. **Aufnehmen:** „BTC- und Doichain-Block vor Kameraaufnahme“ eingeschaltet lassen und „Foto aufnehmen“ wählen. Die App lädt beide Blockstände und startet die Sensoren **vor dem Öffnen der Kamera**. Misslingt die Blockabfrage, erneut versuchen oder den Schalter bewusst ausschalten. Bei „Foto wählen“ gibt es keine Vorabblöcke und keine Sensorwerte.
3. **Einreichen:** „Nach Aufnahme sofort senden“ ist standardmäßig an. Original und Manifest werden vorher lokal gesichert. Ein Entwurf lässt sich im Verlauf mit „Jetzt senden“ einreichen.
4. **Bestätigung abwarten:** `pending` heißt eingereicht, aber noch nicht im Block. „Offene prüfen“ aktualisiert; die App prüft offene Einträge auch selbst. Erst `confirmed` verweist auf einen bestätigten Ketteneintrag.
5. **Sichern und übergeben:** „Beweispaket ZIP“ in einem eigenen, gesicherten Speicher ablegen. „Prüfbericht PDF“ prüft das Paket und erzeugt den Bericht mit Ergebnis, Beweiskette und allen Messwerten; er ersetzt das ZIP nicht.
6. **Fremde Pakete prüfen:** Tab „Prüfen“ → „ZIP-Beweispaket importieren“ → „Paket prüfen“ → „PDF-Prüfbericht erstellen und teilen“.

**Wichtig:** Das Foto wird nicht automatisch in der Galerie gespeichert, und der Verlauf geht beim Deinstallieren verloren. Bewahre das ZIP mit einer weiteren Sicherung auf. Vorabblöcke, Gerätezeit, Standort, Sensorwerte und App-Version sind Indizien mit unterschiedlichen Grenzen; sie belegen weder die Wahrheit des Bildinhalts noch eine exakte Auslösezeit.

## Häufige Fälle

- **Unfall:** Übersicht und Details aus mehreren Winkeln aufnehmen; Bericht, Zeugen und sonstige Unterlagen zusätzlich bewahren. Auf das Tageskontingent achten.
- **Inventar:** Gegenstand, Kennzeichnung/Signatur und Umgebung fotografieren; Rechnungen, Bewertungen und Versicherungspapiere ergänzen.
- **Arbeitsergebnis:** Vorher/Nachher und sichtbares Ergebnis aufnehmen; Auftrag und Abnahme gesondert dokumentieren.
- **Kein Blockabruf:** Erneut bei funktionierender Verbindung versuchen. Ohne Vorabmodus enthält das Paket keine Vorabblöcke.
- **Sensor fehlt im Bericht:** Der Anhang nennt den Grund (nicht vorhanden, Freigabe verweigert, kein Messwert).

Die ausführliche Bedienung steht im [Benutzerhandbuch](BENUTZERHANDBUCH.md).
