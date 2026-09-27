# DoiProof

Android- und iOS-App (Expo/React Native) für Proof of Existence auf der Doichain.

## Funktionen

- Foto aufnehmen oder vorhandenes Bild wählen; SHA-256 der gewählten Dateibytes lokal berechnen.
- Hash über `POST https://doi-api.sendlabs.de/v1/poe` verankern; Status über `GET /v1/poe/{hash}` prüfen.
- Optional direkt nach der Aufnahme senden, sobald ein PoE- oder Write-Schlüssel für die aktuelle Sitzung eingegeben wurde.
- Nur Hash und bei Kameraaufnahmen eine als solche gekennzeichnete Gerätezeit als öffentliche Notiz senden. Keine Bilddatei, GPS-Daten oder EXIF-Daten hochladen.

## Entwicklung

Node.js installieren, dann im Projektverzeichnis:

```sh
npm install
npm start
```

Die QR-Adresse in Expo Go auf Android oder iOS öffnen. Für iOS-Builds ohne Mac kann später EAS Build eingesetzt werden. `npm run check` prüft die TypeScript-Typen.

## API und Sicherheit

Die [Doichain-API](https://doi-api.sendlabs.de/docs) nimmt bei `POST /v1/poe` JSON mit `hash` (64 Hex-Zeichen) und optional `note` (maximal 160 Zeichen) an. Ein Schreibschlüssel wird per `X-API-Key` übertragen. `GET /v1/poe/{hash}` ist öffentlich lesbar, sofern `DOI_PUBLIC_READ` aktiviert ist. Die API kann nach Annahme zunächst `pending` melden; eine Transaktion ist erst mit bestätigtem Kettenstatus belastbar.

**Keinen Admin-Schlüssel in die App eintragen.** Dieses MVP nimmt einen PoE- oder Write-Schlüssel nur für die aktuelle Sitzung entgegen. Für eine öffentliche App gehört der Schlüssel in einen eigenen Backend-Dienst mit Nutzerkonten, Limits und Missbrauchsschutz; ein fest eingebauter App-Schlüssel wäre extrahierbar. Das MVP speichert weder Schlüssel noch Nachweise dauerhaft. Das Foto bleibt in der durch das Betriebssystem/Expo erzeugten lokalen Datei und wird nicht automatisch im Fotoalbum gesichert. Metadaten im `note`-Feld sind öffentlich sichtbar und die Gerätezeit ist manipulierbar. Der Hash bezieht sich auf die von ImagePicker gelieferte Datei; Bearbeitung oder Neu-Kodierung verändert ihn.

## Nächste Schritte

- Backend-Proxy für öffentliche Veröffentlichung und Schlüsselverwaltung.
- Nachweisverlauf lokal speichern, Bestätigungen periodisch prüfen und Beleg exportieren.
- Geräte-Tests auf Android/iOS mit realen Fotos und API-Schlüssel durchführen.
