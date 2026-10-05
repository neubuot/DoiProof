# Architektur

**Stand:** DoiProof 1.0.0.

## Ziel

DoiProof bindet ein Foto und die bei der Aufnahme gemessenen Angaben (Zeit, Standort, Sensorwerte, Vorabblöcke) kryptografisch zu einem Beweispaket und verankert ausschließlich dessen SHA-256-Fingerabdruck auf der Doichain. Dieselbe Prüf- und Berichtslogik läuft in der App, im Kommandozeilenprogramm und im Windows-Prüfer.

## Bausteine

```text
core/                    Plattformneutraler Kern (ESM-JavaScript, JSDoc-typisiert)
  util.mjs               Hex, strikte UTF-8-Kodierung, fetch mit Zeitlimit
  canonical.mjs          Kanonisches JSON (v1/v2 localeCompare, v3 RFC 8785)
  manifest.mjs           Manifestversionen, Paket-Hash, Strukturprüfung
  sensors.mjs            Sensordefinitionen, SensorCollector, Prüfung, Statistik
  image.mjs              Bildformat, Abmessungen, ausgewählte EXIF-Felder
  mcp.mjs                Doichain-MCP-Client (JSON und Server-Sent Events)
  verify.mjs             ZIP-Analyse mit Entpackgrenzen, Online-Abgleich
  bundle.mjs             Erzeugung des ZIP-Beweispakets
  report-model.mjs       Berichtsmodell (alle Aussagen und Tabellen)
  report-pdf.mjs         PDF nach Designvorlage (pdf-lib, fontkit, QR)
  report-text.mjs        Markdown-Kurzbericht
  pipeline.mjs           gemeinsamer Ablauf: prüfen → online → PDF
  node.mjs               Node-Adapter (SHA-256, Schriften, IANA-Zeitzone)
  version.mjs            gemeinsame Versionsnummer
assets/fonts/            Eingebettete OFL-Schriften (Fraunces, IBM Plex)
App.tsx                  Umschalter „Aufnehmen“ / „Prüfen“
src/screens/             Aufnahme mit Verlauf; Prüfer
src/components/          Ergebniskarte (nutzt das Berichtsmodell), Info/Updates
src/evidence*.ts         Manifest-v3-Aufbau (rein) und Geräteanbindung
src/sensorSession.ts     Sensorablauf (rein, testbar); src/sensors.ts: expo-sensors
src/verifier.ts          ZIP-Import, Prüfung, PDF-Teilen in der App
src/platform.ts          App-Adapter: SHA-256 (expo-crypto), Schriften (expo-asset)
src/doichain.ts, chainAnchors.ts, history.ts, proofRecord.ts, bundle.ts
scripts/verify.mjs       Kommandozeilen-Prüfer
desktop/                 Windows-Prüfer (Electron); kopiert core/ und Schriften beim Build
```

Plattformabhängig sind nur Adapter: SHA-256 (`node:crypto` bzw. `expo-crypto`), Laden der Schriften (Dateisystem bzw. App-Bundle), `fetch` und die Zeitzone. Der Kern verwendet weder `Buffer` noch `TextDecoder` oder `AbortSignal.timeout`, damit er unverändert in Hermes läuft. Ein Test stellt sicher, dass der Windows-Prüfer byte-genau dieselben Kerndateien und Schriften ausliefert.

## Datenfluss bei der Aufnahme

