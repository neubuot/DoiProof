# DoiProof 1.1.0

Plausibilitätsprüfung der versiegelten Sensorwerte gegen unabhängige Referenzdaten im Kommandozeilen- und Windows-Prüfer. Die App bleibt funktional unverändert und trägt nur die neue Versionsnummer.

## Neu in 1.1.0: Plausibilität gegen Referenzdaten

- **Neuer Anhang im PDF-Prüfbericht** (Windows-Prüfer: Häkchen „Plausibilität prüfen (online)“ neben „Karte im PDF“, Kommandozeile: `--plausibilitaet`, jeweils standardmäßig aus): Die versiegelten Sensorwerte werden gegen unabhängige Referenzdaten gestellt und jedes Indiz mit einer Stufe bewertet (stark, stimmig, intern, auffällig, offen, Widerspruch). Sieben Gruppen: Ort und Umgebung (Nominatim), Höhe (Open-Meteo Elevation, barometrische Rückrechnung), Atmosphäre (Open-Meteo Stationsdruck für die Aufnahmestunde, Archiv-API für Aufnahmen älter als 90 Tage), Erdmagnetfeld (Totalintensität, Inklination aus ruhigen Sensorpaaren, Deklination, gestörte Messungen; WMM2025 offline aus eingebetteten Koeffizienten), Licht und Sonne (NOAA-Sonnenstand, Bewölkung, Lichtsensor, Lichtwert aus EXIF), Gerät und Bewegung (Kameramodul, Beschleunigung, Kompass gegen Gyroskop), Zeitanker (Bitcoin- und Doichain-Vorabblock, Doichain-Block, EXIF-Zeit). Dazu Gesamtwürdigung mit den Hypothesen H0 bis H4 („was dagegen spricht“, „was offen bleibt“), „Dieser Anhang belegt / belegt nicht“ und Reproduzierbarkeit mit allen Abfrageadressen, Formeln und dem Abfragezeitpunkt. Der Textbericht der Kommandozeile erhält denselben Abschnitt.
- **Datenschutz:** Nur auf Wunsch und nur bei eingeblendetem Standort. Koordinaten gehen auf vier Nachkommastellen gerundet (etwa 10 m) mit dem Aufnahmetag an Open-Meteo und Nominatim (OpenStreetMap). Die Zeitanker werden wie bei der Onlineprüfung bei Blockstream und dem Doichain-Dienst abgefragt, auch wenn sie nicht gesondert eingeschaltet war. Die Dienste sehen die IP-Adresse des Prüfrechners. Der PDF-Renderer greift weiterhin nie selbst aufs Netz, Referenzdaten werden wie die Kartenkacheln vorher geladen. Alle Referenzwerte sind als Modell- oder Näherungswerte gekennzeichnet, der Bildinhalt wird nicht automatisch ausgewertet.
- **Vergleichsseite:** „Sensorwerte gegen Referenzwerte“ zeigt jede vergleichbare Messgröße (Luftdruck, Meeresniveaudruck, Höhe, Feldstärke, Inklination, Deklination, Helligkeit, Ruhelage, Drehrate, Zeitfenster) auf einer Skala mit Gerätewert, Referenzwert, Toleranzband und einem Satz zur Einordnung. Die Ergebnisseite nennt die stärksten Indizien und die Auffälligkeiten in Klartext.
- **Prüfbar:** Das Erdmagnetfeldmodell trifft die offiziellen NOAA-Testwerte des WMM2025 auf unter 0,5 nT. Die Tests enthalten die aufgezeichneten Werte eines echten Pakets (Luftdruck 985,38 gegen 985,5 hPa, Feldstärke 48,23 gegen 48,99 µT, Inklination 62,1 gegen 64,96 Grad, Sonnenhöhe 13,5 Grad). Keine neuen npm-Abhängigkeiten.

## Aus 1.0.0 übernommen

Erste auslieferungsreife Version von App, Kommandozeilen-Prüfer und Windows-Prüfer. Alle drei nutzen denselben Prüf- und Berichtskern (`core/`).

### Neu

