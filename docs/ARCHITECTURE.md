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

## Komponenten

- `App.tsx`: Oberfläche, Bildauswahl, lokales Hashing und Zustandsanzeige.
- `src/doichain.ts`: typisierter MCP-Client, Eingabevalidierung und Fehlerbehandlung.
- `app.json`: Expo-Metadaten und Berechtigungstexte.
- `package.json`: reproduzierbare Befehle und Abhängigkeiten.

## Datenschutz und Vertrauensgrenzen

- Die Bilddatei wird nicht an den MCP-Server übertragen.
- Der Hash kann eine bekannte Datei wiedererkennbar machen und ist deshalb nicht in jedem Kontext anonym.
- Die optionale Gerätezeit ist öffentlich, manipulierbar und kein vertrauenswürdiger Zeitstempel.
- API-Schlüssel bleiben nur im flüchtigen App-Zustand und dürfen nicht im Quellcode stehen.
- Eine Kettenbestätigung ist erst belastbar, wenn der Status bestätigt ist.

## Aktuelle Einschränkungen

- Kein lokaler Nachweisverlauf.
- Kein automatisches Wiederholen der Statusprüfung.
- Kein exportierbarer Beleg.
- Noch keine automatisierten UI- oder Integrationstests.