1. Die Person wählt ein Metadatenprofil („Privat“, „Standort & Sensoren“, „Individuell“).
2. Vor dem Öffnen der Kamera holt die App die **Standortfreigabe** ein (falls gewählt) und startet die **Sensor-Session**: Beschleunigung, Gyroskop, Magnetometer, Barometer und Licht über `expo-sensors` im Abstand von 200 ms, der Kompass über `expo-location`. Verfügbarkeit und Berechtigung werden je Sensor geprüft; nicht verfügbare, verweigerte oder fehlerhafte Sensoren erhalten einen Status mit Begründung.
3. Parallel lädt die App die Vorabblöcke (BTC-Tip bei Blockstream, DOI-Tip beim MCP-Dienst) und wartet kurz auf erste Sensorwerte. Bei Fehlern öffnet sich die Kamera im Vorabmodus nicht.
4. Kamera öffnen (Zeitpunkt wird vermerkt), Foto aufnehmen, Rückkehr (Aufnahmezeit laut Gerät). Android pausiert die Sensoren der App, solange die System-Kamera im Vordergrund ist; iOS liefert weiter.
5. Die App hasht die gelieferten Bilddateibytes, misst den Standort (Zeitlimit 20 s), sammelt noch 1,2 s Sensorwerte und beendet die Session.
6. Manifest v3 wird aufgebaut, nach RFC 8785 kanonisiert und gehasht; der Paket-Hash bindet Foto- und Manifest-Hash.
7. Foto und Manifest werden im privaten App-Verzeichnis gesichert, bevor ein Netzaufruf erfolgt (Status `local`).
8. `anchor_proof` beim MCP-Dienst übermittelt nur den Paket-Hash und eine kurze Notiz mit der Gerätezeit. `check_proof`, `get_transaction` und `get_block` aktualisieren später den Status.
9. Export: ZIP mit `original.<endung>`, `manifest.json`, `verification.json`, `README.txt`; PDF-Prüfbericht über den gemeinsamen Kern.

## Manifest v3

`schema` = `org.doichain.doiproof.evidence/v3`. Felder (`?` = optional):

| Feld | Inhalt |
|---|---|
| `createdAt` | Erstellungszeit des Manifests (Gerät, ISO 8601) |
| `profile` | `private`, `location` (Anzeige „Standort & Sensoren“) oder `custom` |
| `preCapture?` | `bitcoin`/`doichain`: `chain`, `height`, `hash`, `headerTimeUtc`, `observedAtDeviceUtc`, `source` – nur bei Kameraaufnahmen |
| `app` | `version`, `sourceCommit?`, `identification: "self-reported-unattested"`, `update?` (`channel`, `runtimeVersion`, `updateId`, `embedded`) |
| `photo` | `sha256`; bei aktivierten Bilddetails `width`, `height`, `fileSize`, `mimeType`, `fileName` |
| `capture` | `source` (`camera`/`library`), `deviceTime?` (Rückkehr aus der Kamera), `cameraOpenedAt?` |
| `location` | `status`: `recorded`, `not_requested`, `permission_denied`, `unavailable` oder `error`; bei `recorded` zusätzlich `latitude`, `longitude`, `altitude`, `accuracy`, `altitudeAccuracy`, `heading`, `speed`, `measuredAt`, `mocked`; sonst optional `reason` |
| `sensors` | `window` (`startedAt`, `cameraOpenedAt`, `cameraReturnedAt`, `endedAt`, `intervalMs`, `platform`) und je Sensor `accelerometer`, `gyroscope`, `magnetometer`, `compass`, `barometer`, `light` ein Eintrag |
| `device?` | `platform`, `osVersion`, `appVersion`, `model?` (Android) |

Sensoreintrag: `status` (`recorded`, `not_requested`, `unavailable`, `permission_denied`, `no_data`, `error`), `source`, bei `recorded` `units`, `received` (Anzahl empfangener Werte), `reading` (Einzelwert zur Aufnahme mit `at`) und `series` (höchstens 10 Werte vor der Kamera, 10 bei geöffneter Kamera, 10 nach der Rückkehr, jeweils mit `at`), sonst `reason`. Werte sind auf sechs Nachkommastellen gerundet; nicht gemeldete Werte sind `null`.

| Sensor | Felder und Einheiten |
|---|---|
| `accelerometer` | `x`, `y`, `z` in g |
| `gyroscope` | `x`, `y`, `z` in rad/s |
| `magnetometer` | `x`, `y`, `z` in µT |
| `compass` | `magHeading`, `trueHeading` (null ohne Standortfreigabe) in Grad, `accuracy` (Kalibrierstufe 0–3) |
| `barometer` | `pressure` in hPa, `relativeAltitude` in m (nur iOS) |
| `light` | `illuminance` in lx (nur Android) |