- **Sensoren im Beweispaket (Manifest v3):** Während der Kameraaufnahme erfasst die App Beschleunigungssensor, Gyroskop, Magnetometer und Kompass, Barometer (Luftdruck, auf iOS relative Höhe) und – wo verfügbar – den Lichtsensor. Jeder Sensor liefert einen Einzelwert mit Zeitstempel und eine kurze Messreihe. Nicht verfügbare, verweigerte oder fehlerhafte Sensoren werden ausdrücklich mit Begründung vermerkt. Alles ist über den Manifest-Hash kryptografisch gebunden.
- **PDF-Prüfbericht** nach der DoiProof-Designvorlage: Ergebnisbanner (bestanden, unvollständig, fehlgeschlagen), Foto, „Auf einen Blick“, Zeitstrahl, Beweiskette, Zeitanker, QR-Code zu verifile.it und ein Anhang mit jedem einzelnen erhobenen Messwert. Schriften sind eingebettet; beim Erzeugen gibt es keinen Netzwerkzugriff (Ausnahme: der optionale Kartenausschnitt, dessen Kacheln vorher geladen werden).
- **Kartenausschnitt im PDF:** Der Anhang zeigt den Standort auf einer OpenStreetMap-Karte, gestaltet wie die Kartenansicht des Windows-Prüfers (Zoomstufe 14, Markierung in der Mitte, Quellenangabe). In der App ist die Karte standardmäßig an, sobald der Standort im Bericht steht, und lässt sich abschalten; im Windows-Prüfer („Karte im PDF“) und auf der Kommandozeile (`--karte`) gibt es sie auf Wunsch. Die Kacheln werden vor dem Erzeugen geladen und, wie es die Nutzungsregeln von OpenStreetMap verlangen, sieben Tage privat zwischengespeichert; der Kartendienst sieht dabei den ungefähren Standort (auf etwa 1 km genau) und die IP-Adresse.
- **Prüfer auf dem Handy:** Eigene oder fremde ZIP-Beweispakete importieren, offline prüfen, optional online abgleichen und den PDF-Bericht teilen.
- **Kommandozeile:** `npm run verify -- paket.zip --pdf bericht.pdf` (optional `--online`, `--karte`, `--ohne-foto`, `--ohne-standort`, `--zeitzone`). Auch eine fehlgeschlagene Prüfung ergibt einen PDF-Bericht mit klarem negativem Ergebnis.
- **Windows-Prüfer 1.0.0:** PDF-Bericht, Manifest v3 und Sensorangaben; Foto und Standort im PDF abwählbar, Kartenausschnitt mit „Karte im PDF“.
- **Verteilung an Tester:** Android-APK (EAS Build, Profil `preview`) bei jedem Release-Tag, EAS Update für JavaScript-Änderungen ohne Neuinstallation, iOS-Profil für TestFlight vorbereitet.

### Verbessert und behoben

- „Foto aufnehmen“ funktioniert wieder auf Android 7 bis 9: Die dort nötige Speicherberechtigung ist nur noch bis Android 9 deklariert. Nicht genutzte Berechtigungen (Bewegungserkennung, Medienzugriff, Werbe-ID) sind entfernt; die Fotoauswahl nutzt den Android-Photo-Picker ohne Zugriff auf die ganze Galerie.
- Einheitliche Zeilenenden (`.gitattributes`): Builds unter Windows und aus GitHub Actions ergeben dieselbe Laufzeitversion, damit EAS Updates alle Installationen erreichen.
- Manifest v3 verwendet die Kanonisierung nach RFC 8785 (JSON Canonicalization Scheme) statt der locale-abhängigen Sortierung. v1 und v2 bleiben unverändert prüfbar.
- Der Prüfer begrenzt beim Entpacken die tatsächliche Datenmenge (Schutz vor ZIP-Bomben) statt nur die im ZIP behaupteten Größen und prüft CRC32 ohne vollständiges Vorab-Entpacken.
- Die Standortfreigabe wird vor dem Öffnen der Kamera eingeholt; eine Verweigerung verwirft das Foto nicht mehr, sondern wird im Manifest vermerkt.
- Netzwerkabfragen haben Zeitlimits, die auch das Lesen der Antwort abdecken; MCP-Antworten im Server-Sent-Events-Format werden gelesen.
- Ein präpariertes PNG-Foto in einem fremden Beweispaket (abgeschnittener zlib-Strom) konnte die PDF-Erzeugung endlos blockieren. PNG-Bilder werden jetzt vorab vollständig geprüft; ein solches Foto erhält im Bericht nur einen Hinweis.
- Der Windows-Release-Workflow ist tag-gesteuert und bricht bei Fehlern in PowerShell-Schritten zuverlässig ab.

## Downloads

- **Windows-Prüfer:** `DoiProof-Pruefer-1.1.0-Windows.exe` mit `SHA256SUMS.txt` (unten angehängt). Der Build ist nicht code-signiert; Hash vergleichen.
- **Android-APK:** Link im Abschnitt unten (wird vom Build-Workflow ergänzt).
- **iOS:** über TestFlight nach Einladung, siehe `docs/TESTER.md`.

## Grenzen

DoiProof belegt die Unversehrtheit des Beweispakets und – nach Online-Abgleich – seine Verankerung auf der Doichain. Gerätezeit, Standort, Sensorwerte, Kamera-Herkunft und App-Version sind Angaben des Geräts und nicht attestiert. Kein qualifizierter Zeitstempel nach eIDAS.
