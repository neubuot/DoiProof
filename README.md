# DoiProof

DoiProof ist eine Android- und iOS-App (Expo/React Native), die ein Foto und die bei der Aufnahme gemessenen Angaben – Gerätezeit, Vorabblöcke von Bitcoin und Doichain, optional Standort sowie Bewegungs-, Kompass-, Luftdruck- und Lichtsensoren – lokal zu einem kryptografisch gebundenen Beweispaket verbindet. Auf der Doichain wird ausschließlich dessen SHA-256-Hash als Proof of Existence verankert.

**Version 1.0.0.** App, Kommandozeilen-Prüfer und Windows-Prüfer nutzen denselben Prüf- und Berichtskern und erzeugen denselben PDF-Prüfbericht.

## Dokumentation

| Dokument | Für wen und wofür |
|---|---|
| [Produktbeschreibung und Beweiskette](docs/PRODUKT-UND-BEWEISKETTE.md) | Nutzer, Prüfer, Versicherungen und Gerichte: Aussagekraft, Grenzen und Anwendungsfälle |
| [Kurzanleitung](docs/KURZANLEITUNG.md) | Erste Aufnahme, Einreichung, Prüfung und Weitergabe |
| [Erster Test](docs/ERSTER-TEST.md) | Projektinhaber: Schritt für Schritt vom ersten APK bis zur Gegenprüfung auf Handy und Windows, mit Prompts für Claude |
| [Ausführliches Benutzerhandbuch](docs/BENUTZERHANDBUCH.md) | Profile, Sensoren, Status, Prüfbericht, Prüfer und Fehlerfälle |
| [Anleitung für Tester](docs/TESTER.md) | Android-APK installieren, TestFlight-Einladung, Feedback |
| [ZIP unabhängig prüfen](docs/PRUEFPROGRAMM.md) | Kommandozeilen-Prüfer, PDF-Bericht, Hashverfahren |
| [Windows-Prüfer](docs/DESKTOP-PRUEFER.md) | Portable EXE mit Oberfläche |
| [Technische Architektur](docs/ARCHITECTURE.md) | Bausteine, Datenfluss, Manifest v3, Sicherheitsgrenzen |
| [Android-Build und Gerätetest](docs/ANDROID-RELEASE.md) | EAS Build, Release-Tag, EAS Update, Testablauf |
| [iOS-Release über TestFlight](docs/IOS-RELEASE.md) | Einmalige Schritte mit dem Apple-Login |
| [Review 1.0](docs/REVIEW-1.0.md) | Bewertung des Ausgangszustands, Befunde, Restrisiken |
| [Release-Notes](RELEASE_NOTES.md) | Änderungen in 1.0.0 |
| [Designvorlage Prüfbericht](docs/design/PRUEFBERICHT-DESIGN.md) | Verbindliche Gestaltung des PDF-Berichts |

Diese Dokumente sind Teil des Git-Verlaufs. Änderungen an Bedienung, Manifest, Verankerung oder Export passen die betroffenen Abschnitte im selben Pull Request an.

## Funktionen

