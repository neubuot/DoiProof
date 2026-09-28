# DoiProof-ZIP unabhängig prüfen

**Stand: 28. September 2026, Paketformat v1/v2.** Der Prüfer ist ein Node.js-Programm im Repository, läuft außerhalb der mobilen App und verändert das ZIP nicht. Er prüft Dateibytes und Hashbindungen standardmäßig **ohne Netzwerk**. Ein bestätigter Ketteneintrag wird nur mit `--online` abgefragt; die Onlinequelle ist nicht automatisch ein unabhängiger Full Node.

## Vorbereitung und Aufruf

Node.js (aktuelle LTS-Version), npm und einen lokalen Git-Klon des privaten Repositories bereitstellen:

```sh
git pull
npm ci
npm run verify -- "/pfad/zu/DoiProof-paket.zip"
```

Unter Windows PowerShell beispielsweise:

```powershell
cd C:\Users\ottma\DoiProof
git pull
npm ci
npm run verify -- "C:\Pfad\zum\DoiProof-paket.zip"
```

Die Standardprüfung sendet **keine** Daten ins Netz. Das Programm gibt einen lesbaren Bericht aus. Für eine zusätzliche Datei:

```sh
npm run verify -- paket.zip --report pruefbericht.md
```

Der Bericht enthält Pfad, Prüfzeit und Hashwerte, aber nicht Foto, GPS oder die übrigen Manifestfelder. Eine vorhandene Berichtsdatei wird nicht überschrieben. Für eine maschinenlesbare Ausgabe `--json` ergänzen oder `--report pruefbericht.json` verwenden.

## Was wird geprüft?

- ZIP-Lesbarkeit und interne CRC-Prüfung, genau eine Fotodatei `original.<endung>`, `manifest.json` und `verification.json`; Größenlimits: ZIP 200 MiB, Bild 150 MiB, JSON je 1 MiB. Unerwartete Einträge werden abgewiesen.
- Bekannte Manifestversion v1 oder v2 und kanonische JSON-Serialisierung einschließlich des einen Export-Zeilenumbruchs.
- SHA-256 der tatsächlichen Bildbytes gegen Manifest und `verification.json`, SHA-256 des kanonischen Manifests sowie den versionierten gemeinsamen Paket-Hash.
- Bei vorhandenen Vorabblöcken: Form, Höhe, Hash und Geräte-/Headerzeit als **Felder im unveränderten Paket**. Offline wird ihre Existenz auf einer Blockchain nicht geprüft.

**Achtung:** Jemand kann ein vollständig in sich stimmiges ZIP neu erzeugen. Die lokale Prüfung weist dann lediglich dessen interne Konsistenz nach. Sie bestätigt weder die Fotoaufnahme noch die Echtheit des Motivs, Urheberschaft, Geräteuhr, Standort oder App-Identität. Der im ZIP gespeicherte Status kann veraltet oder frei behauptet sein.

## Zusätzliche Netzprüfung

```sh
npm run verify -- paket.zip --online --report pruefbericht.md
```

Der Prüfer sendet nur den **Paket-Hash** an `check_proof` beim Doichain-MCP-Dienst. Bei einer gemeldeten Bestätigung fragt er Transaktion und Block noch einmal ab und vergleicht ID, Block-Hash und Höhe. Vorabblöcke, falls vorhanden, werden anhand ihres Hashs bei Blockstream (BTC) beziehungsweise dem Doichain-MCP-Dienst (DOI) abgefragt. Diese Netzaufrufe geben dem jeweiligen Dienst den abgefragten Hash und übliche technische Verbindungsdaten preis. Das ZIP, das Foto, GPS und das Manifest werden nicht gesendet.

Die Onlineprüfung ist **app-unabhängig, aber bei DOI nicht dienstunabhängig**: DoiProof und dieses Programm fragen denselben MCP-Dienst. Der BTC-Blockdienst ist ebenfalls ein externer Anbieter. Bei streitigen oder besonders wichtigen Fällen Transaktion und beide Ketten zusätzlich über eigene oder unabhängig ausgewählte Nodes/Explorer prüfen; deren Aussagen und Abfragezeit dokumentieren. Die Vorabblöcke belegen für sich nicht, wann die Kamera ausgelöst wurde. Die Block-Headerzeit ist keine präzise externe Uhr.

| Onlineergebnis | Bedeutung |
|---|---|
| `matched` | Abgefragte Transaktion und gegebenenfalls Vorabblöcke stimmen mit den Dienstantworten überein. |
| `incomplete` | Einreichung noch `pending` oder eine Abfrage nicht verfügbar; später wiederholen. |
| `failed` | Dienstantwort widerspricht dem Paket oder behaupteter Bestätigung; Sachverhalt klären. |

Exitcode 0 bedeutet lokale Integrität und, falls angefordert, `matched`. Exitcode 1 bedeutet Fehler/Widerspruch. Exitcode 2 bedeutet bei gültigem ZIP eine unvollständige Onlineprüfung. Das Programm schreibt einen Bericht **nur nach erfolgreicher lokaler Prüfung**; ein fehlender Bericht beweist nichts über das ZIP.

## Nachweisführung

Für eine Weitergabe das Original-ZIP unverändert aufbewahren und den Bericht als zusätzliche Prüfdokumentation ablegen. Der Bericht ist keine Signatur und keine qualifizierte Zeitbestätigung. Empfang, Verwahrung und gegebenenfalls spätere Kontrollprüfungen gesondert protokollieren. Die [Beweiskettenbeschreibung](PRODUKT-UND-BEWEISKETTE.md) grenzt die Aussagen für Nutzer, Versicherungen und Gerichte ein.
