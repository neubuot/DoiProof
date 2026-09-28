# DoiProof

DoiProof ist eine Android- und iOS-App auf Basis von Expo und React Native. Sie erstellt lokal ein kryptografisch gebundenes Beweispaket aus Originalfoto und optionalen Metadaten und verankert ausschließlich dessen SHA-256-Hash als Proof of Existence auf der Doichain.

> **Version 0.4:** Vor einer Kameraaufnahme werden BTC- und Doichain-Vorabblöcke erfasst. Diese Erweiterung benötigt noch einen Gerätetest. Die API kann eine Einreichung zunächst als `pending` melden; belastbar bestätigt ist sie erst nach Aufnahme in einen Block.

## Dokumentation

| Dokument | Für wen und wofür |
|---|---|
| [Produktbeschreibung und Beweiskette](docs/PRODUKT-UND-BEWEISKETTE.md) | Nutzer, Prüfer, Versicherungen und Gerichte: Aussagekraft, Grenzen und Anwendungsfälle |
| [Kurzanleitung](docs/KURZANLEITUNG.md) | Erste Aufnahme, Einreichung und sichere Weitergabe |
| [Ausführliches Benutzerhandbuch](docs/BENUTZERHANDBUCH.md) | Alle Einstellungen, Status, Export und Fehlerfälle |
| [Technische Architektur](docs/ARCHITECTURE.md) | Datenmodell, Implementierung und Sicherheitsgrenzen |
| [ZIP unabhängig prüfen](docs/PRUEFPROGRAMM.md) | Prüfbefehl, Bericht und Onlineprüfung ohne DoiProof-App |
| [Windows-Prüfer mit Oberfläche](docs/DESKTOP-PRUEFER.md) | Portable EXE herunterladen und Beweispakete per Dialog prüfen |

Diese Dokumente gehören zum Git-Verlauf. Bei Änderungen an Bedienung, Manifest, Verankerung oder Export werden die betroffenen Abschnitte im selben Pull Request angepasst; die Beschreibung nennt ihren dokumentierten Versionsstand.

## Funktionen

