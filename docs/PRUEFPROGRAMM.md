# DoiProof-ZIP unabhängig prüfen

**Stand: DoiProof 1.0.0, 5. Oktober 2026, Paketformat v1, v2 und v3.** Das Prüfprogramm ist ein Node.js-Programm im öffentlichen Repository. Es läuft außerhalb der mobilen App und verändert das ZIP nicht. Es prüft Dateibytes und Hashbindungen standardmäßig **ohne Netzwerk**. Ein bestätigter Ketteneintrag wird nur mit `--online` abgefragt; die Onlinequelle ist nicht automatisch ein unabhängiger Full Node.

Kommandozeile, [Windows-Prüfer](DESKTOP-PRUEFER.md) und der Tab „Prüfen“ der App verwenden **denselben Prüf- und Berichtskern** (`core/`). Sie kommen deshalb zum selben Ergebnis und erzeugen denselben PDF-Prüfbericht.

## Vorbereitung und Aufruf

Node.js (aktuelle LTS-Version), npm und einen Klon des Repositorys bereitstellen:

```sh
git clone https://github.com/neubuot/DoiProof.git
cd DoiProof
npm ci
npm run verify -- "/pfad/zu/DoiProof-paket.zip"
```

Unter Windows PowerShell beispielsweise:

```powershell
cd C:\Pfad\zu\DoiProof
git pull
npm ci
npm run verify -- "C:\Pfad\zum\DoiProof-paket.zip"
```

## Optionen

| Option | Wirkung |
|---|---|
| `--online` | Doichain-Transaktion, Bestätigungsblock und vorhandene Vorabblöcke online abgleichen |
| `--pdf bericht.pdf` | PDF-Prüfbericht nach der DoiProof-Designvorlage speichern (auch bei fehlgeschlagener Prüfung) |
| `--ohne-foto` | Foto nicht in den PDF-Bericht einbetten |
| `--ohne-standort` | Koordinaten im PDF-Bericht ausblenden |
| `--zeitzone Europe/Berlin` | Zeitzone für Ortszeiten im PDF (Standard: Zeitzone des Rechners) |
| `--report bericht.md` | kurzer Textbericht (Markdown); `bericht.json` für maschinenlesbare Ausgabe |
| `--json` | Ergebnis als JSON auf der Konsole |

Vorhandene Berichtsdateien werden nie überschrieben. Beispiel mit allem:

```sh
npm run verify -- paket.zip --online --pdf pruefbericht.pdf --report pruefbericht.md
```

## Der PDF-Prüfbericht

Gestaltung nach [docs/design/PRUEFBERICHT-DESIGN.md](design/PRUEFBERICHT-DESIGN.md):

- **Seite 1 – Ergebnis:** Banner *bestanden* (Paket unverändert und online im Doichain-Block bestätigt), *unvollständig* (unverändert, aber nicht online abgefragt, ausstehend oder Dienst nicht erreichbar) oder *fehlgeschlagen* (Hash-Widerspruch, beschädigtes ZIP oder Widerspruch zur Kette). Das Wort „echt“ erscheint nur bei *bestanden*. Dazu Foto, „Auf einen Blick“, Zeitstrahl (frühestens Vorabblock, Aufnahme laut Gerät, spätestens Doichain-Block) und Kacheln: gefüllt = mathematisch belegt, umrandet = stimmiges Indiz.
- **Seite 2 – Beweiskette:** Foto-, Manifest- und Paket-Hash, Transaktion, Block mit Bestätigungen, Tabelle der Zeitanker, QR-Code zu `https://verifile.it/#<Paket-Hash>`, „Dieser Bericht belegt / belegt nicht“.
- **Anhang ab Seite 3 – alle erhobenen Messwerte:** jede im Manifest gebundene Angabe nach Quelle gruppiert (Standort/GNSS, Bewegungssensoren, Magnetfeld/Kompass, Luftdruck, Licht, Kamera/EXIF, Gerät/App, Netz/Zeitanker, weitere Angaben, Exportstatus) mit Messgröße, Wert und Einheit, Messzeitpunkt, Quelle und Hinweis. Nicht erhobene Sensoren stehen ausdrücklich als „nicht erfasst“ mit Grund in der Tabelle. Messreihen sind mit Minimum, Maximum, Mittelwert und Anzahl zusammengefasst; **Anhang B** listet jede Einzelmessung mit Zeit und Phase (vor der Kamera, Kamera offen, nach der Rückkehr).

**Datenschutz:** Der PDF-Bericht enthält – anders als der Text- oder JSON-Bericht – das Foto, die Koordinaten und alle Sensorwerte. Mit `--ohne-foto` und `--ohne-standort` lassen sie sich ausblenden. Schriften sind eingebettet; beim Erzeugen gibt es keinen Netzwerkzugriff. EXIF-Ortsangaben der Bilddatei werden nicht ausgelesen, nur ihr Vorhandensein vermerkt.

## Was wird geprüft?

