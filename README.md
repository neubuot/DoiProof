# DoiProof

DoiProof ist eine Android- und iOS-App auf Basis von Expo und React Native. Sie berechnet den SHA-256-Hash einer Fotodatei lokal auf dem Gerät und verankert den Hash als Proof of Existence auf der Doichain.

> **MVP-Status:** Die Kernfunktion wurde auf einem realen Android-Gerät erfolgreich getestet. Die API kann eine Einreichung zunächst als `pending` melden; belastbar bestätigt ist sie erst nach Aufnahme in einen Block.

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

## Datenschutz

Die Bilddatei wird nicht hochgeladen. Übertragen werden nur:

- der SHA-256-Hash;
- optional eine ausdrücklich als Geräteangabe gekennzeichnete Aufnahmezeit.

GPS- und EXIF-Daten werden nicht angefordert. Ein Hash beweist, dass dieselben Dateibytes vorlagen; er beweist weder Urheberschaft noch Echtheit des Motivs oder eine verlässliche Aufnahmezeit. Weitere Einzelheiten stehen in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Schnellstart

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
npx expo start --tunnel
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

## Projektstruktur

```text
App.tsx                 Oberfläche, Bildauswahl und lokales Hashing
src/doichain.ts         Typisierter Doichain-MCP-Client
src/history.ts          Lokale Speicherung des Nachweisverlaufs
src/proofRecord.ts      Datenmodell und Statuslogik
src/receipt.ts          Erzeugung und Teilen des PDF-Belegs
app.json                Expo-Konfiguration und Berechtigungstexte
docs/ARCHITECTURE.md    Datenfluss und Sicherheitsgrenzen
CONTRIBUTING.md         Entwicklungs- und Git-Workflow
SECURITY.md             Richtlinie für Sicherheitsmeldungen
```

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
- Android- und iOS-Release-Builds mit EAS Build einrichten.

## Lizenz

DoiProof ist unter der [MIT-Lizenz](LICENSE) veröffentlicht. Copyright © 2026 Ottmar Neuburger.
