# DoiProof-ZIP unabhängig prüfen

**Stand: DoiProof 1.1.0, 25. Oktober 2026, Paketformat v1, v2 und v3.** Das Prüfprogramm ist ein Node.js-Programm im öffentlichen Repository. Es läuft außerhalb der mobilen App und verändert das ZIP nicht. Es prüft Dateibytes und Hashbindungen standardmäßig **ohne Netzwerk**. Ein bestätigter Ketteneintrag wird nur mit `--online` abgefragt; die Onlinequelle ist nicht automatisch ein unabhängiger Full Node.

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
| `--karte` | Kartenausschnitt (OpenStreetMap, Zoomstufe 14) in den PDF-Bericht aufnehmen; nur mit `--pdf` und ohne `--ohne-standort`. Lädt Kartenkacheln aus dem Netz |
| `--plausibilitaet` | Versiegelte Sensorwerte gegen unabhängige Referenzdaten prüfen (Anhang „Plausibilität gegen Referenzdaten“ im PDF, Abschnitt im Textbericht). Schließt `--online` ein und ist nicht mit `--ohne-standort` kombinierbar. Sendet Koordinaten und Aufnahmetag an Open-Meteo und Nominatim |
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
- **Optional: Kartenausschnitt** (mit `--karte`) am Anfang des Anhangs in der Gruppe „Standort / GNSS“, gestaltet wie die Kartenansicht des Windows-Prüfers: Koordinaten, OSM-Karte mit Markierung in der Mitte, Quellenangabe „© OpenStreetMap contributors“ im Bild und darunter „Kartendaten © OpenStreetMap-Mitwirkende, https://www.openstreetmap.org/copyright“ (als Link) mit Abrufzeit der Kacheln. Die Karte veranschaulicht nur die gebundenen Koordinaten; sie ist nicht Teil des Beweispakets und erscheint nur bei bestandener lokaler Prüfung. Ist der Kartendienst nicht erreichbar, enthält der Bericht einen Hinweis statt der Karte und die Kommandozeile meldet es; der Exitcode ändert sich dadurch nicht.
- **Optional: Anhang „Plausibilität gegen Referenzdaten“** (mit `--plausibilitaet`, ab Seite 3, vor dem Messwerteanhang): Banner mit dem Ergebnis der Indizienprüfung und Zählung je Stufe, Gegenstand und Abgrenzung, Kacheln je Indiziengruppe, Methodik mit Bewertungsskala (stark, stimmig, intern, auffällig, offen, Widerspruch), Zeitstrahl in Ortszeit, Lesehinweis zu Android, Referenzquellen, sieben Indiziengruppen (Ort und Umgebung, Höhe, Atmosphäre, Erdmagnetfeld, Licht und Sonne, Gerät und Bewegung, Zeitanker) mit Sensorwert, Referenz, Abgleich und Wertung je Zeile, Gesamtwürdigung mit den Hypothesen H0 bis H4 (Aufnahme wie angegeben, Ort gefälscht, Zeit verschoben, fremdes Bild, synthetische Sensorwerte), „Dieser Anhang belegt / belegt nicht“ sowie Reproduzierbarkeit mit allen Abfrageadressen, Formeln und dem Abfragezeitpunkt. Einzelheiten unten.
- **Anhang danach – alle erhobenen Messwerte:** jede im Manifest gebundene Angabe nach Quelle gruppiert (Standort/GNSS, Bewegungssensoren, Magnetfeld/Kompass, Luftdruck, Licht, Kamera/EXIF, Gerät/App, Netz/Zeitanker, weitere Angaben, Exportstatus) mit Messgröße, Wert und Einheit, Messzeitpunkt, Quelle und Hinweis. Nicht erhobene Sensoren stehen ausdrücklich als „nicht erfasst“ mit Grund in der Tabelle. Messreihen sind mit Minimum, Maximum, Mittelwert und Anzahl zusammengefasst; **Anhang B** listet jede Einzelmessung mit Zeit und Phase (vor der Kamera, Kamera offen, nach der Rückkehr).

**Datenschutz:** Der PDF-Bericht enthält – anders als der Text- oder JSON-Bericht – das Foto, die Koordinaten und alle Sensorwerte. Mit `--ohne-foto` und `--ohne-standort` lassen sie sich ausblenden. Schriften sind eingebettet; ohne `--karte` gibt es beim Erzeugen keinen Netzwerkzugriff. Mit `--karte` werden höchstens 12 Kartenkacheln von `tile.openstreetmap.org` geladen; der Kartendienst sieht dabei die IP-Adresse und den ungefähren Standort (Zoomstufe 14, eine Kachel misst in Mitteleuropa rund 1,6 km; der Standort ist damit auf etwa 1 km genau erkennbar). Wie es die Nutzungsregeln von OpenStreetMap verlangen, bleiben die Kacheln sieben Tage im privaten Cache des Benutzers (Windows: `%LOCALAPPDATA%\DoiProof\Cache\map-cache`, macOS: `~/Library/Caches/DoiProof/map-cache`, Linux: `~/.cache/doiproof/map-cache`) und werden danach beim nächsten Kartenabruf gelöscht. Wer keine Spur des Standorts auf dem Rechner hinterlassen will, löscht diesen Ordner nach der Prüfung. `--karte` ist für einzelne Berichte gedacht, nicht für Stapel- oder CI-Läufe über viele Pakete. EXIF-Ortsangaben der Bilddatei werden nicht ausgelesen, nur ihr Vorhandensein vermerkt.

