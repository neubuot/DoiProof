# Google Play: App anlegen und veröffentlichen

Diese Anleitung führt vom bestehenden Firmenkonto bis zur veröffentlichten DoiProof-App. Alles, was im Repository vorbereitet werden kann, ist vorbereitet; die mit **[Browser]** gekennzeichneten Schritte sind nur in der [Google Play Console](https://play.google.com/console) möglich und müssen von einer berechtigten Person mit dem Entwicklerkonto ausgeführt werden.

Paketname `org.doichain.doiproof`, App-Version `0.5.0`, Android-`versionCode` `1`. Der Paketname lässt sich nach der ersten Veröffentlichung **nie wieder ändern**.

## 1. Konto prüfen **[Browser]**

Das Entwicklerkonto besteht bereits als **Organisationskonto**. Damit entfällt die Testpflicht, die Google neuen Privatkonten auferlegt: Eine Produktionsfreigabe ist ohne geschlossenen Test mit 12 Testern über 14 Tage möglich. Vor dem Anlegen der App nur noch prüfen:

1. Die Identitäts- und Firmenprüfung ist abgeschlossen und das Konto zeigt keinen offenen Hinweis unter „Kontodetails“.
2. Die eigene Rolle erlaubt unter „Nutzer und Berechtigungen“ sowohl **Apps erstellen** als auch **Produktions-Releases verwalten**. Ohne diese beiden Rechte bricht der Ablauf später ab.
3. Die Händler- beziehungsweise Zahlungsdaten sind für eine kostenlose App nicht erforderlich und können leer bleiben.

Da unter dem Konto bereits eine App liegt: DoiProof wird **als eigene App** angelegt, nicht als Release einer vorhandenen. Ein bestehender Play-Eintrag kann seinen Paketnamen nicht wechseln.

## 2. App in der Console anlegen **[Browser]**

„Alle Apps“ → **App erstellen**:

| Feld | Wert |
|---|---|
| App-Name | `DoiProof – Foto-Nachweis` |
| Standardsprache | Deutsch (Deutschland) |
| App oder Spiel | App |
| Kostenlos oder kostenpflichtig | Kostenlos (später nicht mehr auf „kostenpflichtig“ änderbar) |
| Erklärungen | Programmrichtlinien und US-Exportbestimmungen bestätigen |

## 3. AAB in Android Studio erzeugen **[Terminal und Android Studio]**

Google Play nimmt nur ein App-Bundle (`.aab`) an. Der native Gradle-Ordner `android/` liegt wie bei [DoiWallet](https://github.com/Doichain/DoiWallet) im Repository und wird in Android Studio geöffnet.

```bash
npm ci                 # Node 22, wie in der CI
npm run check
npm test
```

Erzeugt wurde der Ordner einmalig mit `npx expo prebuild --platform android` aus `app.json`. Dieser Befehl ist **nur** nötig, wenn sich Paketname, Symbole, Berechtigungen oder Expo-Plugins ändern. Er überschreibt dabei die Gradle-Dateien: Eigene Änderungen an der Build-Konfiguration müssen danach erneut eingetragen werden. Berechtigungen gehören deshalb nach `app.json`, nicht in das Manifest.

In Android Studio **den Ordner `android/` öffnen** – nicht den Projektstamm. Gradle-Sync abwarten, dann **Build → Generate Signed App Bundle / APK → Android App Bundle**.

Beim ersten Mal im selben Dialog über **Create new…** einen Upload-Schlüssel anlegen. Als Ablageort einen Pfad **außerhalb des Repositorys** wählen; Gültigkeit mindestens 25 Jahre. `.gitignore` schließt `*.keystore` und `*.jks` zusätzlich aus. Der Schlüssel und seine Passwörter müssen dauerhaft gesichert werden: Ohne sie lässt sich kein Update mehr hochladen. Play App Signing übernimmt den Auslieferungsschlüssel separat und bleibt aktiviert; ein verlorener Upload-Schlüssel kann darüber zurückgesetzt werden, der Auslieferungsschlüssel nicht.

Variante `release` wählen. Das fertige Bundle liegt danach unter:

```
android/app/build/outputs/bundle/release/app-release.aab
```

**Achtung:** In der erzeugten `android/app/build.gradle` verweist die Variante `release` ab Werk auf `signingConfigs.debug`. Ein Bundle aus `./gradlew bundleRelease` ist damit **mit dem Debug-Schlüssel signiert und für Play unbrauchbar**. Der Weg über den Signatur-Dialog in Android Studio überschreibt das korrekt. Wer stattdessen auf der Kommandozeile bauen will, muss vorher in `android/app/build.gradle` eine eigene `signingConfig release` eintragen.

Nach dem Build die tatsächlich zusammengeführten Berechtigungen prüfen:

```bash
grep "uses-permission" android/app/build/intermediates/merged_manifest/release/*/AndroidManifest.xml
```

Geprüfter Stand für Version 0.5.0: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `CAMERA`, `INTERNET` und die interne `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`. `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW` und `VIBRATE` werden von expo-image-picker und der React-Native-Entwicklungsunterstützung mitgebracht; `android.blockedPermissions` in `app.json` entfernt sie beim Zusammenführen. Erscheint eine der drei oder `READ_MEDIA_IMAGES` doch im Manifest, darf nicht hochgeladen werden: Mikrofon und Overlay sind in Play erklärungsbedürftig, Fotoberechtigungen verlangen zusätzlich die Erklärung aus Schritt 5.

### Fehlerbilder beim Gradle-Sync

**Keine Geräteauswahl in Android Studio.** Die Auswahlliste bleibt leer, solange der Gradle-Sync fehlgeschlagen ist: Ohne konfigurierte Module gibt es nichts zu starten. Zuerst den Sync in Ordnung bringen, nicht das Gerät suchen.

**`configureCMakeDebug` schlägt fehl mit „WARNING: A restricted method in java.lang.System has been called“.** Die Meldung ist keine Warnung, sondern die Fehlerursache: AGP startet `prefab` als eigenen Prozess und wertet jede Ausgabe auf `stderr` als Fehler. Ab JDK 24 gibt die JVM dort den Hinweis nach JEP 472 aus. Die von `expo prebuild` erzeugte Datei `android/gradle/gradle-daemon-jvm.properties` verlangt mit `toolchainVersion=25` genau so eine JVM und lädt sie bei Bedarf selbst herunter. AGP 8.12 unterstützt sie nicht.

Im Repository steht deshalb `toolchainVersion=17`. **Ein erneutes `expo prebuild` setzt den Wert auf 25 zurück und muss danach wieder korrigiert werden.** In Android Studio zusätzlich unter *Einstellungen → Build, Execution, Deployment → Build Tools → Gradle* als Gradle-JDK die Version 17 oder die mitgelieferte JBR 21 wählen; JDK 25 bricht dort mit demselben Fehler ab.

**`[CXX5304] This version only understands SDK XML versions up to 3 …`** ist dagegen folgenlos. Die Meldung entsteht, weil im SDK neuere Pakete liegen, als AGP 8.12 lesen kann – hier CMake 4.1.2 und NDK 30. Der Build verwendet ohnehin das festgelegte NDK 27.1.12297006 mit CMake 3.22.1. Die Pakete müssen nicht entfernt werden.

**Node.** Die Gradle-Tasks rufen `node` auf, um das Autolinking aufzulösen und das JavaScript zu bündeln. Es gilt dieselbe Version wie in der CI, Node 22. Wird Node über nvm verwaltet, muss die gewünschte Version auch in der Shell aktiv sein, aus der Android Studio gestartet wird: Shells ohne geladenes nvm greifen sonst auf eine ältere, global installierte Node-Version zurück.

### Unterschied zum Vorgehen bei DoiWallet

DoiWallet baut in [`scripts/build-release-apk.sh`](https://github.com/Doichain/DoiWallet/blob/master/scripts/build-release-apk.sh) ein **unsigniertes APK** und signiert es danach mit `apksigner`; den Schlüssel stellt die CI aus einem hex-kodierten GitHub-Secret wieder her, der `versionCode` kommt aus einem Zeitstempel.

Für DoiProof lässt sich das nicht eins zu eins übernehmen:

- Google Play nimmt für eine **neue** App kein APK mehr an, sondern nur ein `.aab`. Ein Bundle lässt sich mit `apksigner` nicht signieren; dafür dient entweder der Signatur-Dialog in Android Studio oder eine `signingConfig` in Gradle.
- Ein `versionCode` aus einem Zeitstempel liegt bereits bei rund 1,8 Milliarden. Das ist unterhalb der Obergrenze von 2 100 000 000 zulässig, verbraucht den Bereich aber unwiderruflich und lässt sich nie wieder verkleinern. Für DoiProof wird stattdessen fortlaufend gezählt, beginnend bei `1`.

Übernommen ist der Aufbau des Repositorys: eingecheckter `android/`-Ordner und die Store-Texte unter `fastlane/metadata/android/`.

### Alternative: EAS Build in der Cloud

Ohne lokale Android-Umgebung erzeugt EAS dasselbe Bundle und verwahrt den Upload-Schlüssel im Expo-Konto:

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # einmalig; schreibt extra.eas.projectId in app.json
npx eas-cli@latest build --platform android --profile production
```

Beide Wege schließen sich gegenseitig aus, solange nicht derselbe Schlüssel hinterlegt ist: Play akzeptiert für ein Paket nur Bundles **eines** Upload-Schlüssels.

## 4. Store-Eintrag **[Browser]**

Unter „Wachstum → Store-Präsenz → Hauptdarstellung im Store“.

Alle Texte liegen im Repository unter `fastlane/metadata/android/de-DE/` im supply-Aufbau, den auch DoiWallet verwendet. Sie werden dort gepflegt und von dort in die Console übernommen, damit es keine zweite, abweichende Fassung gibt.

| Feld in der Console | Datei | Grenze | belegt |
|---|---|---|---|
| App-Name | [`title.txt`](../fastlane/metadata/android/de-DE/title.txt) | 30 Zeichen | 24 |
| Kurzbeschreibung | [`short_description.txt`](../fastlane/metadata/android/de-DE/short_description.txt) | 80 Zeichen | 72 |
| Vollständige Beschreibung | [`full_description.txt`](../fastlane/metadata/android/de-DE/full_description.txt) | 4000 Zeichen | 2253 |
| Versionshinweise | [`changelogs/1.txt`](../fastlane/metadata/android/de-DE/changelogs/1.txt) | 500 Zeichen | 256 |

Der Dateiname des Änderungshinweises ist der `versionCode`: Für den nächsten Release entsteht `changelogs/2.txt`.

**Grafiken:**

| Element | Vorgabe | Datei |
|---|---|---|
| App-Symbol | 512 × 512 px, PNG, ohne Transparenz | [`images/icon.png`](../fastlane/metadata/android/de-DE/images/icon.png) |
| Feature-Grafik | 1024 × 500 px, PNG oder JPG | [`images/featureGraphic.png`](../fastlane/metadata/android/de-DE/images/featureGraphic.png) |
| Telefon-Screenshots | mindestens 2, empfohlen 4–8; 16:9 oder 9:16, kürzere Seite ab 1080 px | fehlen noch; Ablage in [`images/phoneScreenshots/`](../fastlane/metadata/android/de-DE/images/phoneScreenshots/) |

Screenshots entstehen auf einem echten Gerät, sobald ein Debug- oder Release-Build darauf läuft: Startansicht, Kameraaufnahme mit Profilwahl, Nachweisverlauf mit bestätigtem Eintrag, PDF-Beleg. Keine echten personenbezogenen Daten und keine echten Koordinaten im Bild belassen.

**Weitere Felder:** Kategorie „Tools“ (alternativ „Produktivität“), Tags „Sicherheit“ und „Dienstprogramme“, Kontakt-E-Mail, Website `https://github.com/neubuot/DoiProof`.

## 5. Pflichtangaben im App-Inhalt **[Browser]**

Unter „Richtlinien und Programme → App-Inhalt“. Ohne vollständige Angaben bleibt die Veröffentlichung gesperrt.

**Datenschutzerklärung.** URL eintragen. Nach einem Commit von [`docs/DATENSCHUTZ.md`](DATENSCHUTZ.md) ist das:
`https://github.com/neubuot/DoiProof/blob/main/docs/DATENSCHUTZ.md`
Die Platzhalter für Verantwortlichen und Kontakt müssen vorher ersetzt sein.

**App-Zugriff.** „Alle Funktionen sind ohne besondere Zugangsdaten verfügbar.“

**Anzeigen.** „Die App enthält keine Werbung.“

**Inhaltseinstufung.** Fragebogen mit Kategorie „Dienstprogramm, Produktivität, Kommunikation oder Sonstiges“ ausfüllen. Alle Fragen zu Gewalt, Sexualität, Drogen, Glücksspiel und nutzergenerierten Inhalten mit „Nein“ beantworten. Ergebnis: USK 0 beziehungsweise PEGI 3.

**Zielgruppe.** Altersgruppe 18+ wählen; die App richtet sich nicht an Kinder.

**Datensicherheit.** Das ist das heikelste Formular. Angaben passend zum tatsächlichen Verhalten des Codes:

| Frage | Antwort |
|---|---|
| Werden Nutzerdaten erfasst oder geteilt? | Ja |
| Werden alle Daten bei der Übertragung verschlüsselt? | Ja (HTTPS) |
| Können Nutzer die Löschung ihrer Daten beantragen? | Nein – verankerte Hashes stehen dauerhaft in einer öffentlichen Blockchain |
| Fotos und Videos | **nicht** erfasst (verlassen das Gerät durch die App nicht) |
| Standort | **nicht** erfasst (nur lokal im Manifest) |
| App-Aktivität → andere Aktionen | erfasst **und geteilt**; Zweck: App-Funktionalität; erforderlich, nicht optional. Beschreibung: SHA-256-Hash der ausgewählten Datei sowie optional die vom Gerät gemeldete Aufnahmezeit, veröffentlicht in einer öffentlichen Blockchain |

Grund für „geteilt“: Die Daten landen in einer öffentlichen Blockchain und sind damit weltweit abrufbar. Diese Angabe lieber zu offen als zu knapp machen; falsche Datensicherheitsangaben sind ein häufiger Sperrgrund.

**Finanzdienstleistungen.** Die Frage nach Kryptowährungsbörsen und Software-Wallets mit „Nein“ beantworten: DoiProof verwahrt keine Guthaben, handelt nicht und bietet keine Wallet-Funktion. Ein optional eingegebener Schlüssel dient nur der Verankerung und wird nicht gespeichert. Bei Rückfragen von Google ist genau diese Abgrenzung die Antwort.

**Regierungs-App:** Nein. **Gesundheits-App:** Nein.

## 6. Bundle hochladen **[Browser oder Terminal]**

Weg A – direkt in der Console: „Test und Freigabe → Interner Test → Neuen Release erstellen“, die `.aab`-Datei aus dem EAS-Build hochladen, Versionshinweise eintragen.

Weg B – automatisiert mit `eas submit`. Dafür in der Google Cloud Console ein Dienstkonto anlegen, ihm in der Play Console unter „Nutzer und Berechtigungen“ Releaserechte geben, den JSON-Schlüssel als `play-service-account.json` im Projektstamm ablegen (bereits in `.gitignore`) und aufrufen:

```bash
npx eas-cli@latest submit --platform android --profile production --latest
```

Das hinterlegte Profil lädt in den Track `internal` und legt den Release als Entwurf an. **Der allererste Upload eines neuen Pakets muss manuell über die Console erfolgen**; `eas submit` funktioniert erst danach.

Versionshinweise für 0.5.0:

```
Erste Veröffentlichung. Foto aufnehmen, SHA-256 lokal berechnen und als Proof
of Existence auf der Doichain verankern. Originalfoto und Manifest werden vor
dem Senden lokal gesichert. ZIP-Beweispaket und PDF-Beleg lassen sich teilen
und unabhängig prüfen.
```

## 7. Testen und veröffentlichen **[Browser]**

Das Organisationskonto darf ohne vorgeschalteten geschlossenen Test in die Produktion veröffentlichen. Der interne Test bleibt trotzdem der richtige erste Schritt, weil er Signatur, Installation und Gerätebetrieb unter echten Play-Bedingungen zeigt.

1. **Interner Test** – bis zu 100 Tester per E-Mail-Liste, sofort nach der Freigabe des Releases verfügbar. Den Gerätetest aus [ANDROID-RELEASE.md](ANDROID-RELEASE.md) vollständig durchlaufen, bevor es weitergeht.
2. **Produktion** – „Test und Freigabe → Produktion → Neuen Release erstellen“, dasselbe Bundle aus dem internen Test übernehmen, Länder auswählen und zur Überprüfung einreichen. Die erste Prüfung einer neuen App dauert erfahrungsgemäß einige Tage bis mehrere Wochen, auch bei einem geprüften Firmenkonto.
3. Stufenweise Einführung mit einem kleinen Prozentsatz beginnen, falls eine Rücknahme nötig wird.

## 8. Weitere Releases

Für jeden weiteren Release:

- `version` in `app.json` und `package.json` auf dieselbe neue Nummer setzen;
- `versionCode` um eins erhöhen, und zwar an **beiden** Stellen: `android.versionCode` in `app.json` als Quelle und `versionCode` in [`android/app/build.gradle`](../android/app/build.gradle) im eingecheckten Gradle-Projekt. Nur der Gradle-Wert landet im Bundle; der Wert in `app.json` hält den nächsten `prebuild` auf demselben Stand. Das `autoIncrement` im EAS-Profil `production` greift ausschließlich bei Cloud-Builds;
- Änderungshinweise als `fastlane/metadata/android/de-DE/changelogs/<versionCode>.txt` anlegen;
- Dokumentation im selben Pull Request anpassen, wie in [CONTRIBUTING.md](../CONTRIBUTING.md) festgelegt;
- bei geändertem Datenfluss die Datensicherheitsangaben und [DATENSCHUTZ.md](DATENSCHUTZ.md) nachziehen.

Ein einmal verwendeter `versionCode` kann nie erneut hochgeladen werden.

## Offene Punkte vor der ersten Einreichung

- [ ] Verantwortlichen, Anschrift und Kontakt in [DATENSCHUTZ.md](DATENSCHUTZ.md) eintragen und committen
- [ ] Betreiber des MCP-Servers `doi-api.sendlabs.de` in [DATENSCHUTZ.md](DATENSCHUTZ.md) benennen
- [ ] Rechte im Firmenkonto prüfen: Apps erstellen und Produktions-Releases verwalten
- [ ] Upload-Schlüssel in Android Studio anlegen und außerhalb des Repositorys sichern
- [ ] Signiertes Produktions-AAB bauen und mit `keytool -printcert -jarfile` prüfen, dass es **nicht** `CN=Android Debug` trägt
- [ ] Screenshots auf einem echten Gerät aufnehmen
- [ ] Gerätetest nach [ANDROID-RELEASE.md](ANDROID-RELEASE.md) bestehen
