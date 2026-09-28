# Android-App 0.5.0: Build und Gerätetest

Die Android-App speichert jedes neue Originalfoto mit Manifest **vor** dem Senden im privaten App-Verzeichnis. Ein lokal gesicherter Entwurf kann im Verlauf mit „Jetzt senden“ eingereicht werden. Bleibt eine Serverantwort aus, wird der Eintrag als „Einreichung unklar“ gespeichert und später abgefragt. Ein bestätigter Blockchain-Eintrag bleibt davon getrennt.

## Installierbares APK über EAS Build

Ein APK benötigt eine Android-Signatur. `eas.json` enthält das Profil `preview` für ein direkt installierbares APK und `production` für ein Google-Play-App-Bundle. Das Paket heißt `org.doichain.doiproof`, Version `0.5.0`, Android-Versioncode `1`.

Auf dem Notebook im aktualisierten Repository:

```powershell
cd C:\Users\ottma\DoiProof
git pull --ff-only
npm ci
npm run check
npm test
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

`init` verbindet dieses Repository einmalig mit einem Expo-Projekt. Beim ersten Build muss die Android-Signatur eingerichtet werden; EAS kann den Schlüssel im Expo-Konto verwalten. **Signaturdaten und Expo-Token gehören nicht ins Git-Repository.** Danach zeigt EAS einen Download-Link zum APK. Weitere Builds müssen denselben Signaturschlüssel und einen höheren `versionCode` verwenden, damit sie eine installierte App aktualisieren können. Das Profil `production` erzeugt ein AAB für Google Play, kein direkt installierbares APK.

Ein Build aus dem Quellcode allein attestiert nicht die Kameraaufnahme oder Geräteidentität. App-Authentizität bleibt in [Issue #6](https://github.com/neubuot/DoiProof/issues/6) für einen späteren signierten und attestierten Verteilungsweg vorgesehen.

## Gerätetest vor einer Freigabe

1. APK auf dem Android-Gerät installieren. Bei einer bereits installierten Expo-Go-Version bleiben deren lokalen Daten in **Expo Go**; die neue eigenständige App übernimmt sie nicht automatisch. Ein von Expo Go exportiertes ZIP vorher sicher verwahren.
2. Profil „Privat“, automatische Übermittlung **aus**: Foto aufnehmen. Prüfen, ob „Lokal gesichert“ im Verlauf erscheint. App vollständig beenden und erneut öffnen; Foto, Manifest und ZIP-Export müssen noch vorhanden sein.
3. „Jetzt senden“ und „Offene prüfen“ betätigen. `pending` und später `confirmed` getrennt beobachten; Transaktions- und Blockdaten mit dem Windows-Prüfer am exportierten ZIP abgleichen.
4. Im Profil „Standortnachweis“ eine neue Aufnahme machen. GPS, Genauigkeit und Vorabblöcke im Manifest und im Windows-Prüfer kontrollieren. Kameraaufnahme bei Netzfehler vor dem Foto nicht fortsetzen, sofern Vorabblöcke aktiviert sind.
5. PDF-Beleg und ZIP über den Android-Teilen-Dialog auf das Notebook übertragen. PDF kann sensible Metadaten ausblenden; ZIP enthält immer das Original und das gesamte Manifest.
6. App neu starten, ohne Netzwerk verwenden und Statusansicht testen. Prüfen, dass ein lokaler Entwurf nicht automatisch an den Server gesendet wird.

Die automatisierten Tests prüfen Datenmodell, Hashbindung und die Build-Konfiguration. Kamera, Berechtigungen, Android-Teilen-Dialog, EAS-Signatur und tatsächlicher Gerätebetrieb benötigen diesen manuellen Test.