- ZIP-Lesbarkeit; genau eine Fotodatei `original.<endung>`, `manifest.json`, `verification.json` und optional `README.txt`. Unerwartete oder unsichere Einträge werden abgewiesen.
- **Größenlimits** beim tatsächlichen Entpacken: ZIP 200 MiB, Bild 150 MiB, JSON je 1 MiB. Ein ZIP, das kleinere Größen behauptet als es enthält, wird beim Überschreiten abgebrochen. Jede Datei wird gegen ihre CRC32-Prüfsumme geprüft.
- Bekannte Manifestversion und kanonische JSON-Serialisierung einschließlich des einen Zeilenumbruchs am Ende.
- SHA-256 der tatsächlichen Bildbytes gegen Manifest und `verification.json`, SHA-256 des kanonischen Manifests sowie den versionierten Paket-Hash.
- Struktur der Vorabblöcke; ab v3 zusätzlich Standortstatus und Sensorblock (bekannte Sensoren und Status, Zeitstempel, Zahlenwerte, höchstens 30 Messungen je Reihe).

**Achtung:** Jemand kann ein in sich stimmiges ZIP neu erzeugen. Die lokale Prüfung weist dann lediglich dessen interne Konsistenz nach. Sie bestätigt weder die Fotoaufnahme noch die Echtheit des Motivs, Urheberschaft, Geräteuhr, Standort, Sensorwerte oder App-Identität. Der im ZIP gespeicherte Status kann veraltet oder frei behauptet sein. Belastbar wird der Zeitbezug erst durch die Onlineprüfung (oder eine eigene Kettenprüfung) des Paket-Hashs.

## Hashverfahren zum Nachrechnen

```text
foto     = SHA-256(Bytes von original.<endung>)
manifest = SHA-256(UTF-8 des kanonischen Manifest-JSON ohne Schluss-Zeilenumbruch)
paket    = SHA-256(UTF-8 von "DoiProof:<version>\nphoto:<foto>\nmanifest:<manifest>")
```

`<version>` ist `v1`, `v2` oder `v3` aus `manifest.schema`; die Zeichenfolge enthält zwei echte Zeilenumbrüche und keinen am Ende.

- **v3:** Kanonisierung nach [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) (JSON Canonicalization Scheme): Objektschlüssel nach UTF-16-Code-Units sortiert, keine Leerzeichen, Zahlen und Zeichenketten wie bei ECMAScript `JSON.stringify`. Mit einer beliebigen RFC-8785-Implementierung (für viele Programmiersprachen verfügbar) lässt sich das Manifest unabhängig nachrechnen.
- **v1/v2:** Objektschlüssel rekursiv mit JavaScript `localeCompare` sortiert, `undefined` ausgelassen, keine Leerzeichen. Für alle in v1/v2 vorkommenden Schlüssel ist diese Ordnung identisch mit der Code-Unit-Ordnung.

## Zusätzliche Netzprüfung

```sh
npm run verify -- paket.zip --online --pdf pruefbericht.pdf
```

Der Prüfer sendet nur den **Paket-Hash** an `check_proof` beim Doichain-MCP-Dienst. Bei einer gemeldeten Bestätigung fragt er Transaktion und Block noch einmal ab und vergleicht ID, Block-Hash und Höhe. Vorabblöcke werden anhand ihres Hashs bei Blockstream (BTC) beziehungsweise beim Doichain-MCP-Dienst (DOI) abgefragt und mit Höhe und Blockzeit verglichen. Jede Abfrage hat ein Zeitlimit. Das ZIP, das Foto, Standort, Sensorwerte und das Manifest werden nicht gesendet.

Die Onlineprüfung ist **app-unabhängig, aber bei DOI nicht dienstunabhängig**: App und Prüfer fragen denselben MCP-Dienst. Bei streitigen oder besonders wichtigen Fällen Transaktion und beide Ketten zusätzlich über eigene oder unabhängig ausgewählte Nodes/Explorer prüfen; deren Aussagen und Abfragezeit dokumentieren. Die Block-Headerzeit ist keine präzise externe Uhr.

| Onlineergebnis | Bedeutung |
|---|---|
| `matched` | Transaktion, Bestätigungsblock und gegebenenfalls Vorabblöcke stimmen mit den Dienstantworten überein. |
| `incomplete` | Einreichung noch `pending` oder eine Abfrage nicht verfügbar; später wiederholen. |
| `failed` | Dienstantwort widerspricht dem Paket oder der behaupteten Bestätigung; Sachverhalt klären. |

**Exitcodes:** 0 = lokale Integrität und, falls angefordert, `matched`. 1 = Fehler oder Widerspruch (ein mit `--pdf` angeforderter Bericht wird trotzdem mit negativem Ergebnis geschrieben). 2 = gültiges ZIP, Onlineprüfung unvollständig. Text- und JSON-Berichte entstehen nur nach erfolgreicher lokaler Prüfung.

## Nachweisführung

Für eine Weitergabe das Original-ZIP unverändert aufbewahren und den PDF-Bericht als zusätzliche Prüfdokumentation ablegen. Der Bericht ist keine Signatur und keine qualifizierte Zeitbestätigung. Empfang, Verwahrung und spätere Kontrollprüfungen gesondert protokollieren. Die [Beweiskettenbeschreibung](PRODUKT-UND-BEWEISKETTE.md) grenzt die Aussagen für Nutzer, Versicherungen und Gerichte ein.
