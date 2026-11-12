# Android-App 1.0.0: Build, Verteilung und Gerätetest

Die Android-App wird mit **EAS Build** (Expo Application Services) als signiertes APK gebaut und an Tester verteilt. Sie läuft eigenständig, ohne Entwicklungsrechner oder Expo Go. JavaScript-Änderungen erreichen installierte Apps über **EAS Update**.

| Einstellung | Wert |
|---|---|
| Expo-Konto / Projekt | `neubuots-team` / `doiproof`, Projekt-ID `190b3b9c-3911-4831-947e-06bb20ce9d89` (`app.json`) |
| Paketname | `org.doichain.doiproof` |
| Version | `1.0.0` in `app.json`, `package.json`, `desktop/package.json` und `core/version.mjs` (ein Test prüft die Gleichheit) |
| Build-Nummer | `3`, gemeinsam für beide Plattformen: `android.versionCode` und `ios.buildNumber` in `app.json` (`appVersionSource: local`, ein Test prüft die Gleichheit). Sie wird von Hand erhöht, nicht von EAS. Google Play nimmt eine bereits verwendete Nummer nie wieder an – veröffentlicht ist `2`. Einzelheiten: [Versionen und Build-Nummern](#versionen-und-build-nummern) |
| Profil `preview` | interne Verteilung, **APK**, Update-Kanal `preview` |
| Profil `production` | Store-Verteilung, **AAB** für Google Play, Update-Kanal `production`; Upload mit `eas submit` als Entwurf in den internen Test (`eas.json`). Ablauf bis zur Veröffentlichung: [PLAY-STORE.md](PLAY-STORE.md) |
| Berechtigungen | Kamera, Standort (nur im Vordergrund), Internet; Speicher nur bis Android 9 (für die Kamera, `plugins/with-android-play.js`). Gesperrt: Mikrofon, Hintergrundstandort, Bewegungserkennung, Medienzugriff (Fotoauswahl über den Android-Photo-Picker), Werbe-ID |
| Laufzeitversion | `fingerprint`: Jede native Änderung ergibt eine neue Laufzeitversion; alte Builds erhalten dann keine Updates mehr, sondern brauchen ein neues APK |

## Automatischer Build bei einem Release-Tag

Der Workflow [`.github/workflows/android-apk.yml`](../.github/workflows/android-apk.yml) startet bei jedem Tag `v*` (und manuell über *Actions → Android-APK (EAS Build) → Run workflow*; diese Schaltfläche gibt es erst, wenn der Workflow auf `main` liegt):

1. Abhängigkeiten installieren, TypeScript prüfen, Tests ausführen; Tag und `package.json`-Version müssen übereinstimmen.
2. `eas build --platform android --profile preview --non-interactive` mit dem Repository-Secret **`EXPO_TOKEN`**.
3. Den **Expo-Downloadlink** des APK und die Build-Seite (mit QR-Code) in die **GitHub-Release-Notes** des Tags schreiben. Ein erneuter Lauf ersetzt den Abschnitt, statt ihn zu verdoppeln.

Ein Release entsteht so:

```sh
git checkout main && git pull
# Version in package.json, app.json, desktop/package.json und core/version.mjs ist 1.0.0
git tag v1.0.0
git push origin v1.0.0
```

Parallel baut der Windows-Workflow die portable EXE und hängt sie an dasselbe Release.

### Secret `EXPO_TOKEN`

Ein **Robot-Nutzer** in der Expo-Organisation `neubuots-team` mit Rolle **Developer** erzeugt das Token (*expo.dev → Organisation → Access tokens / Robot users*). Es wird nur als GitHub-Secret gespeichert: *Repository → Settings → Secrets and variables → Actions → New repository secret*, Name `EXPO_TOKEN`. Niemals in Dateien, Logs oder Issues einfügen.

### Erster Build: Signaturschlüssel

Für das APK braucht EAS einen Android-Keystore. Er wird von EAS erzeugt und in Expo gespeichert; er darf nie ins Repository. Expo empfiehlt, den ersten Build einmal interaktiv vom eigenen Rechner zu starten (Rolle mindestens Developer in `neubuots-team`); die Rückfrage „Generate a new Android Keystore?“ mit **Y** beantworten. Schritt für Schritt: [ERSTER-TEST.md, Teil C](ERSTER-TEST.md#c-erstes-apk-bauen). Alternativ lässt sich der Schlüssel vorab anlegen:

```sh
npx eas-cli@latest login
npx eas-cli@latest credentials --platform android
# Profil "preview" wählen → "Set up a new keystore" → von EAS erzeugen lassen
```

Alle späteren Builds, auch die aus GitHub Actions, nutzen denselben Schlüssel; nur so lassen sich neue APKs über installierte Apps installieren. Einen vorhandenen Keystore nie ersetzen oder löschen.

## Versionen und Build-Nummern

Zwei Zahlen, die leicht verwechselt werden:

| | Wo | Wer sieht sie | Regel |
|---|---|---|---|
| **Version** `1.0.0` | `app.json`, `package.json`, `desktop/package.json`, `core/version.mjs` | Nutzer im Store, „Über diese App“, Manifest, PDF-Bericht | auf allen Plattformen gleich; ein Test erzwingt das |
| **Build-Nummer** `3` | `app.json`: `android.versionCode` und `ios.buildNumber` | niemand außer Google und Apple | muss je Store streng steigen; hier für beide Plattformen dieselbe, ein Test erzwingt das |

`appVersionSource` steht in `eas.json` bewusst auf **`local`**: Die Build-Nummer liegt in `app.json` und damit in Git, nicht als Zähler auf dem Expo-Server. Das kostet einen Handgriff je Build und bringt dreierlei:

- Ein Git-Tag beschreibt einen Build vollständig. Bei `remote` hängt die Nummer an einem Serverzähler, der im Repository nicht sichtbar ist.
- Android und iOS tragen dieselbe Nummer. Zwei Serverzähler laufen zwangsläufig auseinander, sobald eine Plattform öfter gebaut wird.
- Kein Build ändert die Nummer hinter dem Rücken; `autoIncrement` ist in keinem Profil gesetzt.

**Vor jedem Store-Build erhöhen,** beide Werte in einem Commit:

```sh
# in app.json: "versionCode": 4 und "buildNumber": "4"
npm test
git commit -am "chore: Build-Nummer 4"
```

Das gilt auch für einen zweiten TestFlight-Build derselben Version – Apple verlangt innerhalb einer Version eine steigende Nummer. Auf der Android-Seite entstehen dadurch Lücken: Nummern können unbenutzt bleiben, während iOS sie verbraucht. Google stört das nicht, verbraucht sind dort nur hochgeladene Nummern.

## Umstieg von Android Studio auf EAS

Version 1.0.0 (`versionCode 2`) wurde aus Android Studio gebaut und von Hand in die Play Console geladen. Kommt der nächste Store-Build von EAS, sind vorher zwei Dinge zu klären. Beide fallen sonst erst beim Upload auf, wenn der Build schon bezahlt ist.

**1. Upload-Schlüssel.** Google Play signiert die ausgelieferte App mit einem eigenen Schlüssel, nimmt ein AAB aber nur an, wenn es mit dem hinterlegten **Upload-Schlüssel** signiert ist – derzeit der lokale Keystore aus Android Studio. EAS signiert mit dem Keystore, den es für die Test-APKs erzeugt hat; Google lehnt ein so signiertes Bundle ab („signed with the wrong key“). Zwei Wege:

- **Den vorhandenen Keystore zu EAS hochladen,** sofort wirksam. `npx eas-cli@latest credentials -p android`, Profil **production**, Keystore → den Schlüssel *nicht* von EAS erzeugen lassen, sondern die vorhandene `.jks` mit Alias und Passwörtern angeben. Die Passwörter gehören in die Abfrage von eas-cli, nie in eine Datei im Repository. Lässt eas-cli für `preview` und `production` getrennte Konfigurationen zu, dem Profil `preview` seinen bisherigen Keystore lassen; andernfalls sind künftige Test-APKs anders signiert und Tester müssen die App einmal neu installieren (**vorher Nachweise als ZIP exportieren**).
- **Den Upload-Schlüssel bei Google zurücksetzen,** dauert einige Tage. Play Console → *App-Integrität* → *App-Signatur* → Upload-Schlüssel zurücksetzen, mit dem SHA-256 des EAS-Keystores aus `eas credentials -p android`.

Der erste Weg ist der kürzere; er setzt voraus, dass `upload-keystore.jks` samt Passwörtern noch vorhanden ist. Geht er verloren, bleibt nur der zweite – ein Grund mehr für eine Sicherung außerhalb dieses Rechners.

**2. Build-Nummer.** Erledigt: `app.json` steht auf `3`, und ein Test lässt keinen Wert unter `3` zu. Weil `appVersionSource` auf `local` steht, gibt es keinen Zähler auf dem Expo-Server, der von dem handgebauten Bundle nichts wüsste und eine schon verbrauchte Nummer erzeugen könnte ([Versionen und Build-Nummern](#versionen-und-build-nummern)).

Ist der Schlüssel erledigt, läuft Android wie iOS: *Actions → Android-Release → Run workflow* baut das AAB und lädt es auf Wunsch als Entwurf in den internen Test. Ein EAS-Build trägt außerdem den Update-Kanal in die App ein – erst damit erreicht **EAS Update** auch die Play-Version. Die von Hand gebaute 1.0.0 hat keinen Kanal und bekommt keine Updates.

## EAS Update

Der Workflow [`.github/workflows/eas-update.yml`](../.github/workflows/eas-update.yml) veröffentlicht bei jedem Push auf `main`, der App-Code betrifft, ein Update im Kanal `preview`. Über *Run workflow* lässt sich auch der Kanal `production` wählen (TestFlight-Tester, siehe [IOS-RELEASE.md](IOS-RELEASE.md)).

- Die App prüft beim Start auf Updates und aktiviert ein geladenes Update beim **nächsten** Start. „Über diese App → Nach Update suchen“ lädt es sofort.
- Ein Update erreicht nur Builds mit **gleicher Laufzeitversion** (Fingerprint). Nach einer nativen Änderung (neues Expo-Modul, Berechtigung, Plugin, SDK) ist ein neuer Build mit neuem Tag nötig.
- Manifest v3 enthält Kanal, Laufzeitversion und Update-ID als Selbstauskunft; der Quellcode-Commit wird von `scripts/build-info.mjs` auf EAS (`eas-build-post-install`) bzw. vor `eas update` eingetragen.

## Manueller Build

```sh
npm ci
npm run check
npm test
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

Am Ende zeigt EAS den Downloadlink. `--profile production` erzeugt ein AAB für Google Play (kein direkt installierbares APK).

## Gerätetest vor einer Freigabe

Ein Build aus dem Quellcode attestiert weder die Kameraaufnahme noch die Geräteidentität ([Issue #6](https://github.com/neubuot/DoiProof/issues/6)). Vor der Verteilung bitte auf mindestens einem Android-Gerät prüfen:

1. **Installation** über den Release-Link ([TESTER.md](TESTER.md)). Hinweis: Daten aus Expo Go werden nicht übernommen; alte Nachweise vorher in Expo Go als ZIP exportieren.
2. **Profil „Privat“**, automatische Übermittlung aus: Foto aufnehmen. Im Verlauf erscheint „Lokal gesichert“. App beenden und neu öffnen; Foto, Manifest und ZIP-Export müssen erhalten sein.
3. **Profil „Standort & Sensoren“**: neue Aufnahme. Erwartung: Standort, Sensorübersicht (Beschleunigung, Gyroskop, Magnetometer, Kompass, Barometer, Licht) mit „erfasst“ oder begründetem Status. Standortfreigabe einmal verweigern: Die Aufnahme wird trotzdem gespeichert, das Manifest vermerkt „Berechtigung verweigert“.
4. **Einreichung**: „Jetzt senden“ und „Offene prüfen“; `pending` und später `confirmed` beobachten.
5. **Prüfbericht** im Verlauf mit Online-Abgleich erstellen und teilen. Seite 1 muss „Echt versiegelt und unverändert.“ zeigen, sobald der Block bestätigt ist; der Anhang listet jeden Messwert.
6. **Tab „Prüfen“**: das exportierte ZIP importieren, offline und online prüfen; ein verändertes ZIP (Foto ausgetauscht) muss „Prüfung fehlgeschlagen“ ergeben. Dasselbe ZIP mit `npm run verify -- paket.zip --online --pdf bericht.pdf` und dem Windows-Prüfer gegenprüfen.
7. **Ohne Netz**: Vorabmodus blockiert die Kamera mit verständlicher Meldung; ein lokaler Entwurf wird nicht automatisch gesendet.
8. **Update**: Nach einem EAS Update im Kanal `preview` zeigt „Über diese App“ nach zwei Starts die neue Update-ID.

Die automatisierten Tests decken Datenmodell, Manifest v3, Sensorlogik (mit simulierten Sensoren), Prüfung, Bericht und Konfiguration ab. Kamera, echte Sensoren, Berechtigungsdialoge, Teilen-Dialog, Dateiauswahl und Signatur benötigen diesen manuellen Test.
