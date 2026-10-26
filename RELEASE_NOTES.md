# DoiProof 1.0.1

Pflegeversion auf dem Stand von 1.0.0. Einstellungen gehen beim Schließen der App nicht mehr verloren, und die Datenschutzerklärung ist aus der App heraus erreichbar. Prüfkern, Manifest v3 und PDF-Bericht sind unverändert; Beweispakete aus 1.0.0 bleiben unverändert prüfbar. Der volle Funktionsumfang ist in den Release-Notes zu [1.0.0](https://github.com/neubuot/DoiProof/releases/tag/v1.0.0) beschrieben.

## Neu

- **„Über diese App“** öffnet sich über das Menü (⋮) oben rechts als eigenes Fenster: Version, Update-Kanal, Laufzeitversion, Commit und die manuelle Update-Prüfung. Dass Versions- und Commit-Angaben Selbstauskünfte der App sind und keine Attestierung, steht dort ausdrücklich.
- **Datenschutzerklärung und Impressum** sind von dort aus direkt aufrufbar (`https://doiproof.doilabs.org/datenschutz`, `https://doiproof.doilabs.org/impressum`). Google Play verlangt den Verweis auf die Datenschutzerklärung nicht nur im Store-Eintrag, sondern zusätzlich in der App selbst, sobald – wie hier durch Kamera und genauen Standort – personenbezogene Daten verarbeitet werden.

## Verbessert und behoben

- **Einstellungen bleiben erhalten:** Metadaten-Profil, Vorabblöcke, Berichtsauswahl und „Nach Aufnahme sofort senden“ werden gespeichert und beim Start wieder geladen. Bisher fiel das Profil beim Neustart stillschweigend auf „Privat“ zurück; die App konnte „Standort & Sensoren“ anzeigen, während Aufnahmen ohne Koordinaten entstanden. Lässt sich eine Einstellung nicht speichern, sagt die App das ausdrücklich, anstatt es zu verschweigen.
- Ein beschädigter oder unbekannter Eintrag in der Einstellungsdatei setzt das Metadaten-Profil vollständig auf „Privat“ zurück, nie nur einzelne Schalter – angezeigtes Profil und tatsächlich erfasste Angaben können so nicht auseinanderlaufen. Der Schreibschlüssel (API-Key) wird weiterhin nicht gespeichert; er gilt nur bis zum Schließen der App.
- **Android-Build-Nummer 2:** Google Play nimmt eine bereits verwendete Build-Nummer nicht erneut an. Sie wird in `app.json` (`android.versionCode`) gepflegt und von `expo prebuild` in das Gradle-Projekt übernommen.

## Downloads

- **Windows-Prüfer:** `DoiProof-Pruefer-1.0.1-Windows.exe` mit `SHA256SUMS.txt` (unten angehängt). Der Build ist nicht code-signiert; Hash vergleichen.
- **Android-APK:** Link im Abschnitt unten (wird vom Build-Workflow ergänzt).
- **iOS:** über TestFlight nach Einladung, siehe `docs/TESTER.md`.

## Grenzen

DoiProof belegt die Unversehrtheit des Beweispakets und – nach Online-Abgleich – seine Verankerung auf der Doichain. Gerätezeit, Standort, Sensorwerte, Kamera-Herkunft und App-Version sind Angaben des Geräts und nicht attestiert. Kein qualifizierter Zeitstempel nach eIDAS.
