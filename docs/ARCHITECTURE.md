# Architektur

## Ziel

DoiProof erstellt für eine ausgewählte Fotodatei einen kryptografischen SHA-256-Fingerabdruck und übermittelt ausschließlich diesen Fingerabdruck sowie optional eine klar gekennzeichnete Gerätezeit an Doichain.

## Datenfluss

1. Die Person wählt ein Metadatenprofil. Vor einer neuen Kameraaufnahme fragt die App parallel den BTC-Tip bei Blockstream und den synchronen DOI-Tip beim MCP-Server ab. Höhe, Hash, Headerzeit und Geräte-Abfragezeit werden erfasst. Bei Fehler wird die Kamera nicht geöffnet, sofern die Person den Vorabmodus nicht bewusst ausschaltet.
2. Expo Image Picker liefert eine lokale Datei-URI ohne angeforderte EXIF-Daten.
3. Die App liest die Dateibytes lokal und berechnet den Foto-SHA-256 auf dem Gerät.
4. Je nach Profil erfasst sie GPS- und technische Metadaten und serialisiert sie mit den Vorabblöcken als kanonisches Manifest v2.
5. Foto-Hash und Manifest-Hash werden mit `DoiProof:v2` domänenspezifisch zu einem versionierten Beweispaket-Hash verbunden. Historische v1-Belege behalten ihr altes Schema und Hashverfahren.
6. Die App kopiert die Bilddatei ins private Dokumentverzeichnis und speichert Manifest und lokalen Entwurf, bevor ein Netzaufruf erfolgt. Ein einfaches Backup der Verlaufsdatei bleibt erhalten.
7. Die App ruft über Streamable HTTP das MCP-Werkzeug `anchor_proof` auf.
8. Der MCP-Server verankert den Hash und liefert zunächst gegebenenfalls `pending`.
9. `check_proof` fragt den späteren Kettenstatus ab.
10. Die App aktualisiert den zuvor gesicherten Entwurf mit der Serverantwort; bei fehlender Antwort bleibt der Status als unklar erhalten.
11. Ausstehende Einträge werden beim Start, beim Wechsel in den Vordergrund und im Minutentakt aktualisiert.
12. Für einzelne Einträge kann lokal ein PDF-Beleg erstellt und über den Systemdialog geteilt werden.

## Komponenten

- `App.tsx`: Oberfläche, Bildauswahl, lokales Hashing und Zustandsanzeige.
- `src/doichain.ts`: typisierter MCP-Client, Eingabevalidierung und Fehlerbehandlung.
- `src/evidence.ts`: Metadatenprofile, kanonisches JSON und Hash-Bildung.
- `src/chainAnchors.ts`: validierte BTC-/DOI-Vorabblöcke.
- `src/bundle.ts`: lokale Originalsicherung und vollständiger ZIP-Export.
- `src/history.ts`: lokale, app-private JSON-Speicherung.
- `src/proofRecord.ts`: Datenmodell, Aktualisierung und Statuslogik.
- `src/receipt.ts`: lokale PDF-Erzeugung und Systemfreigabe.
- `scripts/verify.mjs`: unabhängige Offlineprüfung exportierter ZIPs und optionale MCP-/BTC-Abfragen.
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
- Die Vorab-Block-Hashes sind öffentlich nachprüfbare Referenzen. Blockzeiten sind keine präzisen Uhren. Lokale Abrufzeiten und die App-Version sind nicht attestierte Selbstauskünfte.
- Der Vorabblock belegt nur eine zeitliche Referenz im **Paket**; die App kann ein älteres Bild nachträglich einbinden. BTC und Doichain sind wegen Merged Mining nicht vollständig unabhängig.
- Expo Go führt den DoiProof-JavaScript-Code aus einem Entwicklungsserver aus. Ein Git-Commit im Manifest ist kein Fingerprint der laufenden App-Datei. Play Integrity und App Attest werden erst für signierte Release-Builds ergänzt (Issue #6).

## Aktuelle Einschränkungen

- Der Verlauf ist lokal an die App-Installation gebunden und wird nicht synchronisiert.
- PDF-Belege enthalten bewusst nicht das Ursprungsfoto.
- Noch keine automatisierten UI- oder MCP-Integrationstests.
- Eine signierte Server-Challenge mit einmaliger Nonce, kurzer Gültigkeit und später offline prüfbarer Serversignatur ist noch nicht vorhanden; ein bloß lokal erzeugter Zufallswert wird nicht als unabhängiger Zeitnachweis ausgegeben.
