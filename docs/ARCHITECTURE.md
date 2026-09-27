# Architektur

## Ziel

DoiProof erstellt für eine ausgewählte Fotodatei einen kryptografischen SHA-256-Fingerabdruck und übermittelt ausschließlich diesen Fingerabdruck sowie optional eine klar gekennzeichnete Gerätezeit an Doichain.

## Datenfluss

1. Die Person wählt ein Metadatenprofil und nimmt ein Foto auf oder wählt eine lokale Bilddatei.
2. Expo Image Picker liefert eine lokale Datei-URI ohne angeforderte EXIF-Daten.
3. Die App liest die Dateibytes lokal und berechnet den Foto-SHA-256 auf dem Gerät.
4. Je nach Profil erfasst sie GPS- und technische Metadaten und serialisiert sie als kanonisches Manifest.
5. Foto-Hash und Manifest-Hash werden domänenspezifisch zu einem versionierten Beweispaket-Hash verbunden.
6. Die App ruft über Streamable HTTP das MCP-Werkzeug `anchor_proof` auf.
7. Der MCP-Server verankert den Hash und liefert zunächst gegebenenfalls `pending`.
8. `check_proof` fragt den späteren Kettenstatus ab.
9. Die App speichert Metadaten des Nachweises als JSON im privaten Dokumentverzeichnis der App.
10. Ausstehende Einträge werden beim Start, beim Wechsel in den Vordergrund und im Minutentakt aktualisiert.
11. Für einzelne Einträge kann lokal ein PDF-Beleg erstellt und über den Systemdialog geteilt werden.

## Komponenten

- `App.tsx`: Oberfläche, Bildauswahl, lokales Hashing und Zustandsanzeige.
- `src/doichain.ts`: typisierter MCP-Client, Eingabevalidierung und Fehlerbehandlung.
- `src/evidence.ts`: Metadatenprofile, kanonisches JSON und Hash-Bildung.
- `src/bundle.ts`: lokale Originalsicherung und vollständiger ZIP-Export.
- `src/history.ts`: lokale, app-private JSON-Speicherung.
- `src/proofRecord.ts`: Datenmodell, Aktualisierung und Statuslogik.
- `src/receipt.ts`: lokale PDF-Erzeugung und Systemfreigabe.
- `app.json`: Expo-Metadaten und Berechtigungstexte.
- `package.json`: reproduzierbare Befehle und Abhängigkeiten.

## Datenschutz und Vertrauensgrenzen

- Die Bilddatei wird nicht an den MCP-Server übertragen.
- Genaue Standortdaten werden nur nach sichtbarer Profilwahl und Systemfreigabe erfasst.
- Rohmetadaten bleiben lokal; öffentlich verankert wird ausschließlich der Beweispaket-Hash.
- Der Hash kann eine bekannte Datei wiedererkennbar machen und ist deshalb nicht in jedem Kontext anonym.
- Die optionale Gerätezeit ist öffentlich, manipulierbar und kein vertrauenswürdiger Zeitstempel.
- API-Schlüssel bleiben nur im flüchtigen App-Zustand und dürfen nicht im Quellcode stehen.
- Eine Kettenbestätigung ist erst belastbar, wenn der Status bestätigt ist.

## Aktuelle Einschränkungen

- Der Verlauf ist lokal an die App-Installation gebunden und wird nicht synchronisiert.
- PDF-Belege enthalten bewusst nicht das Ursprungsfoto.
- Noch keine automatisierten UI- oder MCP-Integrationstests.