- Foto aufnehmen oder auswählen; SHA-256 der Dateibytes lokal berechnen.
- Metadatenprofile „Privat“, „Standort & Sensoren“ und „Individuell“.
- **Sensoren während der Aufnahme** (Manifest v3): Beschleunigung, Gyroskop, Magnetometer, Kompass, Barometer (Luftdruck, auf iOS relative Höhe) und – wo verfügbar – Licht. Einzelwert mit Zeitstempel und kurze Messreihe je Sensor; nicht verfügbare oder verweigerte Sensoren werden ausdrücklich vermerkt.
- Vor dem Kamerastart aktuelle BTC- und DOI-Blöcke ins Manifest aufnehmen (Vorabblöcke).
- Verankerung ohne Schlüssel über den [Doichain-MCP-Server](https://doi-api.sendlabs.de/mcp) (`anchor_proof`), Status mit `check_proof`; kostenloses Tageskontingent (`get_anchoring_quota`).
- Lokale Sicherung von Original und Manifest vor dem Senden; Verlauf mit automatischer Statusaktualisierung.
- **PDF-Prüfbericht** nach Designvorlage mit Anhang aller erhobenen Messwerte, auf Wunsch mit Kartenausschnitt (OpenStreetMap) wie im Windows-Prüfer; ZIP-Beweispaket zum Teilen.
- **Prüfer in der App:** eigene oder fremde ZIPs importieren, offline prüfen, optional online abgleichen, Bericht teilen.
- Eigenständige Builds (EAS) mit Over-the-Air-Updates für JavaScript-Änderungen.

## Datenschutz

Übertragen werden nur der Beweispaket-Hash und eine kurze, als Geräteangabe gekennzeichnete Aufnahmezeit; für Vorabblöcke und Online-Prüfungen werden öffentliche Blockdaten abgefragt. Foto, Standort und Sensorwerte bleiben auf dem Gerät und im bewusst geteilten ZIP bzw. PDF. Nur wenn ein Kartenausschnitt für den PDF-Bericht ausdrücklich gewünscht ist, werden Kartenkacheln bei OpenStreetMap abgerufen; der Kartendienst sieht dabei den ungefähren Standort und die IP-Adresse. Im Profil „Privat“ werden weder Standort noch Sensoren erfasst. Ein Hash beweist, dass dieselben Bytes vorlagen; er beweist weder Urheberschaft noch Echtheit des Motivs oder eine verlässliche Aufnahmezeit. Gerätezeit, Standort, Sensorwerte und App-Version sind nicht attestierte Selbstauskünfte. Einzelheiten: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Installation

- **Tester:** Android-APK aus den [Releases](https://github.com/neubuot/DoiProof/releases), iPhone über TestFlight – siehe [docs/TESTER.md](docs/TESTER.md).
- **Windows-Prüfer:** `DoiProof-Pruefer-1.0.0-Windows.exe` aus den Releases – siehe [docs/DESKTOP-PRUEFER.md](docs/DESKTOP-PRUEFER.md).

## Entwicklung

Voraussetzungen: aktuelle Node.js-LTS-Version und npm; für die App zusätzlich Expo Go auf einem Testgerät.

```sh
git clone https://github.com/neubuot/DoiProof.git
cd DoiProof
npm ci
npm run check
npm test
npm start            # Expo-Entwicklungsserver, QR-Code mit Expo Go öffnen
```

Bei Verbindungsproblemen zwischen Gerät und Rechner: `npm start -- --tunnel`.

| Befehl | Zweck |
|---|---|
| `npm start` | Expo-Entwicklungsserver (trägt den Git-Commit als Selbstauskunft ein) |
| `npm run check` | TypeScript-Prüfung (App und JSDoc-typisierter Kern) |
| `npm test` | Automatisierte Tests (Kern, Bericht, PDF, App-Logik, Konfiguration) |
| `npm run verify -- paket.zip [--online] [--pdf bericht.pdf [--karte]]` | ZIP prüfen, optional online abgleichen und PDF-Bericht erzeugen (mit `--karte` inklusive Kartenausschnitt) |
| `cd desktop && npm ci && npm test` | Tests des Windows-Prüfers |
| `npx eas-cli build -p android --profile preview` | Signiertes Test-APK (siehe [ANDROID-RELEASE.md](docs/ANDROID-RELEASE.md)) |

## Projektstruktur

```text
App.tsx                 Umschalter „Aufnehmen“ / „Prüfen“
src/screens/            Aufnahme mit Verlauf; Prüfer
src/components/         Ergebniskarte, Info und Updates
src/evidence*.ts        Manifest v3 (Aufbau und Geräteanbindung)
src/sensor*.ts          Sensorerfassung (expo-sensors, Kompass)
src/verifier.ts         ZIP-Import, Prüfung, PDF in der App
src/doichain.ts         Doichain-Aufrufe der App
core/                   Gemeinsamer Prüf- und Berichtskern (App, CLI, Windows)
assets/fonts/           Eingebettete Berichtsschriften (OFL)
scripts/verify.mjs      Kommandozeilen-Prüfer
scripts/release-notes.mjs  Expo-Downloadlink in Release-Notes
desktop/                Windows-Prüfer (Electron)
docs/                   Dokumentation, Designvorlage, Review
.github/workflows/      CI, Android-APK, EAS Update, Windows-Prüfer
```

## Beweispaket

Das Paket bindet drei Hashwerte: Foto, kanonisches Manifest und den versionierten Paket-Hash `SHA-256("DoiProof:v3\nphoto:<FOTO>\nmanifest:<MANIFEST>")`. Neue Pakete verwenden Manifest v3 mit Kanonisierung nach RFC 8785; v1 und v2 bleiben nach ihrem Verfahren prüfbar. Vorabblöcke werden nur bei neuen Kameraaufnahmen abgefragt (BTC über die Blockstream-Esplora-API, DOI über `get_chain_status`). Blockzeiten und Gerätezeiten sind keine sekundengenauen Uhren; ein bereits vorhandenes Foto kann nach dem Abruf erneut eingebunden werden. Details: [docs/PRUEFPROGRAMM.md](docs/PRUEFPROGRAMM.md).

## MCP und REST

Der MCP-Server unter `https://doi-api.sendlabs.de/mcp` ist ein zustandsloser Streamable-HTTP-Dienst; DoiProof ruft seine Werkzeuge per JSON-RPC auf (Antworten als JSON oder Server-Sent Events, mit Zeitlimit). Der Server nutzt intern die [Doichain-REST-API](https://doi-api.sendlabs.de/docs). Das kostenlose Kontingent wird der vom Server gesehenen IP-Adresse zugerechnet; die Rücksetzung erfolgt um 00:00 UTC.

## Sicherheit

**Keinen Admin-Schlüssel in die App eintragen.** Ein optionaler PoE- oder Write-Schlüssel bleibt nur im flüchtigen App-Zustand. Das Repository ist öffentlich: Signaturschlüssel, Expo- und Apple-Zugangsdaten liegen ausschließlich in Expo bzw. als GitHub-Secret (`EXPO_TOKEN`). Ein Test prüft, dass keine Schlüssel- oder Signaturdateien eingecheckt sind. Sicherheitsmeldungen nach [SECURITY.md](SECURITY.md).

## Entwicklung und Beiträge

Änderungen entstehen auf Feature-Branches, werden per Pull Request geprüft und nach erfolgreicher CI bevorzugt per Squash Merge übernommen. Details: [CONTRIBUTING.md](CONTRIBUTING.md).

## Nächste Schritte

- Gerätetest auf Android und iOS vor breiterer Verteilung ([Review 1.0](docs/REVIEW-1.0.md)).
- App-/Geräteattestierung (Play Integrity, App Attest; [#6](https://github.com/neubuot/DoiProof/issues/6)) und signierte Server-Challenge ([#7](https://github.com/neubuot/DoiProof/issues/7)).
- Code-Signing für den Windows-Prüfer.
- Optional: ZIP-Pakete per „Öffnen mit“ direkt an die App übergeben.

## Lizenz

DoiProof ist unter der [MIT-Lizenz](LICENSE) veröffentlicht. Copyright © 2026 Ottmar Neuburger. Die eingebetteten Schriften stehen unter der SIL Open Font License ([assets/fonts](assets/fonts/README.md)).
