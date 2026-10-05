# Review und Freigabe DoiProof 1.0.0

**Stand:** 5. Oktober 2026. **Ausgangszustand:** Commit `a4272c2` auf `main` (App 0.5.0, Windows-Prüfer 0.6.0). **Ergebnis:** Version 1.0.0 von App, Kommandozeilen-Prüfer und Windows-Prüfer.

Dieses Dokument bewertet den Ausgangszustand (Code, Tests, Sicherheit, Dokumentation, Build), listet die gefundenen Schwächen mit ihrer Behebung und benennt die verbleibenden Risiken und manuellen Schritte vor der Verteilung an Tester.

## 1. Bewertung des Ausgangszustands

| Bereich | Bewertung | Begründung |
|---|---|---|
| Architektur und Code | **gut** | Klare dreistufige Hashkette (Foto → kanonisches Manifest → versionierter, domänengetrennter Paket-Hash), lokale Sicherung vor jeder Übermittlung, Verlauf mit Backup, getrennte Statuslogik. Schwächen: Prüflogik nur als Node-Skript (App konnte sie nicht nutzen), Kanonisierung abhängig von `localeCompare`, Versionsnummer mehrfach hart kodiert. |
| Tests | **befriedigend** | 21 automatisierte Tests (Datenmodell, Vorabblöcke, ZIP-Prüfer, Desktop-Details, Karte). Keine Tests für Manifestaufbau, Online-Fehlerfälle, Größenbegrenzung oder Build-Konfiguration. |
| Sicherheit | **befriedigend** | Gute Grundhaltung: nur Hash auf der Kette, Offline-Prüfung als Standard, gehärtetes Electron (Sandbox, Kontextisolation, CSP, keine Navigation). Aber: Schutz gegen ZIP-Bomben im Prüfer unwirksam (siehe S1), Netzaufrufe ohne Zeitlimit, nicht benötigte Android-Rechte. |
| Dokumentation | **gut** | Ausführlich, ehrlich in den Aussagegrenzen (keine Attestierung, kein eIDAS-Zeitstempel). Teilweise veraltet (Versionen 0.4/0.5 gemischt), bezeichnet das öffentliche Repository als „privat“, enthält einen persönlichen Windows-Pfad. |
| Build und Auslieferung | **mangelhaft** | Kein EAS-Projekt (kein `owner`, keine `projectId`), keine iOS-Bundle-ID, kein Update-Kanal: Die App lief nur über Expo Go mit Entwicklungsrechner. Der Windows-Release-Workflow scheitert ab dem zweiten Lauf und meldet fehlgeschlagene Tests unter Umständen als grün (siehe S3). |

**Gesamturteil Ausgangszustand:** solider, sorgfältig dokumentierter MVP mit korrekter Kryptografie, aber **nicht auslieferungsreif**: keine eigenständig installierbare App, defekter Release-Workflow und eine Speicher-/DoS-Lücke beim Prüfen fremder Pakete.

## 2. Befunde und Behebung