## Plausibilität gegen Referenzdaten (optional)

Die Beweiskette belegt, dass Foto und Aufnahmedaten unverändert sind. Sie sagt nichts darüber, ob die Gerätewerte inhaltlich stimmen. Mit `--plausibilitaet` vergleicht der Prüfer jede versiegelte Angabe mit Referenzdaten, die unabhängig vom Gerät entstanden sind, und bewertet jedes Indiz mit einer Stufe:

| Stufe | Bedeutung |
|---|---|
| stark | unabhängige Quelle, enge Übereinstimmung, hoher Fälschungsaufwand |
| stimmig | passt, aber die Referenz ist grob (Erfahrungswerte, Modellgitter) oder nur teilweise unabhängig |
| intern | zwei Gerätewerte bestätigen einander, kein Beleg nach außen |
| auffällig | Wert weicht ab, lässt sich aber ohne Widerspruch zur Aufnahme erklären |
| offen | keine Referenz verfügbar oder Wert nicht verwertbar |
| Widerspruch | Wert passt nachweislich nicht zu Ort oder Zeit |

**Referenzquellen und Rechnungen** (Modul `core/plausibility.mjs`, Erdmagnetfeld in `core/geomag.mjs`):

- Open-Meteo Forecast-API (Aufnahmen bis etwa 90 Tage zurück) oder Archiv-API (ältere Aufnahmen): Stationsdruck, Druck auf Meeresniveau, Temperatur, Bewölkung, Strahlung, Niederschlag und Sonnenzeiten für die Aufnahmestunde am Gitterpunkt. Open-Meteo Elevation: Geländehöhe.
- Nominatim (OpenStreetMap): Adresse und nächstes Objekt zum GNSS-Punkt, mit demselben User-Agent wie der Kartendienst.
- Erdmagnetfeld: Totalintensität, Inklination und Deklination offline aus den eingebetteten WMM2025-Koeffizienten (NOAA NCEI und BGS), ohne Netzabfrage.
- Zeitanker: Bitcoin-Vorabblock bei Blockstream, Doichain-Vorabblock und Bestätigungsblock beim Doichain-Dienst, also die vorhandene Onlineprüfung (`--plausibilitaet` schließt `--online` ein).
- Eigene Rechnungen: Sonnenhöhe und Azimut (NOAA-Algorithmus), barometrische Druckreduktion auf die Modellhöhe und Rückrechnung auf Meeresniveau, Normatmosphärenhöhe, Inklination aus zeitgleichen Beschleunigungs- und Magnetometerpaaren (nur Paare mit |a| 0,95 bis 1,05 g, Gyroskop unter 0,2 rad/s und Feldbetrag 25 bis 65 µT), Lichtwert EV100 aus den EXIF-Belichtungsdaten, Drehrate aus Kompass gegen Gyroskop, EXIF-Zeit gegen Gerätezeit. Magnetometerwerte mit Betrag außerhalb 25 bis 65 µT gelten als gestört.

Alle Referenzwerte sind **Modell- oder Näherungswerte** (Analyse am Gitterpunkt, Hauptfeldmodell, 90-m-Höhenraster), keine Stationsmessungen. Der Bildinhalt wird nicht automatisch ausgewertet. Motiv und Umgebung bleiben als „offen“ ausdrücklich dem Betrachter überlassen. Ist ein Dienst nicht erreichbar, bleiben die betroffenen Indizien „offen“, die Kommandozeile meldet es, und der Bericht entsteht trotzdem. Bei einem Paket ohne Standort entfallen alle ortsgebundenen Abgleiche. Die Prüfung läuft nur für ein lokal bestandenes Paket.

**Datenschutz:** Mit `--plausibilitaet` gehen die Koordinaten des Pakets (auf vier Nachkommastellen gerundet, etwa 10 m) und der Aufnahmetag an `api.open-meteo.com` beziehungsweise `archive-api.open-meteo.com` und an `nominatim.openstreetmap.org`. Beide Dienste sehen dabei die IP-Adresse des Prüfrechners. Zeitanker werden wie bei `--online` bei Blockstream und dem Doichain-Dienst abgefragt. Der Anhang nennt die ermittelte Adresse, den Aufnahmezeitpunkt und die Sensorwerte, und der Textbericht enthält mit dieser Option denselben Abschnitt. Weitergabe nur mit Einverständnis der abgebildeten und aufnehmenden Personen.

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
