# DoiProof

Android- und iOS-App (Expo/React Native) für Proof of Existence auf der Doichain.

## Funktionen

- Foto aufnehmen oder vorhandenes Bild wählen; SHA-256 der gewählten Dateibytes lokal berechnen.
- Standardmäßig ohne Schlüssel per [Doichain-MCP-Server](https://doi-api.sendlabs.de/mcp) mit `anchor_proof` verankern und per `check_proof` prüfen. Nach Kameraaufnahme sofort senden, sofern der Schalter aktiv ist.
- Mit `get_anchoring_quota` das kostenlose Tageskontingent anzeigen: bis zu 10 Nachweise je IP-Adresse und UTC-Tag und insgesamt höchstens 200 täglich. Mehrere Geräte hinter demselben Anschluss teilen das IP-Kontingent; bei VPN oder Proxy ebenso. Rücksetzung um 00:00 UTC.
- Optional einen eigenen PoE- oder Write-Schlüssel pro Sitzung für unbegrenztes Kontingent eintragen.
- Nur Hash und bei Kameraaufnahmen eine als solche gekennzeichnete Gerätezeit als öffentliche Notiz senden. Keine Bilddatei, GPS-Daten oder EXIF-Daten hochladen.

## Entwicklung

Node.js installieren, dann im Projektverzeichnis:

```sh
npm install
npm start
```

Die QR-Adresse in Expo Go auf Android oder iOS öffnen. Für iOS-Builds ohne Mac kann später EAS Build eingesetzt werden. `npm run check` prüft die TypeScript-Typen.

## MCP und REST

Der MCP-Server unter `https://doi-api.sendlabs.de/mcp` ist ein zustandsloser Streamable-HTTP-Dienst. DoiProof ruft seine Werkzeuge mit JSON-RPC auf; der Server nutzt intern die [Doichain-REST-API](https://doi-api.sendlabs.de/docs) und seinen öffentlichen PoE-Schlüssel. Die REST-API unter `POST /v1/poe` benötigt dagegen einen Schlüssel. Für die kostenlose Nutzung direkt vom Handy ist MCP der passende Weg; der Server rechnet das Kontingent der vom Handy sichtbaren IP zu. Der Rückgabestatus kann anfangs `pending` sein; die Bestätigung erfolgt erst mit einem Block.

**Keinen Admin-Schlüssel in die App eintragen.** Ein optionaler PoE- oder Write-Schlüssel bleibt nur für die aktuelle App-Sitzung im Speicher. Für einen späteren kommerziellen Betrieb mit individuellen Konten gehört die Schlüsselverwaltung in einen eigenen Backend-Dienst. Das MVP speichert weder Schlüssel noch Nachweise dauerhaft. Das Foto bleibt in der durch das Betriebssystem/Expo erzeugten lokalen Datei und wird nicht automatisch im Fotoalbum gesichert. Die Gerätezeit in der öffentlichen Notiz ist manipulierbar. Der Hash bezieht sich auf die von ImagePicker gelieferte Datei; Bearbeitung oder Neu-Kodierung verändert ihn.

## Nächste Schritte

- Nachweisverlauf lokal speichern, Bestätigungen periodisch prüfen und Beleg exportieren.
- Geräte-Tests auf Android/iOS mit realen Fotos durchführen; keine Live-Verankerung wurde bei der Entwicklung ausgelöst.