| Nr. | Schwere | Befund im Ausgangszustand | Behebung in 1.0.0 |
|---|---|---|---|
| S1 | hoch | **ZIP-Bomben-Schutz unwirksam.** Der Prüfer verglich nur die im ZIP *behauptete* Größe (`_data.uncompressedSize`) mit den Grenzen und lud danach mit `checkCRC32: true`, was jeden Eintrag vollständig entpackt. Ein präpariertes ZIP konnte CLI und Windows-Prüfer zum Speicherüberlauf bringen. | Einträge werden gestreamt entpackt und bei Überschreiten der echten Grenze sofort abgebrochen; CRC32 wird auf den begrenzten Daten selbst geprüft (`core/verify.mjs`). Test mit gefälschten Größenangaben im zentralen Verzeichnis und lokalen Kopf. |
| S2 | mittel | **Kanonisierung locale-abhängig.** `localeCompare` sortiert je nach ICU/Engine unterschiedlich (Hermes in der App, Node im Prüfer). Für alle v1/v2-Schlüssel stimmen die Ordnungen zufällig überein, für neue Schlüssel (z. B. Groß-/Kleinschreibung) nicht. | Manifest v3 kanonisiert nach RFC 8785 (UTF-16-Code-Units). v1/v2 werden unverändert nach altem Verfahren geprüft. Test mit Schlüsseln, bei denen beide Ordnungen abweichen. |
| S3 | mittel | **Windows-Release-Workflow defekt.** Fest verdrahtetes `v0.6.0` bei jedem Push auf `main` → `gh release create` scheitert ab dem zweiten Lauf. Der PowerShell-Block `npm ci`/`npm test`/`npm run check` wertete nur den letzten Exitcode aus; rote Tests konnten unbemerkt bleiben. | Release nur bei Tag `v*`, Version aus `desktop/package.json`, Abgleich Tag ↔ Version, Einzelschritte mit eigenem Exitcode, `gh release upload --clobber`. |
| S4 | mittel | **Standortfreigabe nach der Aufnahme.** Die Berechtigung wurde erst nach dem Foto angefragt; eine Verweigerung verwarf die Aufnahme. | Freigabe wird vor dem Öffnen der Kamera eingeholt; eine Verweigerung oder ein fehlender Fix wird als Status im Manifest v3 vermerkt, das Foto bleibt erhalten. |
| S5 | mittel | **Netzaufrufe ohne Zeitlimit; SSE nicht unterstützt.** Die App wartete bei schlechtem Netz unbegrenzt; Antworten im Server-Sent-Events-Format des Streamable-HTTP-Transports wären als Fehler gewertet worden. | Gemeinsamer MCP-Client (`core/mcp.mjs`) mit Zeitlimit und SSE-Auswertung für App und Prüfer; Tests. |
| S6 | mittel | **Keine eigenständige App.** Ohne `owner`, `extra.eas.projectId`, iOS-Bundle-ID und Update-Konfiguration war weder EAS Build noch EAS Update möglich. | `app.json` mit Owner `neubuots-team`, Projekt `190b3b9c-…`, Bundle-ID `org.doichain.doiproof`, deutschen Berechtigungstexten, EAS Update und Laufzeitversion per Fingerprint; `eas.json` mit Kanälen `preview`/`production`; Workflows für APK und Updates. |
| S7 | niedrig | **Versionsnummer dreifach hart kodiert** (`0.5.0` in Manifest und Oberfläche) – die Selbstauskunft konnte vom tatsächlichen Build abweichen. | Eine Quelle (`core/version.mjs`); Test prüft Gleichstand mit `package.json`, `app.json` und Windows-Prüfer. Zusätzlich Update-Kanal, Laufzeitversion und Update-ID im Manifest v3. |
| S8 | niedrig | **DOI-Vorabblockzeit als Zeichenkette verglichen** – unterschiedliche ISO-Schreibweisen derselben Zeit hätten einen falschen „Widerspruch“ ergeben. | Vergleich der Zeitpunkte. |
| S9 | niedrig | **Nicht benötigte Rechte:** `RECORD_AUDIO` (über das Bildauswahl-Plugin), `SYSTEM_ALERT_WINDOW`, `WRITE_EXTERNAL_STORAGE`; englische iOS-Texte für „Standort immer“. | Blockiert bzw. entfernt; Konfiguration mit `expo config --type introspect` geprüft. |
| S10 | niedrig | **Desktop-Hauptprozess speicherte vom Renderer gelieferte Berichtsdaten.** | Der Hauptprozess hält das Prüfergebnis selbst, hasht die Datei vor dem PDF-Bericht erneut und verwirft geänderte Dateien. |
| S11 | niedrig | **PDF-Beleg ohne Prüfung.** Der alte App-Beleg gab gespeicherte Werte wieder, ohne das Paket nachzurechnen, und unterschied sich inhaltlich vom Prüfer. | Ersetzt durch den Prüfbericht, der das Paket mit derselben Logik wie CLI und Windows-Prüfer prüft. |
| S12 | niedrig | **Dokumentation:** Repository als „privat“ bezeichnet, persönlicher Windows-Pfad, uneinheitliche Versionsstände. | Dokumentation auf 1.0.0 aktualisiert. |
| S13 | Info | **`npm audit`:** 24 Funde (8 mittel, 16 hoch) in Expo-/React-Native-Build-Werkzeugen (`node-forge`, `uuid`, `braces` in CLI und Config-Plugins). Sie laufen nur beim Bauen, nicht in der ausgelieferten App. Der vorgeschlagene Fix (`--force`) würde auf Expo 44 zurückstufen und ist unbrauchbar. Desktop: `http-cache-semantics` in electron-builder. | Desktop per `npm audit fix` auf 0 Funde. App: beobachten und mit dem nächsten Expo-Patch aktualisieren. |

## 3. Neue Funktionen in 1.0.0 (Kurzüberblick)

