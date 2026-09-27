# Architektur

## Ziel

DoiProof erstellt für eine ausgewählte Fotodatei einen kryptografischen SHA-256-Fingerabdruck und übermittelt ausschließlich diesen Fingerabdruck sowie optional eine klar gekennzeichnete Gerätezeit an Doichain.

## Datenfluss

1. Die Person nimmt ein Foto auf oder wählt eine lokale Bilddatei.
2. Expo Image Picker liefert eine lokale Datei-URI ohne angeforderte EXIF-Daten.
3. Die App liest die Dateibytes lokal und berechnet SHA-256 auf dem Gerät.
4. Die App ruft über Streamable HTTP das MCP-Werkzeug `anchor_proof` auf.
5. Der MCP-Server verankert den Hash und liefert zunächst gegebenenfalls `pending`.
6. `check_proof` fragt den späteren Kettenstatus ab.
7. Die App speichert Metadaten des Nachweises als JSON im privaten Dokumentverzeichnis der App.
8. Ausstehende Einträge werden beim Start, beim Wechsel in den Vordergrund und im Minutentakt aktualisiert.
9. Für einzelne Einträge kann lokal ein PDF-Beleg erstellt und über den Systemdialog geteilt werden.

## Komponenten

- `App.tsx`: Oberfläche, Bildauswahl, lokales Hashing und Zustandsanzeige.
- `src/doichain.ts`: typisierter MCP-Client, Eingabevalidierung und Fehlerbehandlung.
- `src/history.ts`: lokale, app-private JSON-Speicherung.
- `src/proofRecord.ts`: Datenmodell, Aktualisierung und Statuslogik.
- `src/receipt.ts`: lokale PDF-Erzeugung und Systemfreigabe.
- `app.json`: Expo-Metadaten und Berechtigungstexte.
- `package.json`: reproduzierbare Befehle und Abhängigkeiten.

## Datenschutz und Vertrauensgrenzen

- Die Bilddatei wird nicht an den MCP-Server übertragen.
- Der Hash kann eine bekannte Datei wiedererkennbar machen und ist deshalb nicht in jedem Kontext anonym.
- Die optionale Gerätezeit ist öffentlich, manipulierbar und kein vertrauenswürdiger Zeitstempel.
- API-Schlüssel bleiben nur im flüchtigen App-Zustand und dürfen nicht im Quellcode stehen.
- Eine Kettenbestätigung ist erst belastbar, wenn der Status bestätigt ist.

## Aktuelle Einschränkungen

- Der Verlauf ist lokal an die App-Installation gebunden und wird nicht synchronisiert.
- PDF-Belege enthalten bewusst nicht das Ursprungsfoto.
- Noch keine automatisierten UI- oder MCP-Integrationstests.
