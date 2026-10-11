# DoiProof Prüfer für Windows

**Version 1.0.0, 5. Oktober 2026.** Die portable Windows-EXE ergänzt die mobile App. Sie verwendet denselben Prüf- und Berichtskern (`core/`) wie `npm run verify` und der Tab „Prüfen“ der App; der veröffentlichte Build wird in GitHub Actions auf Windows erstellt.

## Herunterladen

Im öffentlichen Repository unter [Releases](https://github.com/neubuot/DoiProof/releases) `DoiProof-Pruefer-1.0.0-Windows.exe` herunterladen. Es ist keine Installation nötig. Die veröffentlichte `SHA256SUMS.txt` enthält den Hash der EXE; in PowerShell vergleichen mit `Get-FileHash "C:\Pfad\DoiProof-Pruefer-1.0.0-Windows.exe" -Algorithm SHA256`.

**Der Build ist nicht mit einem Code-Signing-Zertifikat signiert.** Windows SmartScreen kann deshalb warnen. Beziehe die Datei nur aus dem offiziellen Release und vergleiche den Hash.

## Bedienung

1. EXE starten und ein `DoiProof-*.zip` per Dialog wählen oder auf die Ablagefläche ziehen.
2. „Paket prüfen“ anklicken. Standardmäßig prüft die App ohne Netzwerk ZIP, Foto, kanonisches Manifest (v1, v2 oder v3 einschließlich Sensorblock) und den Paket-Hash.
3. Für Kettenabfragen „Kettenstatus zusätzlich abfragen“ einschalten und erneut prüfen. Der Paket-Hash geht an den Doichain-MCP-Dienst; Vorabblock-Hashes werden bei Blockstream bzw. Doichain abgefragt. Foto, Standort, Sensorwerte und Manifest bleiben auf dem Rechner.
4. Ergebnisse lesen: `STIMMT ÜBEREIN` – die Dienstantwort passt zum Paket; `NICHT ERREICHBAR` oder `AUSSTEHEND` – Onlineprüfung unvollständig; `WIDERSPRUCH` – genauer prüfen. Ein verändertes Paket zeigt „PRÜFUNG FEHLGESCHLAGEN“ mit der Stelle des Fehlers.
5. „Bericht sichern“: Standard ist der **PDF-Prüfbericht** nach der DoiProof-Designvorlage (auch bei fehlgeschlagener Prüfung). Mit „Foto im PDF“ und „Standort im PDF“ lassen sich beide ausblenden. „Karte im PDF“ nimmt den Kartenausschnitt so in den Anhang auf, wie ihn „Karte laden“ in der Detailansicht zeigt (OpenStreetMap, Zoomstufe 14, Markierung in der Mitte). Die Option ist standardmäßig aus, wird nach „Karte laden“ automatisch gesetzt und nur bei eingeblendetem Standort angeboten. Ist sie gesetzt, lädt der Prüfer fehlende Kacheln beim Sichern nach – auch ohne vorheriges „Karte laden“; der Kartendienst erfährt dann ebenfalls den Standort auf etwa 1 km genau und die IP-Adresse. Ist der Kartendienst nicht erreichbar, entsteht der Bericht mit einem Hinweis statt der Karte. Alternativ Markdown- oder JSON-Kurzbericht (nur bei bestandener lokaler Prüfung; ohne Foto, Standort und Sensorwerte). Vor dem Erzeugen wird die ZIP-Datei erneut gehasht; hat sie sich seit der Prüfung geändert, entsteht kein Bericht.
6. „Details anzeigen“ öffnet nach erneuter Hashprüfung das Originalfoto, das vollständige Manifest einschließlich aller Sensormesswerte und den Exportstatus. „Karte laden“ ruft danach gezielt OpenStreetMap-Kacheln ab; dabei können der Standort (auf etwa 1 km genau) und die IP-Adresse beim Kartendienst bekannt werden. Geladene Kacheln liegen sieben Tage im Benutzerprofil (`%APPDATA%\doiproof-pruefer\map-cache`), werden auch für den PDF-Bericht verwendet und nach Ablauf beim nächsten Kartenabruf gelöscht. Wer keine Spur des Standorts auf dem Rechner hinterlassen will, löscht diesen Ordner.

Der PDF-Bericht enthält im Anhang jede im Manifest gebundene Angabe und jede Einzelmessung; Aufbau siehe [PRUEFPROGRAMM.md](PRUEFPROGRAMM.md#der-pdf-prüfbericht). Er ist nicht digital signiert; eine spätere Onlineabfrage kann anders ausfallen. Der Bericht bleibt ein Schnappschuss seiner Prüfzeit.

## Grenzen und Datenschutz

Die lokale Prüfung bestätigt **interne Byteintegrität**, nicht Motiv, Aufnahmezeit, Eigentum, Urheberschaft oder die Identität der aufnehmenden App. Die Onlineabfrage ist app-unabhängig, aber bei DOI **nicht dienstunabhängig**. Für streitige Fälle eigene oder anders ausgewählte Nodes verwenden und die Verwahrung des Original-ZIPs dokumentieren. Ein fehlgeschlagener Netzabruf ist kein Hash-Widerspruch.

Die Desktop-App lädt keine Webseiten und öffnet keine externen Links. Der Renderer läuft isoliert ohne Node.js-Zugriff; Dateizugriff, Prüfung und PDF-Erzeugung erfolgen im Hauptprozess. Netzwerk wird nur nach sichtbarer Auswahl genutzt. ZIPs sind auf 200 MiB, Bilder auf 150 MiB, die Bildvorschau auf 25 MiB und JSON-Dateien auf je 1 MiB begrenzt; die Grenzen gelten für die tatsächlich entpackte Datenmenge.

## Quellcode und Build

`desktop/` enthält Oberfläche, Electron-Hauptprozess (`main.cjs`), Prüf- und Berichtsanbindung (`report.mjs`) und Paketkonfiguration. `desktop/prepare.mjs` kopiert den Kern aus `core/` und die Schriften aus `assets/fonts/`; ein Test stellt sicher, dass sie byte-genau übereinstimmen. Der Workflow `.github/workflows/desktop-windows.yml` testet, baut auf `windows-latest` und hängt bei einem Release-Tag `v*` die EXE mit SHA-256-Summe an das GitHub-Release.

Für lokale Entwicklung unter Windows:

```powershell
cd C:\Pfad\zu\DoiProof
npm ci
cd desktop
npm ci
npm test
npm start
```

Der Buildbefehl ist `npm run dist:win`; die ausführbare Datei liegt anschließend in `desktop\dist`.
