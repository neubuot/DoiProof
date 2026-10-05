# iOS-Release über TestFlight

**Stand:** DoiProof 1.0.0. Das Projekt ist für iOS vorbereitet: Bundle-ID `org.doichain.doiproof`, deutsche Berechtigungstexte für Kamera, Fotos, Standort („beim Verwenden der App“) und Bewegung/Fitness, Exportkontrolle (`usesNonExemptEncryption: false`), EAS-Profil `production` (App-Store-Verteilung, Update-Kanal `production`, automatisch hochgezählte Build-Nummer) und das Submit-Profil `production`.

Einige Schritte erfordern einmalig **deinen Apple-Login** und lassen sich nicht automatisieren. Signaturschlüssel, Zertifikate, Profile und API-Schlüssel landen dabei ausschließlich in Expo (EAS) bzw. bei Apple – **niemals im Repository**, das öffentlich ist.

## Voraussetzungen

- Mitgliedschaft im **Apple Developer Program** (kostenpflichtig, Rolle *Account Holder* oder *Admin*).
- Expo-Konto mit Rolle **Owner** oder **Admin** in der Organisation `neubuots-team` (der Robot-Nutzer mit Rolle *Developer* reicht für die einmalige Einrichtung der Apple-Zugangsdaten nicht aus).
- Ein Rechner mit Node.js (LTS) und einem Klon dieses Repositorys. Ein Mac ist **nicht** nötig; EAS baut in der Cloud.

## Einmalige Schritte mit deinem Apple-Login

### 1. Bei Expo anmelden und Projekt prüfen

```sh
git pull
npm ci
npx eas-cli@latest login
npx eas-cli@latest project:info
```

`project:info` muss `@neubuots-team/doiproof` mit der ID `190b3b9c-3911-4831-947e-06bb20ce9d89` zeigen.

### 2. Ersten iOS-Build interaktiv starten

```sh
npx eas-cli@latest build --platform ios --profile production
```

EAS fragt nach deiner **Apple-ID** (mit Zwei-Faktor-Bestätigung) und dem Team. Bestätige jeweils, dass EAS

- die Bundle-ID `org.doichain.doiproof` im Apple-Developer-Konto registriert,
- ein **Distribution Certificate** und ein **Provisioning Profile** erzeugt und in Expo speichert.

Push-Benachrichtigungen werden nicht benötigt; die entsprechende Frage kann verneint werden. Der Build läuft danach in der Cloud (etwa 15–30 Minuten).

### 3. App in App Store Connect anlegen

Entweder lässt du das im nächsten Schritt `eas submit` erledigen, oder du legst die App vorab an: [App Store Connect](https://appstoreconnect.apple.com) → *Apps* → *+* → *Neue App*:

| Feld | Wert |
|---|---|
| Plattform | iOS |
| Name | DoiProof (falls belegt: z. B. „DoiProof Nachweis“) |
| Primärsprache | Deutsch |
| Bundle-ID | `org.doichain.doiproof` |
| SKU | `doiproof` |

Notiere die numerische **Apple-ID der App** (*App-Informationen*).

### 4. Build zu TestFlight hochladen

```sh
npx eas-cli@latest submit --platform ios --profile production --latest
```

EAS fragt erneut nach dem Apple-Login und bietet an, einen **App-Store-Connect-API-Schlüssel** anzulegen. Empfehlung: zustimmen. Der Schlüssel wird in Expo gespeichert und erlaubt künftige Uploads ohne erneuten Login (auch aus GitHub Actions). Die `.p8`-Datei nicht herunterladen oder ins Repository legen.

Optional die App-ID aus Schritt 3 in `eas.json` eintragen, damit `eas submit` nicht mehr fragt (die ID ist kein Geheimnis):

```json
"submit": { "production": { "ios": { "ascAppId": "1234567890" } } }
```

### 5. TestFlight einrichten

Nach dem Upload verarbeitet Apple den Build (5–30 Minuten). Danach in App Store Connect → *TestFlight*:

1. **Exportkonformität:** ist durch `usesNonExemptEncryption: false` beantwortet (DoiProof nutzt nur HTTPS und Hashfunktionen).
2. **Interne Tests:** Gruppe anlegen, Personen aus deinem App-Store-Connect-Team hinzufügen (bis 100). Sie erhalten sofort eine Einladung, ohne Beta-Review.
3. **Externe Tests:** Gruppe anlegen und Tester per E-Mail oder öffentlichem Link einladen. Der erste Build einer Version durchläuft die **Beta-App-Prüfung** durch Apple. Unter *Testinformationen* ausfüllen: Beta-App-Beschreibung, Feedback-E-Mail, Kontaktdaten und eine **Datenschutzerklärung-URL** (auch für den späteren Store-Eintrag nötig). Prüfhinweis für Apple: „Keine Anmeldung erforderlich. Funktion: Foto aufnehmen, Hash auf der Doichain verankern; Tab ‚Prüfen‘ prüft ZIP-Beweispakete.“
4. **App-Datenschutz** (*App-Datenschutz* in App Store Connect): Angaben nach eigener Prüfung. Technisch sendet DoiProof weder Foto noch Standort noch Sensorwerte; übertragen werden der Paket-Hash und eine kurze Gerätezeit-Notiz an den Doichain-Dienst, bei Vorabblöcken öffentliche Blockabfragen. Diese Dokumentation ist keine Rechtsberatung.

Die Tester-Anleitung steht in [TESTER.md](TESTER.md).

## Laufender Betrieb

| Änderung | Weg zu den TestFlight-Testern |
|---|---|
| Nur JavaScript/Assets (z. B. Texte, Prüflogik, Berichtslayout) | **EAS Update** auf Kanal `production`: GitHub → *Actions* → „EAS Update“ → *Run workflow* → Kanal `production`. Tester erhalten es beim nächsten App-Start. |
| Native Änderung (neues Expo-Modul, Berechtigung, `app.json`-Plugins, SDK-Update) | Die Laufzeitversion (Fingerprint) ändert sich; ein Update wird von alten Builds **nicht** geladen. Neuen Build erstellen und hochladen: `npx eas-cli@latest build -p ios --profile production --auto-submit`. |

Die Build-Nummer zählt EAS automatisch hoch (`appVersionSource: remote`). Die Versionsnummer (`1.0.0`) steht in `app.json` und `package.json`; ein Test stellt sicher, dass sie mit Kommandozeilen- und Windows-Prüfer übereinstimmt. TestFlight-Builds laufen nach **90 Tagen** ab.

Hinweis zum Kanal: TestFlight-Builds hören auf den Kanal `production`. Solange die App nicht im App Store veröffentlicht ist, erreicht ein Update auf diesem Kanal ausschließlich die TestFlight-Tester. Nach einer Store-Veröffentlichung sollte für Tester ein eigenes Build-Profil mit eigenem Kanal angelegt werden.

## Optional: iOS-Builds aus GitHub Actions

Sobald Zertifikat, Profil und API-Schlüssel in Expo hinterlegt sind (Schritte 2 und 4), kann auch der Robot-Nutzer mit `EXPO_TOKEN` nicht-interaktiv bauen und hochladen:

```sh
eas build --platform ios --profile production --non-interactive --auto-submit
```

Ein entsprechender Workflow ist bewusst nicht standardmäßig aktiv, weil jeder iOS-Build Build-Kontingent verbraucht und Apple-Prüfungen auslöst.
