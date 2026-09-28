# DoiProof Prüfer für Windows

**Version 0.5.0, 28. September 2026.** Die portable Windows-EXE ergänzt die mobile App. Sie verwendet denselben Prüfkern wie `npm run verify`; der veröffentlichte Build wird in GitHub Actions auf Windows erstellt.

## Herunterladen

Im privaten Repository [Releases](https://github.com/neubuot/DoiProof/releases) öffnen und `DoiProof-Pruefer-0.5.0-Windows.exe` herunterladen. Es ist keine Installation nötig. Die veröffentlichte `SHA256SUMS.txt` enthält den Hash der EXE. In PowerShell lässt er sich mit `Get-FileHash "C:\Pfad\DoiProof-Pruefer-0.5.0-Windows.exe" -Algorithm SHA256` vergleichen.

**Der Build ist noch nicht signiert.** Windows SmartScreen kann deshalb eine Warnung zeigen. Beziehe die Datei nur aus dem privaten DoiProof-Release und vergleiche den Hash. Die signierte Release-Infrastruktur ist noch nicht eingerichtet. GitHub-Version und Prüfer-Version sind am Release-Tag erkennbar.

## Bedienung

1. EXE starten und ein von der Handy-App exportiertes `DoiProof-*.zip` per Dialog wählen oder auf die Ablagefläche ziehen.
2. „Paket prüfen“ anklicken. Standardmäßig prüft die App ohne Netzwerk ZIP, Foto, kanonisches Manifest und den kombinierten v1/v2-Hash.
3. Für Kettenabfragen „Kettenstatus zusätzlich abfragen“ einschalten und erneut „Paket prüfen“ anklicken. Der Beweispaket-Hash geht an den Doichain-MCP-Dienst; Vorabblock-Hashes werden bei Blockstream bzw. Doichain abgefragt. Foto, GPS und Manifest bleiben auf dem Rechner.
4. Die getrennten Ergebnisse lesen. `STIMMT ÜBEREIN` bedeutet, dass die Dienstantwort zum Paket passt; `NICHT ERREICHBAR` oder `AUSSTEHEND` lassen die Onlineprüfung unvollständig. `WIDERSPRUCH` erfordert weitere Prüfung.
5. „Bericht sichern“ auswählen. Markdown ist für Menschen lesbar, JSON maschinenlesbar. ZIP und Bericht zusammen langfristig und unverändert aufbewahren.

Die Berichte enthalten Pfad, Prüfuhrzeit, Hashwerte, Dienststatus und ggf. Block-/Transaktionsdaten, aber kein Foto und keine Rohkoordinaten. Sie sind nicht digital signiert. Eine später erneut durchgeführte Onlineabfrage kann anders ausfallen, z. B. bei Netzfehlern. Der alte Bericht bleibt ein Schnappschuss seiner Prüfzeit.

## Grenzen und Datenschutz

Die lokale Prüfung bestätigt **interne Byteintegrität**, nicht Motiv, Aufnahmezeit, Eigentum, Urheberschaft oder die Identität der ausführenden Handy-App. Die Onlineabfrage ist app-unabhängig, aber bei DOI **nicht dienstunabhängig**: Sie verwendet denselben MCP-Dienst wie die Handy-App. Für streitige Fälle eigene oder anders ausgewählte Nodes und die Verwahrung des Original-ZIPs dokumentieren. Ein fehlgeschlagener Netzabruf ist kein Hash-Widerspruch.

Die Desktop-App lädt keine Webseiten und öffnet keine externen Links. Der Renderer läuft isoliert ohne Node.js-Zugriff; Dateizugriff und Prüfungen erfolgen im Hauptprozess. Netzwerk wird nur nach sichtbarer Auswahl genutzt. ZIPs sind auf 200 MiB, Bilder auf 150 MiB und JSON-Dateien auf je 1 MiB begrenzt.

## Quellcode und Build

`desktop/` enthält Oberfläche, Electron-Hauptprozess und Paketkonfiguration. `desktop/prepare.mjs` kopiert den versionierten Kern aus `scripts/verify.mjs`; damit verwenden CLI und EXE dieselbe Berechnung. Der CI-Workflow `.github/workflows/desktop-windows.yml` führt Tests durch, baut auf `windows-latest` und veröffentlicht den Build mit SHA-256-Summe als Release.

Für lokale Entwicklung auf Windows:

```powershell
cd C:\Users\ottma\DoiProof\desktop
npm ci
npm start
```

Der Buildbefehl ist `npm run dist:win`. Die ausführbare Datei liegt anschließend in `desktop\dist`. Für die technische Prüflogik und CLI siehe [PRUEFPROGRAMM.md](PRUEFPROGRAMM.md).