Abgeleitete Werte im Bericht (Beträge, barometrische Höhe nach Normatmosphäre, Höhenänderung) sind als „berechnet“ gekennzeichnet und nicht Teil des Manifests.

## Prüfung und Bericht

- `analyzeBundle` liefert für jeden Prüfschritt (ZIP, Aufbau, Foto, Manifest, Paket-Hash) einen Status statt beim ersten Fehler abzubrechen. So entsteht auch für ein verändertes Paket ein Bericht mit markierter Bruchstelle.
- Entpackt wird schrittweise mit harten Grenzen; CRC32 wird auf den begrenzten Daten geprüft.
- `checkOnline` fragt Transaktion, Block und Vorabblöcke ab; jeder Aufruf hat ein Zeitlimit.
- `buildReportModel` erzeugt alle Aussagen (Ergebnis, „Auf einen Blick“, Zeitstrahl, Kacheln, Beweiskette, Anhang). Die App zeigt dieselben Aussagen in der Ergebniskarte an.
- `renderReportPdf` setzt das Modell mit pdf-lib nach den Koordinaten der Mustervorlage um. Fotos (JPEG, PNG) werden unverändert eingebettet und gemäß EXIF-Ausrichtung gedreht; andere Formate erhalten einen Platzhalter.

## Build, Updates und Releases

- **EAS Build:** Profil `preview` (APK, interne Verteilung, Kanal `preview`) und `production` (AAB bzw. iOS App Store/TestFlight, Kanal `production`). Versionscodes verwaltet EAS (`appVersionSource: remote`).
- **EAS Update:** `runtimeVersion.policy = fingerprint`. Native Änderungen ergeben eine neue Laufzeitversion; nur passende Builds laden ein Update.
- **GitHub Actions:** `ci.yml` (Typen, Tests, Beispielbericht, Android-/iOS-Bundle, Desktop-Logik), `android-apk.yml` (APK bei Tag, Link in Release-Notes), `eas-update.yml` (JS-Updates), `desktop-windows.yml` (portable EXE, Release bei Tag).

## Datenschutz und Vertrauensgrenzen

- Foto, Standort und Sensorwerte werden nicht an den MCP-Dienst übertragen; öffentlich verankert wird ausschließlich der Paket-Hash. Die kurze Notiz mit der Gerätezeit ist öffentlich.
- Standort und Sensoren werden nur nach sichtbarer Profilwahl und Systemfreigabe erfasst. Im Profil „Privat“ vermerkt das Manifest ausdrücklich, dass nichts angefordert wurde.
- Der Hash kann eine bekannte Datei wiedererkennbar machen und ist deshalb nicht in jedem Kontext anonym.
- Gerätezeit, Abfragezeiten, Standort, Sensorwerte, App-Version und Commit sind **nicht attestierte Selbstauskünfte**. Ein manipuliertes Gerät kann sie fälschen; ein altes Foto kann erneut verwendet werden. Vorabblöcke belegen nur, dass das **Paket** nach ihrer Entstehung erzeugt wurde. BTC und Doichain sind wegen Merged Mining nicht vollständig unabhängig.
- API-Schlüssel bleiben nur im flüchtigen App-Zustand. Signaturschlüssel und Tokens liegen ausschließlich in Expo bzw. GitHub-Secrets.
- Der Windows-Prüfer lädt keine Webseiten, isoliert den Renderer und erzeugt Berichte im Hauptprozess aus der erneut gehashten Datei.

## Aktuelle Einschränkungen

- Der Verlauf ist an die App-Installation gebunden und wird nicht synchronisiert.
- Keine Geräte- oder App-Attestierung (Play Integrity, App Attest; Issue #6) und keine signierte Server-Challenge (Issue #7).
- Keine automatisierten UI-Tests auf Geräten; die Gerätelogik ist mit simulierten Sensoren getestet.