- Foto aufnehmen oder vorhandenes Bild auswählen.
- SHA-256 der ausgewählten Dateibytes lokal berechnen.
- Standardmäßig ohne Schlüssel über den [Doichain-MCP-Server](https://doi-api.sendlabs.de/mcp) mit `anchor_proof` verankern.
- Kettenstatus mit `check_proof` prüfen.
- Kostenloses Tageskontingent mit `get_anchoring_quota` anzeigen: bis zu 10 Nachweise je IP-Adresse und UTC-Tag sowie insgesamt höchstens 200 täglich.
- Optional einen eigenen PoE- oder Write-Schlüssel ausschließlich für die aktuelle App-Sitzung verwenden.
- Bei Kameraaufnahmen optional sofort senden.
- Nachweise dauerhaft und ausschließlich lokal auf dem Gerät speichern.
- Ausstehende Nachweise beim App-Start, bei Rückkehr in die App und während der Nutzung automatisch aktualisieren.
- Einen nachvollziehbaren PDF-Beleg erstellen und über den Systemdialog teilen.
- Zwischen den Profilen „Privat“, „Standortnachweis“ und „Individuell“ wählen.
- Optional GPS-Position, Höhe, Genauigkeit, Richtung, Geschwindigkeit, Bilddaten und Geräteangaben kryptografisch an den Nachweis binden.
- Ein vollständiges ZIP-Beweispaket mit Originalfoto, kanonischem Manifest, Verifikationsdaten und Prüfanleitung exportieren.
- Vor dem Kamerastart aktuelle BTC- und DOI-Blockhöhe, -Hash, Blockzeit und lokale Abfragezeit ins neue Manifest v2 aufnehmen; bei Fehler abbrechen oder den Modus sichtbar ausschalten.
- App-Version und bei Start über `npm start` den Git-Commit als **nicht attestierte Selbstauskunft** im Manifest erfassen.

## Datenschutz

Die Bilddatei wird nicht hochgeladen. Übertragen werden nur:

- der SHA-256-Hash;
- optional eine ausdrücklich als Geräteangabe gekennzeichnete Aufnahmezeit.

Im Profil „Privat“ werden keine GPS-Daten angefordert. Standort- und weitere Metadaten werden nur nach sichtbarer Auswahl und erforderlicher Betriebssystemfreigabe erfasst. Ein Hash beweist, dass dieselben Dateibytes vorlagen; er beweist weder Urheberschaft noch Echtheit des Motivs oder eine verlässliche Aufnahmezeit. Weitere Einzelheiten stehen in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Schnellstart

Für die Prüfung exportierter ZIPs unter Windows gibt es zusätzlich die portable [DoiProof-Prüfer-EXE in GitHub Releases](https://github.com/neubuot/DoiProof/releases). Sie bietet dieselbe Hashprüfung wie `npm run verify` mit grafischer Oberfläche. Der erste Build trägt die eigene Prüfer-Version 0.5.0; die Handy-App bleibt bei Version 0.4.0. Einzelheiten und Vertrauensgrenzen: [Desktop-Anleitung](docs/DESKTOP-PRUEFER.md).

Voraussetzungen:

- aktuelle Node.js-LTS-Version;
- npm;
- Expo Go auf dem Testgerät.

```sh
git clone https://github.com/neubuot/DoiProof.git
cd DoiProof
npm ci
npm run check
npm start
```

Den anschließend angezeigten QR-Code mit Expo Go öffnen. Falls Mobilgerät und Notebook nicht zuverlässig direkt miteinander kommunizieren können:

```sh
npm start -- --tunnel
```

## Befehle

| Befehl | Zweck |
|---|---|
| `npm start` | Expo-Entwicklungsserver starten |
| `npm run android` | Android-Start anfordern |
| `npm run ios` | iOS-Start anfordern |
| `npm run check` | TypeScript ohne Build prüfen |
| `npm test` | Automatisierte Modelltests ausführen |
| `npm ci` | Abhängigkeiten reproduzierbar aus dem Lockfile installieren |
| `npm run verify -- paket.zip` | ZIP ohne Netzwerk lokal prüfen; optional mit `--online` |

## Projektstruktur

```text
App.tsx                 Oberfläche, Bildauswahl und lokales Hashing
src/doichain.ts         Typisierter Doichain-MCP-Client
src/evidence.ts         Kanonisches Manifest und Beweispaket-Hash
src/bundle.ts           Lokale Originalsicherung und ZIP-Export
src/history.ts          Lokale Speicherung des Nachweisverlaufs
src/proofRecord.ts      Datenmodell und Statuslogik
src/receipt.ts          Erzeugung und Teilen des PDF-Belegs
app.json                Expo-Konfiguration und Berechtigungstexte
docs/ARCHITECTURE.md    Datenfluss und Sicherheitsgrenzen
docs/PRODUKT-UND-BEWEISKETTE.md  Zweck und Beweisaussagen
docs/KURZANLEITUNG.md    Erste Schritte
docs/BENUTZERHANDBUCH.md  Bedienung und Prüfung
docs/PRUEFPROGRAMM.md     Unabhängiger ZIP-Prüfer
scripts/verify.mjs        Prüfprogramm für Node.js
CONTRIBUTING.md         Entwicklungs- und Git-Workflow
SECURITY.md             Richtlinie für Sicherheitsmeldungen
```

## Beweispaket und Offenlegung

DoiProof berechnet getrennt den SHA-256 des Originalfotos und des kanonischen Metadaten-Manifests. Der auf Doichain verankerte Beweispaket-Hash bindet beide Werte über eine versionierte, domänenspezifische Zeichenfolge. Dadurch bleiben ältere Nachweise unterscheidbar und neue Pakete reproduzierbar prüfbar.

Neue Pakete verwenden `org.doichain.doiproof.evidence/v2` und `DoiProof:v2\nphoto:<PHOTO_HASH>\nmanifest:<MANIFEST_HASH>`. Alte v1-Pakete bleiben anhand ihres Manifests nach dem v1-Verfahren prüfbar. Die Vorabblöcke werden nur bei einer **neuen Kameraaufnahme** abgerufen. Bei bereits vorhandenen Bildern gibt es keine nachträglich behauptete Vorabaufnahme. Der BTC-Block wird über die öffentliche Blockstream-Esplora-API gelesen, der DOI-Block über das MCP-Werkzeug `get_chain_status`. Eine Netzstörung stoppt diesen Ablauf; die Person kann den Vorabmodus ausdrücklich deaktivieren.

Block-Headerzeiten und Gerätezeiten sind nicht sekundengenau vertrauenswürdig. Die im Manifest stehenden Abfragezeiten und die App-/Commit-Angaben sind **Selbstauskünfte**, keine Attestierung. Die Blockchain-Hashes sind unabhängig nachprüfbar, aber ein bereits vorhandenes Foto kann nach dem Abruf erneut eingebunden werden. Eine signierte, kurzlebige Server-Challenge erfordert einen zusätzlichen Backend-Endpunkt und ist noch nicht aktiv.

Rohdaten einschließlich GPS und Originalfoto bleiben im privaten App-Verzeichnis. Auf die Blockchain gelangen nur der Beweispaket-Hash und eine kurze Kennzeichnung. Der PDF-Export kann sensible Standortdaten ausblenden; das vollständige ZIP enthält bewusst Original und Manifest und sollte nur an vertrauenswürdige Empfänger weitergegeben werden.

Satelliten-Einzeldaten sind über die gemeinsame Android-/iOS-Schnittstelle nicht zuverlässig verfügbar und gehören deshalb noch nicht zum portablen Schema.

## MCP und REST

Der MCP-Server unter `https://doi-api.sendlabs.de/mcp` ist ein zustandsloser Streamable-HTTP-Dienst. DoiProof ruft seine Werkzeuge per JSON-RPC auf. Der Server nutzt intern die [Doichain-REST-API](https://doi-api.sendlabs.de/docs) und seinen öffentlichen PoE-Schlüssel.

Die direkte REST-Route `POST /v1/poe` benötigt dagegen einen Schlüssel. Für die kostenlose Nutzung vom Mobilgerät ist MCP vorgesehen; das Kontingent wird der vom Server sichtbaren IP-Adresse zugerechnet. Geräte hinter demselben Anschluss sowie Geräte über denselben VPN oder Proxy teilen dieses Kontingent. Die Rücksetzung erfolgt um 00:00 UTC.

## Sicherheit

**Keinen Admin-Schlüssel in die App eintragen.** Ein optionaler PoE- oder Write-Schlüssel bleibt nur im flüchtigen App-Zustand. Für einen kommerziellen Betrieb mit Benutzerkonten muss die Schlüsselverwaltung in einen abgesicherten Backend-Dienst verlagert werden.

Das Repository ignoriert `.env*`-Dateien. Sicherheitsmeldungen bitte nach [SECURITY.md](SECURITY.md) behandeln.

## Entwicklung und Beiträge

Änderungen werden auf Feature-Branches entwickelt, durch einen Pull Request geprüft und nach erfolgreicher CI bevorzugt per Squash Merge in `main` übernommen. Details und Checkliste: [CONTRIBUTING.md](CONTRIBUTING.md).

## Nächste Schritte

- Integrationstests für den MCP-Client ergänzen.
- UI-Tests für Kamera, Verlauf und Export ergänzen.
- Optionales Löschen und Exportieren des gesamten lokalen Verlaufs ergänzen.
- Serverseitig signierte Empfangsbestätigungen und Geräte-Attestierung prüfen.
- Plattformabhängige GNSS-/Satellitendetails als optionale Erweiterung evaluieren.
- Android- und iOS-Release-Builds mit EAS Build einrichten.
- Serverseitig signierte Einmal-Challenge vor dem Kamerastart mit Verifikationsschlüssel, Ablaufzeit und Replay-Schutz ergänzen.

## Lizenz

DoiProof ist unter der [MIT-Lizenz](LICENSE) veröffentlicht. Copyright © 2026 Ottmar Neuburger.