- **Manifest v3 mit Sensoren:** Beschleunigung, Gyroskop, Magnetometer, Kompass (`expo-location`), Barometer (Luftdruck, iOS relative Höhe) und Licht (Android). Je Sensor Einzelwert mit Zeitstempel, Messreihe (höchstens 10 vor der Kamera, 10 während, 10 nach der Rückkehr) und Anzahl empfangener Werte. Nicht verfügbare, verweigerte oder fehlerhafte Sensoren werden mit Status und Begründung vermerkt.
- **Gemeinsamer Kern `core/`** für Kommandozeile, Windows-Prüfer und App: Prüfung, Online-Abgleich, Berichtsmodell und PDF. Der Windows-Prüfer kopiert ihn beim Build unverändert (per Test byte-genau abgesichert); die App bündelt ihn über Metro.
- **PDF-Prüfbericht** nach `docs/design/PRUEFBERICHT-DESIGN.md` mit Anhang „Alle erhobenen Messwerte“ und Anhang B mit jeder Einzelmessung. Eingebettete OFL-Schriften, kein Netzwerkzugriff.
- **Prüfer in der App:** ZIP importieren, offline prüfen, optional online abgleichen, PDF teilen.
- **Verteilung:** APK per EAS bei Release-Tag mit Downloadlink in den Release-Notes, EAS Update mit Kanälen `preview`/`production`, iOS-Profil für TestFlight ([IOS-RELEASE.md](IOS-RELEASE.md), [TESTER.md](TESTER.md)).

## 4. Prüfnachweise

| Prüfung | Ergebnis |
|---|---|
| `npm run check` (TypeScript strikt, einschließlich JSDoc-Prüfung von `core/`) | ohne Fehler |
| `npm test` | 45 Tests bestanden (Kern, Berichtsmodell, PDF, CLI, App-Manifest, Sensor-Session, Konfiguration, bisherige Tests) |
| `cd desktop && npm test` | 5 Tests bestanden (u. a. byte-gleicher Kern, PDF im Hauptprozess, Fehlbericht) |
| `npx expo export --platform android` und `--platform ios` | Bundles inklusive Kern, pdf-lib und Schriften fehlerfrei zu Hermes-Bytecode kompiliert |
| `npx expo config --type introspect` | Berechtigungen, Update-URL und Laufzeitversion wie vorgesehen |
| Laufzeittest in einer Hermes-VM (manuell) | ZIP-Prüfung v3, Berichtsmodell und PDF-Erzeugung laufen vollständig in Hermes; das erzeugte PDF ist identisch mit dem aus Node |
| Visueller Vergleich mit `Pruefbericht-Mustervorlage.pdf` | Positionen, Schriftgrößen, Farben und Radien aus der Vorlage übernommen; Seiten 1 und 2 decken sich, alle drei Ergebnisvarianten geprüft |
| Sicherheits-Scan im Test | keine Schlüssel, Token oder Signaturdateien im Repository |

## 5. Restrisiken und offene Punkte

1. **Gerätetest steht aus.** Kamera, Sensoren, Teilen-Dialog, Dateiauswahl und Updates sind nur mit Fakes und Bundles geprüft, nicht auf einem echten Android- oder iOS-Gerät. Ablauf: [ANDROID-RELEASE.md](ANDROID-RELEASE.md#gerätetest-vor-einer-freigabe).
2. **Android pausiert Sensoren der App, solange die System-Kamera geöffnet ist** (Verhalten von `expo-sensors`). Die Messreihe liegt daher unmittelbar vor dem Öffnen und nach der Rückkehr aus der Kamera; iOS liefert auch während der Aufnahme. Bericht und Anhang weisen die Phase jeder Messung aus.
3. **Erster EAS-Build:** In dieser Umgebung war `api.expo.dev` nicht erreichbar; die Workflows sind daher nicht gegen Expo ausgeführt. Falls der Robot-Nutzer (Rolle Developer) keinen Android-Keystore anlegen darf, einmalig lokal `npx eas-cli credentials -p android` mit einem Owner-/Admin-Login ausführen ([ANDROID-RELEASE.md](ANDROID-RELEASE.md)).
4. **iOS** benötigt einmalige Schritte mit dem Apple-Login ([IOS-RELEASE.md](IOS-RELEASE.md)).
5. **Fingerprint-Laufzeitversion:** Updates erreichen nur Builds mit identischem nativen Fingerprint. Weicht der in GitHub Actions berechnete Fingerprint von dem des EAS-Builds ab, kommt ein Update nicht an; prüfen mit `npx expo-updates fingerprint:generate` bzw. auf der Expo-Update-Seite.
6. **Keine Attestierung:** App-Version, Commit, Gerätezeit, Standort und Sensorwerte sind Selbstauskünfte. Play Integrity/App Attest und eine signierte Server-Challenge bleiben offen (Issues #6 und #7).
7. **Windows-EXE nicht code-signiert** (SmartScreen-Warnung); SHA-256-Summe im Release.
8. **Build-Werkzeug-Funde aus `npm audit`** (S13) bis zum nächsten Expo-Patch.

## 6. Freigabeempfehlung

Freigabe von **1.0.0 für den Testerkreis** (internes APK, TestFlight) nach erfolgreichem CI-Lauf und dem manuellen Gerätetest aus Abschnitt 5, Punkt 1. Eine öffentliche Store-Veröffentlichung sollte erst nach dem Gerätetest auf mindestens einem Android- und einem iOS-Gerät sowie nach Klärung der Datenschutzangaben im App Store erfolgen.
