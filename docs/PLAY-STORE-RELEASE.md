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

Google Play nimmt nur ein App-Bundle (`.aab`) an. DoiProof ist ein Expo-Projekt ohne eingecheckten Android-Ordner: Das native Gradle-Projekt wird aus `app.json` erzeugt und danach in Android Studio geöffnet.

```bash
npm ci                 # benötigt Node 22; npm 6 kann die Lockfile-Version nicht lesen
npm run check
npm test
npx expo prebuild --platform android
```

`prebuild` schreibt den Ordner `android/` mit Paketname, Symbolen, Berechtigungen und Plugin-Konfiguration aus `app.json`. **Der Ordner ist erzeugter Stand, keine Quelle.** Wer ihn nicht eincheckt, erzeugt ihn vor jedem Release neu; Änderungen gehören dann nach `app.json` und nicht in die Gradle-Dateien.

Danach in Android Studio **den Ordner `android/` öffnen** – nicht den Projektstamm. Gradle-Sync abwarten, dann **Build → Generate Signed App Bundle / APK → Android App Bundle**.

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

Erwartet werden nur `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `INTERNET` und `READ_EXTERNAL_STORAGE` mit `maxSdkVersion="32"`. `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW` und `VIBRATE` werden von Abhängigkeiten mitgebracht und sind in `app.json` unter `android.blockedPermissions` entfernt; sie dürfen im zusammengeführten Manifest nicht auftauchen. Erscheint dort `READ_MEDIA_IMAGES`, verlangt Google zusätzlich die Erklärung zu Foto- und Videoberechtigungen (Schritt 5).

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

**Kurzbeschreibung** (maximal 80 Zeichen):

```
Fotos lokal hashen und den Hash als Nachweis auf der Doichain verankern.
```

**Vollständige Beschreibung** (maximal 4000 Zeichen):

```
DoiProof erstellt aus einem Foto ein Beweispaket, das vollständig auf dem Gerät entsteht. Das Bild selbst wird nicht hochgeladen: Übertragen wird ausschließlich sein SHA-256-Hash, der als Proof of Existence in der öffentlichen Doichain verankert wird.

So entsteht ein Nachweis
• Foto aufnehmen oder ein vorhandenes Bild auswählen.
• DoiProof berechnet den SHA-256-Hash der Dateibytes lokal.
• Auf Wunsch werden Aufnahmezeit, GPS-Position, Genauigkeit, Richtung, Bild- und Geräteangaben in ein Manifest geschrieben und kryptografisch an den Hash gebunden.
• Vor dem Kamerastart können aktuelle Block-Höhen und Block-Hashes von Bitcoin und Doichain in das Manifest aufgenommen werden. Sie zeigen, dass die Aufnahme nicht vor diesem Block entstanden sein kann.
• Der Hash wird verankert; der Status wird getrennt als Einreichung und als bestätigter Blockeintrag geführt.

Datenschutz
Das Originalfoto, der Standort und alle Metadaten bleiben auf dem Gerät. An den Doichain-Server gehen nur der Hash und optional eine als Geräteangabe gekennzeichnete Aufnahmezeit. Im Profil „Privat“ wird kein Standort angefordert. Es gibt keine Werbung, kein Tracking und kein Nutzerkonto.

Weitergabe und Prüfung
• Vollständiges ZIP-Beweispaket mit Originalfoto, kanonischem Manifest, Verifikationsdaten und Prüfanleitung exportieren.
• Nachvollziehbaren PDF-Beleg erstellen, der sensible Metadaten auf Wunsch ausblendet.
• Jedes ZIP lässt sich ohne DoiProof prüfen: mit dem offenen Prüfprogramm des Projekts oder mit jedem SHA-256-Werkzeug und einem eigenen Zugang zur Doichain.

Kostenloses Kontingent
Ohne eigenen Schlüssel stehen täglich bis zu 10 Verankerungen je IP-Adresse zur Verfügung. Ein eigener PoE- oder Write-Schlüssel kann für die laufende Sitzung hinterlegt werden.

Was ein Nachweis zeigt und was nicht
Ein verankerter Hash belegt, dass genau diese Dateibytes zum Zeitpunkt der Verankerung vorlagen. Er belegt weder die Urheberschaft noch die Echtheit des Motivs noch eine verlässliche Aufnahmezeit. DoiProof stellt keinen qualifizierten elektronischen Zeitstempel im Sinne der eIDAS-Verordnung aus und ersetzt keine Rechtsberatung.

DoiProof ist quelloffen. Code, Dokumentation und das unabhängige Prüfprogramm stehen unter github.com/neubuot/DoiProof.
```

**Grafiken:**

| Element | Vorgabe | Datei |
|---|---|---|
| App-Symbol | 512 × 512 px, PNG, ohne Transparenz | [`assets/play/icon-512.png`](../assets/play/icon-512.png) |
| Feature-Grafik | 1024 × 500 px, PNG oder JPG | [`assets/play/feature-graphic-1024x500.png`](../assets/play/feature-graphic-1024x500.png) |
| Telefon-Screenshots | mindestens 2, empfohlen 4–8; 16:9 oder 9:16, kürzere Seite ab 1080 px | müssen auf einem echten Gerät entstehen |

Screenshots vom Testgerät aufnehmen, sobald das APK aus `--profile preview` installiert ist: Startansicht, Kameraaufnahme mit Profilwahl, Nachweisverlauf mit bestätigtem Eintrag, PDF-Beleg. Keine echten personenbezogenen Daten und keine echten Koordinaten im Bild belassen.

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
- `versionCode` wird durch `autoIncrement` im Profil `production` automatisch erhöht; die geänderte `app.json` committen;
- Dokumentation im selben Pull Request anpassen, wie in [CONTRIBUTING.md](../CONTRIBUTING.md) festgelegt;
- bei geändertem Datenfluss die Datensicherheitsangaben und [DATENSCHUTZ.md](DATENSCHUTZ.md) nachziehen.

Ein einmal verwendeter `versionCode` kann nie erneut hochgeladen werden.

## Offene Punkte vor der ersten Einreichung

- [ ] Verantwortlichen, Anschrift und Kontakt in [DATENSCHUTZ.md](DATENSCHUTZ.md) eintragen und committen
- [ ] Betreiber des MCP-Servers `doi-api.sendlabs.de` in [DATENSCHUTZ.md](DATENSCHUTZ.md) benennen
- [ ] Rechte im Firmenkonto prüfen: Apps erstellen und Produktions-Releases verwalten
- [ ] `eas init` ausführen und die erzeugte `projectId` committen
- [ ] Produktions-AAB bauen und die Berechtigungen im Manifest prüfen
- [ ] Screenshots auf einem echten Gerät aufnehmen
- [ ] Gerätetest nach [ANDROID-RELEASE.md](ANDROID-RELEASE.md) bestehen
