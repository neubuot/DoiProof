# DoiProof 1.0.0

Erste auslieferungsreife Version von App, Kommandozeilen-Prüfer und Windows-Prüfer. Alle drei nutzen denselben Prüf- und Berichtskern (`core/`).

## Neu

- **Sensoren im Beweispaket (Manifest v3):** Während der Kameraaufnahme erfasst die App Beschleunigungssensor, Gyroskop, Magnetometer und Kompass, Barometer (Luftdruck, auf iOS relative Höhe) und – wo verfügbar – den Lichtsensor. Jeder Sensor liefert einen Einzelwert mit Zeitstempel und eine kurze Messreihe. Nicht verfügbare, verweigerte oder fehlerhafte Sensoren werden ausdrücklich mit Begründung vermerkt. Alles ist über den Manifest-Hash kryptografisch gebunden.
- **PDF-Prüfbericht** nach der DoiProof-Designvorlage: Ergebnisbanner (bestanden, unvollständig, fehlgeschlagen), Foto, „Auf einen Blick“, Zeitstrahl, Beweiskette, Zeitanker, QR-Code zu verifile.it und ein Anhang mit jedem einzelnen erhobenen Messwert. Schriften sind eingebettet; beim Erzeugen gibt es keinen Netzwerkzugriff.
- **Prüfer auf dem Handy:** Eigene oder fremde ZIP-Beweispakete importieren, offline prüfen, optional online abgleichen und den PDF-Bericht teilen.
- **Kommandozeile:** `npm run verify -- paket.zip --pdf bericht.pdf` (optional `--online`, `--ohne-foto`, `--ohne-standort`, `--zeitzone`). Auch eine fehlgeschlagene Prüfung ergibt einen PDF-Bericht mit klarem negativem Ergebnis.
- **Windows-Prüfer 1.0.0:** PDF-Bericht, Manifest v3 und Sensorangaben; Foto und Standort im PDF abwählbar.
- **Verteilung an Tester:** Android-APK (EAS Build, Profil `preview`) bei jedem Release-Tag, EAS Update für JavaScript-Änderungen ohne Neuinstallation, iOS-Profil für TestFlight vorbereitet.

## Verbessert und behoben

- Manifest v3 verwendet die Kanonisierung nach RFC 8785 (JSON Canonicalization Scheme) statt der locale-abhängigen Sortierung. v1 und v2 bleiben unverändert prüfbar.
- Der Prüfer begrenzt beim Entpacken die tatsächliche Datenmenge (Schutz vor ZIP-Bomben) statt nur die im ZIP behaupteten Größen und prüft CRC32 ohne vollständiges Vorab-Entpacken.
- Die Standortfreigabe wird vor dem Öffnen der Kamera eingeholt; eine Verweigerung verwirft das Foto nicht mehr, sondern wird im Manifest vermerkt.
- Netzwerkabfragen haben Zeitlimits; MCP-Antworten im Server-Sent-Events-Format werden gelesen.
- Der Windows-Release-Workflow ist tag-gesteuert und bricht bei Fehlern in PowerShell-Schritten zuverlässig ab.

## Downloads

- **Windows-Prüfer:** `DoiProof-Pruefer-1.0.0-Windows.exe` mit `SHA256SUMS.txt` (unten angehängt). Der Build ist nicht code-signiert; Hash vergleichen.
- **Android-APK:** Link im Abschnitt unten (wird vom Build-Workflow ergänzt).
- **iOS:** über TestFlight nach Einladung, siehe `docs/TESTER.md`.

## Grenzen

DoiProof belegt die Unversehrtheit des Beweispakets und – nach Online-Abgleich – seine Verankerung auf der Doichain. Gerätezeit, Standort, Sensorwerte, Kamera-Herkunft und App-Version sind Angaben des Geräts und nicht attestiert. Kein qualifizierter Zeitstempel nach eIDAS.
