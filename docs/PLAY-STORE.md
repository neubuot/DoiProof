# Veröffentlichung im Google Play Store

Diese Anleitung führt dich als Projektinhaber Schritt für Schritt von der fertigen App bis zur Veröffentlichung von DoiProof 1.0.0 im Google Play Store. Sie setzt voraus, dass der erste Gerätetest nach [ERSTER-TEST.md](ERSTER-TEST.md) bestanden ist.

**Was du am Ende hast:** DoiProof in der Play Console mit ausgefüllten App-Inhalten und Store-Eintrag, ein von EAS gebautes und hochgeladenes App-Bundle (AAB), einen bestandenen internen Test mit der Play-Version auf deinem Handy und eine zur Prüfung eingereichte Produktionsversion. Spätere JavaScript-Änderungen erreichen Play-Nutzer über EAS Update.

**Zeitbedarf:** einmalig etwa einen Arbeitstag für Entscheidungen, Play Console und Texte, dazu 20–60 Minuten Cloud-Build. Die Prüfung durch Google dauert meist wenige Tage, bei neuen Apps auch 7 Tage oder länger.

**Voraussetzungen:**

- Google-Play-**Organisationskonto** (besteht bereits), Rolle Inhaber oder Administrator
- Windows-PC mit Git, Node.js 22 und PowerShell wie in [ERSTER-TEST.md, Teil A](ERSTER-TEST.md#a-vorbereitung-auf-dem-windows-pc), Projektordner `$HOME\DoiProof`
- Expo-Konto `neubuot` mit Rolle Owner in `neubuots-team`; `eas-cli` immer über `npx eas-cli@latest`
- Google-Konto für die Google Cloud Console (für das Dienstkonto in Teil 6)
- Android-Handy mit der bisherigen Test-App (Sideload) und einem Google-Konto im Play Store
- eine öffentlich erreichbare Website für Datenschutzerklärung und Impressum

**Schon im Repository erledigt** (nicht ändern): `targetSdk` 36 und `minSdk` 24 (Android 7.0); gesperrte Berechtigungen in `app.json` (Bewegungserkennung, Speicher- und Medienzugriff, Werbe-ID, Mikrofon, Hintergrundstandort); `plugins/with-android-play.js` erlaubt die Speicherberechtigung nur bis Android 9 (dort braucht die Kamera sie) und macht die Kamera zum optionalen Merkmal; `eas.json` lädt mit `submit.production.android` als **Entwurf** (`releaseStatus: draft`) in den **internen Test** (`track: internal`); `.gitattributes` erzwingt LF-Zeilenenden; `.gitignore` schließt Dienstkonto-Schlüssel (`*service-account*.json`, `pc-api-*.json`) aus.

**Geheimnisse und Datenschutz:** Das Repository ist öffentlich. Dienstkonto-Schlüssel (JSON), Keystores, Tokens und Passwörter gehören nie ins Repository und nie in einen Chat mit Claude. Echte Namen, Anschriften und E-Mail-Adressen stehen nur auf deiner Website und in der Play Console, nicht im Repository. Beweispakete, Berichte und Screenshots mit echtem Foto oder Standort ebenfalls nicht.

**Zur Play Console:** Google benennt Menüs regelmäßig um. Findest du einen hier genannten Menüpunkt nicht, gib den Begriff oben in das Suchfeld der Play Console ein. Diese Anleitung ist keine Rechtsberatung.

## Überblick

| Teil | Wo | Ergebnis |
|---|---|---|
| 0. Vorab-Entscheidungen | Schreibtisch | Paketname, Betreiber des Doichain-Dienstes, Android-Sicherung, Support-E-Mail, URLs, Rolle von Expo |
| 1. Beweispakete sichern | Android-Handy | Alle Nachweise als ZIP außerhalb des Handys |
| 2. Arbeitskopie vorbereiten | Windows-PC | Frischer Klon mit LF, Tests grün |
| 3. App anlegen | Play Console | App „DoiProof“, Aufgabenliste im Dashboard |
| 4. App-Inhalte | Play Console | Erklärungen und Datensicherheit ausgefüllt |
| 5. Store-Eintrag | Play Console | Texte, Grafiken, Kontaktdaten |
| 6. Dienstkonto für `eas submit` | Google Cloud, Play Console, EAS | Upload-Berechtigung in EAS hinterlegt |
| 7. Build | Windows-PC + Expo | AAB gebaut, Laufzeitversion notiert |
| 8. Upload | Windows-PC + Play Console | Entwurf im internen Test, App-Signatur geprüft |
| 9. Interner Test | Android-Handy | Play-Version installiert und getestet |
| 10. Produktion | Play Console | Zur Prüfung eingereicht und veröffentlicht |
| 11. Pre-Launch-Bericht | Play Console | Entscheidung **vor** Teil 8 |
| 12. Spätere Updates | Windows-PC oder GitHub | EAS Update oder neuer Build |
| 13. Stolpersteine | – | Häufige Fehler und Ablehnungsgründe |

## 0. Vorab-Entscheidungen

Diese Punkte müssen vor dem Anlegen der App (Teil 3) bzw. vor dem ersten Build (Teil 7) feststehen. Was `app.json` oder den App-Code betrifft, wird im Repository geändert (z. B. durch Claude in einem eigenen Commit); danach Teil 2 wiederholen.

1. **Paketname (dauerhaft, noch offen, vor Teil 3 entscheiden).** Im Repository steht `org.doichain.doiproof`. Spätestens mit dem ersten Upload ist der Paketname fest an den Eintrag in der Play Console gebunden und lässt sich **nie mehr ändern**; ein anderer Name wäre eine neue App ohne Bewertungen und Nutzer. `org.doichain.…` legt eine Verbindung zum Doichain-Projekt nahe. Verwende ihn nur, wenn das Doichain-Projekt zustimmt (schriftlich festhalten), sonst droht eine Beschwerde wegen Identitätsanmaßung oder Markenrechten. Andernfalls deine eigene Domain rückwärts, z. B. `de.<deinedomain>.doiproof`. Ein neuer Paketname ist eine native Änderung: `android.package` in `app.json` und die Doku werden angepasst; EAS legt beim ersten Build dafür einen neuen Signaturschlüssel an. Die iOS-Bundle-ID ist eine eigene Entscheidung. Im Folgenden steht `<paketname>` für den gewählten Namen.
2. **Betreiber des Doichain-MCP-Dienstes.** Die App sendet bei jeder Verankerung den Paket-Hash und die Notiz „DoiProof v3; Gerät: <Aufnahmezeit>“ (bei ausgewählten Fotos „DoiProof evidence v3“) an `https://doi-api.sendlabs.de/mcp`; der Dienst sieht dabei die IP-Adresse. Kläre, wer ihn betreibt (du selbst, ein Dienstleister in deinem Auftrag oder ein Dritter) und ob er IP-Adressen über die Tageszählung hinaus speichert. Davon hängen die Angaben „erhoben“/„geteilt“ in der Datensicherheit (Teil 4) und der Empfänger in der Datenschutzerklärung ab (Platzhalter in der Vorlage). Kläre auch, dass der Dienst während der Google-Prüfung erreichbar ist.
3. **Android-Sicherung (`allowBackup`).** Derzeit `true`: Android darf den App-Datenordner mit Fotos, Standorten und Verlauf in die Google-Sicherung des Nutzers aufnehmen (höchstens 25 MB je App, also nicht verlässlich). `false` passt besser zur Aussage in Store-Text und Datenschutzerklärung, dass Fotos und genaue GPS-Koordinaten auf dem Gerät bleiben; Nutzer sichern dann ausschließlich per ZIP-Export. Bei `true` muss die Datenschutzerklärung das nennen. Die Änderung ist nativ und muss vor Teil 7 im Repository stehen.
4. **Support-E-Mail.** Wird im Store öffentlich angezeigt. Nimm eine eigene Adresse für DoiProof, nicht deine private.
5. **URLs von Datenschutzerklärung und Impressum.** Beide liegen auf deiner Website, öffentlich ohne Anmeldung, als HTML-Seite (kein PDF) und ohne Länder-Sperre. Die Vorlage mit Platzhaltern wie `[VERANTWORTLICHER]`, `[ANSCHRIFT]`, `[E-MAIL]` und `[URL-DATENSCHUTZ]` liegt im Ordner [play-store/](play-store/). Google verlangt den Link zur Datenschutzerklärung **auch in der App**. „Über diese App“ enthält ihn noch nicht; sobald die URLs feststehen, werden Links „Datenschutz“ und „Impressum“ dort eingebaut, und zwar vor dem Build in Teil 7.
6. **Länder.** Die App und der Store-Eintrag sind nur auf Deutsch. Naheliegend sind Deutschland, Österreich und die Schweiz; mehr Länder sind möglich.
7. **Händlerstatus (EU).** Fragt die Play Console nach dem Status als Händler oder Nicht-Händler nach dem Gesetz über digitale Dienste, wähle bewusst (bei geschäftlichem Auftritt eher Händler; dann sehen EU-Nutzer Geschäftsadresse und Telefon). Ob und wo die Frage kommt, in der Play Console prüfen.
8. **Rolle von Expo und Drittländer.** Die App fragt bei jedem Start bei Expo (650 Industries, Inc., USA) nach Updates (Installations-ID, Diagnoseangaben). Prüfe, ob Expo einen Auftragsverarbeitungsvertrag anbietet, und schließe ihn ab. Mit Vertrag ist Expo dein Dienstleister: In der Datensicherheit (Teil 4) sind die Expo-Daten nur „erhoben“, und in der Datenschutzerklärung bleibt die Variante „AVV“. Ohne Vertrag gibst du sie als „geteilt“ an und behältst die Variante „OHNE AVV“. Prüfe außerdem auf der Liste des EU-US Data Privacy Framework (<https://www.dataprivacyframework.gov/list>) die Einträge von „650 Industries“ (Expo) und „Fastly“ (über deren Netz kommen die OpenStreetMap-Kartenkacheln) und behalte in der Vorlage jeweils die passende Variante. Einzelheiten stehen in der Vorlage unter „Entscheidungen“.

## 1. Vorbereitung am Handy: Beweispakete sichern

Die Play-Version ist mit dem von Google erzeugten App-Signaturschlüssel signiert, die Test-App mit dem EAS-Schlüssel. Android kann die Test-App deshalb nicht durch die Play-Version ersetzen; die Test-App muss in Teil 9 deinstalliert werden. **Die Deinstallation löscht alle Nachweise auf dem Handy.** Verlass dich nicht auf die Android-Sicherung. Das gilt, solange der Paketname gleich bleibt. Mit einem neuen Paketnamen (Teil 0) können Test-App und Play-Version nebeneinander installiert sein; die Play-Version übernimmt den Verlauf aber auch dann nicht, also trotzdem exportieren.

1. DoiProof (Test-App) öffnen, im Tab **„Aufnehmen“** zum **Nachweisverlauf** scrollen.
2. Einträge mit **„Ausstehend“** oder **„Einreichung unklar“**: **„Offene prüfen“**, bis **„Bestätigt“** erscheint. Einträge mit **„Lokal gesichert“**, **„Nicht verankert“** oder weiterhin „Einreichung unklar“, die noch verankert werden sollen: **„Jetzt senden“**, danach wieder „Offene prüfen“. Das geht nur jetzt in der Test-App: Die Play-Version kann importierte ZIP-Dateien nur prüfen, nicht einreichen.
3. Bei **jedem** Eintrag **„Beweispaket ZIP“** antippen → im Teilen-Dialog **„Drive“** → einen privaten Ordner wählen, z. B. „DoiProof-Sicherung“ → **„Speichern“**. Alternativ „In Downloads speichern“ und danach per USB-Kabel auf den PC kopieren ([ERSTER-TEST.md, Teil G](ERSTER-TEST.md#g-gegenprüfung-auf-dem-windows-pc)).
4. Zählen: Im Sicherungsordner liegen so viele `DoiProof-…zip` wie Einträge im Verlauf. Stichprobe: eine ZIP auf den PC laden und mit dem Windows-Prüfer prüfen, oder in PowerShell im Ordner `$HOME\DoiProof` `npm run verify -- ` eintippen (mit Leerzeichen am Ende), die ZIP aus dem Explorer ins Fenster ziehen (das fügt den Pfad ein), ` --online` anhängen und Enter drücken. Erwartet ist die Zeile `Ergebnis: **Byteintegrität der Datei und der Hashbindung bestätigt.**` ([PRUEFPROGRAMM.md](PRUEFPROGRAMM.md)).
5. Die Test-App **noch nicht** deinstallieren. Nimmst du bis Teil 9 neue Nachweise auf, exportiere sie dort erneut.

Die ZIPs enthalten das unveränderte Originalfoto, je nach Profil die genauen GPS-Koordinaten und, falls deine Kamera-App sie hineinschreibt, deren Ortsangaben im Foto (EXIF-GPS, auch im Profil „Privat“): nur privat ablegen, nicht ins Repository, nicht in öffentliche Issues.

## 2. Vorbereitung am PC: Arbeitskopie mit LF-Zeilenenden

Die Laufzeitversion für EAS Update (Fingerprint) hängt byteweise auch von `eas.json` und `.gitignore` ab. Ein älterer Klon unter Windows kann diese Dateien mit CRLF-Zeilenenden enthalten; ein Build daraus hätte eine andere Laufzeitversion als Updates aus GitHub Actions, und Updates kämen bei Play-Nutzern nie an. `.gitattributes` verhindert das, wirkt aber erst beim neuen Auschecken. Am einfachsten ist ein frischer Klon. Baue am besten vom Branch `main`, nachdem PR #25 gemergt ist.

1. **Alten Ordner beiseitelegen** (PowerShell, alle Editoren und Terminals im Ordner schließen):

   ```powershell
   cd $HOME
   git -C .\DoiProof status --short
   Rename-Item .\DoiProof DoiProof-alt
   ```

   Zeigt `git status` eigene Änderungen, die du behalten willst, sichere sie vorher. Den Ordner `DoiProof-alt` kannst du nach erfolgreichem Teil 9 löschen.

2. **Frisch klonen und prüfen:**

   ```powershell
   git clone https://github.com/neubuot/DoiProof.git
   cd DoiProof
   git log -1 --oneline
   git ls-files --eol app.json eas.json .gitignore
   ```

   Ist PR #25 noch nicht gemergt, klone stattdessen gleich den Branch, damit alle Dateien sofort mit LF ausgecheckt werden: `git clone --branch claude/peaceful-ramanujan-qbwqku https://github.com/neubuot/DoiProof.git` (ein späteres `git checkout` im `main`-Klon reicht nicht). Jede Zeile der letzten Ausgabe muss mit `i/lf    w/lf    attr/text=auto eol=lf` beginnen. Steht dort `w/crlf` oder fehlt `attr/…`, enthält der ausgecheckte Stand noch keine `.gitattributes`: Branch prüfen und neu klonen.

3. **Abhängigkeiten und Tests:**

   ```powershell
   npm ci
   npm test
   ```

   Entscheidend ist die Zeile `fail 0` in der Zusammenfassung.

4. **Bei Expo anmelden und Projekt prüfen:**

   ```powershell
   npx eas-cli@latest login
   npx eas-cli@latest whoami
   npx eas-cli@latest project:info
   ```

   `whoami` zeigt `neubuots-team (Role: Owner)`, `project:info` zeigt `@neubuots-team/doiproof` mit der ID `190b3b9c-3911-4831-947e-06bb20ce9d89`.

Auch alle späteren Builds und Updates (Teil 7 und 12) startest du aus diesem Ordner.

## 3. Play Console: App anlegen

1. <https://play.google.com/console> öffnen und mit dem Organisationskonto anmelden. Auf der Startseite dürfen keine offenen Kontoaufgaben (Identität, Kontaktdaten) stehen.
2. **„Alle Apps“** → **„App erstellen“** und ausfüllen:

   | Feld | Wert |
   |---|---|
   | App-Name | Vorschlag aus [STORE-EINTRAG.md](play-store/STORE-EINTRAG.md), z. B. „DoiProof – Foto-Nachweis“ oder „DoiProof“ (höchstens 30 Zeichen, später änderbar) |
   | Standardsprache | Deutsch (Deutschland) – de-DE |
   | App oder Spiel | App |
   | Kostenlos oder kostenpflichtig | Kostenlos. Eine kostenlose App kann später nicht kostenpflichtig werden; für DoiProof ohne Werbung, Konto und In-App-Käufe passt das. |
   | Erklärungen | Programmrichtlinien für Entwickler und US-Exportgesetze lesen und bestätigen |
   | Paketname (falls abgefragt) | `<paketname>` aus Teil 0. Sonst legt ihn der erste Upload in Teil 8 fest. |

3. **„App erstellen“**. Es öffnet sich das **Dashboard** der App mit Aufgabenlisten wie „App einrichten“, „Tests starten“ und „App veröffentlichen“. Die genaue Liste zeigt die Play Console; arbeite sie mit Teil 4 und 5 ab.
4. **Pflichttest prüfen:** Private Konten, die nach dem 13.11.2023 angelegt wurden, brauchen vor der Produktion einen geschlossenen Test mit mindestens 12 Testern über 14 Tage. Organisationskonten sind nach den vorliegenden Quellen ausgenommen. Steht im Dashboard trotzdem **„Produktionszugang beantragen“**, gilt die Pflicht auch für dich; dann den dort beschriebenen Weg gehen.
5. Jetzt schon **Teil 11** (Pre-Launch-Bericht) lesen und entscheiden.

## 4. App-Inhalte ausfüllen

Die Erklärungen findest du über die Aufgaben im Dashboard oder unter **„App-Inhalte“** (Richtlinien). Die Antworten Feld für Feld stehen in **[play-store/APP-INHALTE.md](play-store/APP-INHALTE.md)**; maßgeblich ist diese Datei. Überblick:

| Abschnitt | Kern der Antwort |
|---|---|
| Datenschutzerklärung | URL aus Teil 0; muss öffentlich erreichbar sein, bevor du speicherst |
| App-Zugriff | Alle Funktionen ohne Anmeldung (Variante A; bietet die Play Console dabei kein Textfeld, entfällt der Hinweis für Prüfer). Nur mit befristetem Prüfschlüssel des Dienstbetreibers Variante B mit Hinweis für Prüfer (Internet nötig, Tageskontingent je IP-Adresse, Einträge sind öffentlich) |
| Anzeigen, Werbe-ID | Keine Werbung; Werbe-ID wird nicht verwendet |
| Einstufung des Inhalts | IARC-Fragebogen, keine problematischen Inhalte, keine Interaktion zwischen Nutzern |
| Zielgruppe | Erwachsene (18+), nicht an Kinder gerichtet |
| Datensicherheit | Paket-Hash und Notiz (dauerhaft öffentlich auf der Doichain); genauer Standort im Sinne von Google (Kartenkacheln von OpenStreetMap verraten die Umgebung auf etwa 1 km, die genauen GPS-Koordinaten bleiben auf dem Gerät); Installations-ID, Diagnoseangaben und Fehlermeldung, wenn das Update-System beim Start scheitert (EAS Update, Expo; „erhoben“ oder „geteilt“ je nach Teil 0, Punkt 8; als Zweck nur „App-Funktionen“, nicht „Analysen“); Übertragung verschlüsselt; kein Konto; Blockchain-Einträge nicht löschbar |
| Finanzfunktionen, Gesundheit, Behörden-App, Nachrichten-App | Keine bzw. Nein |

Formular, Datenschutzerklärung und App-Texte müssen zusammenpassen: Ändern sich die Antworten aus Teil 0 (Betreiber des Dienstes, Android-Sicherung, Rolle von Expo), passe alle drei an. Mehr anzugeben als nötig ist kein Verstoß, weniger schon.

## 5. Store-Eintrag

Texte, Kategorie, Kontaktdaten, Versionshinweise und die Anleitung für Screenshots stehen in **[play-store/STORE-EINTRAG.md](play-store/STORE-EINTRAG.md)**. App-Symbol (`icon-512.png`, 512 × 512 px) und Funktionsgrafik (`feature-graphic.png`, 1024 × 500 px) liegen fertig im Ordner [play-store/](play-store/).

1. **Haupt-Store-Eintrag** öffnen (unter „Store-Präsenz“, sonst über die Suche): App-Name, Kurzbeschreibung (höchstens 80 Zeichen) und vollständige Beschreibung (höchstens 4000 Zeichen) aus STORE-EINTRAG.md einfügen.
2. App-Symbol und Funktionsgrafik hochladen.
3. **Screenshots** (2 bis 8, besser mindestens 4, Hochformat 9:16) nimmst du nach STORE-EINTRAG.md, Abschnitt 8, selbst auf, am besten mit der Play-Version in Teil 9 (aktuelle Texte, Link zum Datenschutz). Den Store-Eintrag vorher ohne sie speichern und vor Teil 10 ergänzen. Verweigert die Play Console das Speichern ohne Screenshots, vorläufige Bilder aus der Test-App verwenden und später ersetzen.
4. **Store-Einstellungen:** Kategorie, Support-E-Mail aus Teil 0, Website (mit Impressum). **„Speichern“**.

Eigene Screenshots nur mit neutralem Motiv und ohne echte Koordinaten. Keine Werbe-Superlative („beste“, „Nr. 1“, „kostenlos“ im Titel) und keine Versprechen wie „gerichtsfest“, „rechtssicher“ oder „fälschungssicher“; Begriffe wie „Krypto“ oder „Coin“ meiden, damit die App nicht als Finanz-App eingestuft wird.

## 6. Google-Dienstkonto für `eas submit`

`eas submit` lädt das AAB über die Google Play Developer API hoch und braucht dafür ein **Dienstkonto** mit JSON-Schlüssel. Der Weg folgt der Expo-Anleitung „Creating a Google Service Account“ (expo.fyi) und der Expo-Doku „Submit to the Google Play Store“.

**a) Dienstkonto und Schlüssel in der Google Cloud Console**

1. <https://console.cloud.google.com> öffnen und oben ein Projekt wählen oder neu anlegen („Neues Projekt“, Name z. B. `doiproof-play`).
2. **„IAM und Verwaltung“** → **„Dienstkonten“** → **„Dienstkonto erstellen“**. Name z. B. `eas-submit`, **„Erstellen und fortfahren“**; Rollen im Cloud-Projekt sind nicht nötig → **„Fertig“**.
3. Die **E-Mail-Adresse** des Dienstkontos kopieren (endet auf `…iam.gserviceaccount.com`).
4. Beim Dienstkonto **⋮** → **„Schlüssel verwalten“** → **„Schlüssel hinzufügen“** → **„Neuen Schlüssel erstellen“** → **JSON** → **„Erstellen“**. Die Datei landet in „Downloads“.
5. Datei **außerhalb des Repositorys** ablegen und so umbenennen, dass `.gitignore` sie sicher ausschließt:

   ```powershell
   New-Item -ItemType Directory -Force $HOME\DoiProof-Geheim | Out-Null
   Move-Item "$HOME\Downloads\<heruntergeladene Datei>.json" "$HOME\DoiProof-Geheim\doiproof-service-account.json"
   ```

6. In der Cloud Console die **„Google Play Android Developer API“** suchen und **„Aktivieren“** (im selben Projekt).

**b) Dienstkonto in der Play Console berechtigen**

1. Play Console → **„Nutzer und Berechtigungen“** (Kontoebene, linkes Menü) → **„Neue Nutzer einladen“**.
2. E-Mail-Adresse des Dienstkontos eintragen. Tab **„App-Berechtigungen“** → **„App hinzufügen“** → DoiProof.
3. Diese Rechte setzen (Wortlaut der deutschen Oberfläche kann abweichen; in Klammern die englische Bezeichnung aus der Expo-Anleitung):
   - App-Informationen ansehen (View app information, read-only)
   - Entwürfe von Apps bearbeiten und löschen (Edit and delete draft apps)
   - Für die Produktion freigeben, Geräte ausschließen und Play App-Signatur verwenden (Release to production, exclude devices, and use Play App Signing)
   - Apps für Test-Tracks freigeben (Release apps to testing tracks)
   - Test-Tracks verwalten und Testerlisten bearbeiten (Manage testing tracks and edit tester lists)
   - Store-Präsenz verwalten (Manage store presence)

   Admin-, Finanz- und Bestellrechte sind **nicht** nötig. **„Nutzer einladen“**.

**c) Schlüssel bei EAS hinterlegen** (PowerShell in `$HOME\DoiProof`)

```powershell
(Resolve-Path $HOME\DoiProof-Geheim\doiproof-service-account.json).Path
npx eas-cli@latest credentials -p android
```

Die erste Zeile gibt den vollständigen Pfad aus; kopiere ihn. Dann in `eas credentials`:

1. „Which build profile do you want to configure?“ → **production**.
2. eas-cli zeigt die Android-Zugangsdaten. Notiere unter „Configuration: … (Default)“ → „Keystore“ den **„SHA256 Fingerprint“**: Das ist der Upload-Schlüssel, den du in Teil 8 wiederfindest. Bei neuem Paketnamen zeigt eas-cli hier „No credentials set up yet!“. Dann diesen Schritt überspringen und den SHA256 Fingerprint nach dem Build in Teil 7 mit `npx eas-cli@latest credentials -p android` (Profil production, danach „Exit“) notieren.
3. **„Google Service Account“** → **„Manage your Google Service Account Key for Play Store Submissions“** → **„Set up a Google Service Account Key for Play Store Submissions“**.
4. Bei „Path to Google Service Account file:“ den kopierten Pfad **ohne Anführungszeichen** einfügen und Enter. Gibt es im Konto schon einen Schlüssel, fragt eas-cli zuerst; dann „[Upload a new service account key]“ wählen.
5. Danach zeigt die Übersicht einen Abschnitt zum Google Service Account Key for Submissions mit der E-Mail des Dienstkontos. Mit **„Exit“** beenden.

Den **Keystore** in diesem Menü nie löschen oder ersetzen („Delete your keystore“, „Set up a new keystore“).

**d) JSON-Datei danach**

Der Schlüssel liegt jetzt bei EAS; `eas.json` enthält bewusst keinen Pfad. Die lokale Datei entweder in einem Passwortmanager ablegen und dann löschen, oder sofort löschen (auch aus dem Papierkorb). Geht sie verloren oder gerät sie in falsche Hände: in der Cloud Console beim Dienstkonto einen neuen Schlüssel erzeugen, den alten dort löschen und den neuen wie in c) hochladen. Die Datei nie ins Repository, in Issues, in E-Mails oder in einen Chat geben.

## 7. Build

**Bevor du baust:** Die Entscheidungen aus Teil 0 stehen im Repository (Paketname, `allowBackup`, Links „Datenschutz“ und „Impressum“ in „Über diese App“), und dein Klon ist auf diesem Stand (`git pull --ff-only`, `git status` ohne Änderungen, `git ls-files --eol` wie in Teil 2). Jede spätere native Änderung ergibt eine neue Laufzeitversion und damit einen neuen Build.

```powershell
npx eas-cli@latest build --platform android --profile production
```

- Die gelbe Warnung „android.versionCode field in app config is ignored when version source is set to remote“ und „Incremented versionCode from … to …“ sind normal: EAS zählt den `versionCode` selbst hoch, gemeinsam für Test- und Store-Builds.
- „Using remote Android credentials (Expo server)“: EAS nutzt denselben Schlüssel wie für die Test-APKs. Er wird in Google Play zum **Upload-Schlüssel**. Nur bei neuem Paketnamen fragt EAS „Generate a new Android Keystore?“ → **Y**; den SHA256 Fingerprint dann nach dem Build notieren (Teil 6c, Schritt 2).
- Der Build dauert meist 10–20 Minuten, mit Warteschlange länger. Strg+C beendet nur das Warten.

Ergebnis ist eine `.aab`-Datei. Sie lässt sich nicht direkt installieren; sie ist nur für Google Play gedacht. Öffne die Build-Seite (Link im Terminal oder <https://expo.dev/accounts/neubuots-team/projects/doiproof/builds>) und **notiere die Laufzeitversion** („Runtime version“). Sie muss später bei jedem EAS Update (Teil 12) und in der App unter „Über diese App“ übereinstimmen.

## 8. Upload in den internen Test

**Vorher:** Teil 11 entscheiden. Der Pre-Launch-Bericht startet, sobald ein Release in einem Test-Track veröffentlicht wird, hier also mit „Speichern und veröffentlichen“ in Teil 9, Schritt 2, nicht schon beim Hochladen des Entwurfs.

```powershell
npx eas-cli@latest submit --platform android --profile production --latest
```

- `--latest` nimmt den neuesten Store-Build (Profil production), nicht das Test-APK. `--profile production` ist der Standard; der Schalter macht nur sichtbar, dass `track: internal` und `releaseStatus: draft` aus diesem Profil gelten.
- Am Ende meldet EAS den erfolgreichen Upload und verlinkt die Einreichung auf expo.dev. Laut Expo-Doku legt schon die erste Einreichung den ersten Release im internen Test an.
- Meldet Google „Package not found“, kennt die Play Console den Paketnamen noch nicht. Dann das erste Bundle einmal von Hand hochladen: AAB von der Build-Seite herunterladen → Play Console → **„Testen und veröffentlichen“** → **„Testen“** → **„Interner Test“** → **„Neuen Release erstellen“** → bei der App-Signatur den von Google erzeugten Schlüssel lassen → AAB hochladen → **„Speichern“**. Spätere Uploads gehen wieder mit `eas submit`.

**Kontrolle in der Play Console:**

1. **Interner Test:** Unter „Testen und veröffentlichen“ → „Testen“ → „Interner Test“ steht der Release als **Entwurf** mit der Version `1.0.0` und dem neuen `versionCode`.
2. **App-Signatur:** „Testen und veröffentlichen“ → **„App-Integrität“** → **„App-Signatur“** (heißt die Seite inzwischen anders, in der Suche „App-Signatur“ eingeben). Erwartet: Google Play signiert die Releases. Das **App-Signaturschlüssel-Zertifikat** gehört Google und lässt sich nicht herunterladen; das ist so gewollt. Der SHA-256-Wert beim **Upload-Schlüssel-Zertifikat** muss dem „SHA256 Fingerprint“ aus Teil 6c entsprechen. Bietet die Play Console noch eine Schlüsselwahl an, den von Google erzeugten Schlüssel wählen.
3. **App-Bundle-Explorer** (über die Suche): Ziel-SDK 36, Mindest-SDK 24. Erwartete Berechtigungen: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, `WRITE_EXTERNAL_STORAGE` (nur bis Android 9). Eine signaturgeschützte Berechtigung `<paketname>.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` aus einer Android-Bibliothek ist unbedenklich. Stehen dort `ACTIVITY_RECOGNITION`, `READ_MEDIA_…`, `AD_ID` oder `FOREGROUND_SERVICE…`: nicht weitermachen, sondern melden.
4. **Warnungen:** Ein Hinweis auf fehlende native Debug-Symbole blockiert nicht. Verlangt die Play Console eine Erklärung zu Vordergrunddiensten, diese **nicht** abgeben, sondern melden: Der Dienst aus `expo-location` wird nie gestartet und lässt sich per Config-Plugin entfernen.

## 9. Interner Test mit der Play-Version

1. **Tester eintragen:** Interner Test → Tab **„Tester“** → **„E-Mail-Liste erstellen“**, Name z. B. „DoiProof intern“, die Adresse deines Google-Kontos eintragen, das auf dem Handy im Play Store angemeldet ist → **„Speichern“**. Die Liste anhaken, Feedback-Adresse = Support-E-Mail → **„Änderungen speichern“**.
2. **Release ausrollen:** Tab **„Releases“** → beim Entwurf **„Release bearbeiten“** → Versionshinweise (de-DE), z. B. „Erste Version für den internen Test.“ → **„Weiter“** → **„Speichern und veröffentlichen“** bzw. **„Einführung … starten“**. Fehler (rot) müssen behoben werden; Warnungen lesen. Interne Tests sind meist nach wenigen Minuten verfügbar, beim ersten Mal manchmal später.
3. Tab „Tester“ → beim Teilnahme-Link **„Link kopieren“** und dir aufs Handy schicken.
4. **Am Handy:** Neue Nachweise seit Teil 1 als ZIP exportieren. Dann **Einstellungen → Apps → DoiProof → Deinstallieren** (bei neuem Paketnamen nicht nötig, siehe Teil 1).
5. Den Teilnahme-Link in Chrome öffnen (mit demselben Google-Konto) → **„Tester werden“** bzw. annehmen → **„Bei Google Play herunterladen“** → **„Installieren“**. Meldet der Play Store „Element nicht gefunden“, einige Minuten warten und das Google-Konto prüfen.

**Datenschutz beim Test:** Wie in [ERSTER-TEST.md](ERSTER-TEST.md) ein neutrales Motiv ohne Personen, Kennzeichen oder Dokumente fotografieren, nicht an deiner Wohnadresse. Der Kartenausschnitt sendet die Umgebung (etwa 1 km) an OpenStreetMap. Das Originalfoto im ZIP kann zusätzlich Ortsangaben deiner Kamera-App enthalten (EXIF-GPS), auch im Profil „Privat“. Soll das Original keinen Ort enthalten, die Ortsmarkierung in der Kamera-App ausschalten. ZIP, PDF und Screenshots mit Foto oder Standort nicht in Issues hochladen.

**Funktionstest der Play-Version:**

1. **Version und Kanal:** Unter „Über diese App“ steht `DoiProof 1.0.0 · Kanal production · eingebautes Bundle` (danach `· Commit …`), darunter die Laufzeitversion aus Teil 7. „Nach Update suchen“ meldet „Diese App ist auf dem neuesten Stand ihres Kanals.“
2. **Berechtigungen:** Einstellungen → Apps → DoiProof → Berechtigungen zeigt nur **Kamera** und **Standort** (bis Android 9 zusätzlich Speicher). „Körperliche Aktivität“ darf nicht erscheinen.
3. **Foto aufnehmen mit Standortprofil:** Profil **„Standort & Sensoren“**, die Schalter „BTC- und Doichain-Block vor Kameraaufnahme“ und „Nach Aufnahme sofort senden“ an → **„Foto aufnehmen“** → Kamera erlauben, beim Standort **„Genau“** und **„Bei Nutzung der App“**. Erwartet: drei Fingerabdrücke, Standort mit Genauigkeit, Sensorübersicht, Vorab-Blöcke BTC und DOI.
4. **Verankerung:** „Einreichung angenommen …“, Status **„Ausstehend“**, nach einiger Zeit (mit „Offene prüfen“) **„Bestätigt“**.
5. **PDF mit Karte:** In der Karte „PDF-Prüfbericht“ **„Standort im Bericht“** einschalten; „Kartenausschnitt (OpenStreetMap)“ ist dann an → beim bestätigten Eintrag **„Prüfbericht PDF“**. Seite 1 „Echt versiegelt und unverändert.“, Seite 3 mit Kartenausschnitt. Im Anhang unter „Kamera / EXIF“ zeigt die Zeile „GPS-Angaben im EXIF“, ob die Kamera-App Ortsangaben ins Original geschrieben hat; bei „vorhanden“ steht dort „Ortsangaben der Kamera im Original (ZIP); im Foto dieses Berichts entfernt“.
6. **Prüfen-Tab:** Eine ZIP aus Teil 1 importieren (aus Drive) → „Kettenstatus online abgleichen“ an → **„Paket prüfen“**. Erwartet: dasselbe Ergebnis wie vor dem Wechsel. Danach die ZIP des neuen Nachweises ebenso prüfen.
7. **Neustart:** **„Nach Aufnahme sofort senden“** ausschalten, App ganz schließen und neu öffnen. Der Verlauf ist noch da, und der Schalter steht weiter auf aus, weil die App die Wahl speichert. Danach nach Wunsch wieder einschalten.

Weicht etwas ab, nicht in die Produktion gehen. Die Fehlermeldung (ohne Fotos, Koordinaten, Schlüssel) als Issue oder in der Claude-Code-Sitzung melden.

## 10. Produktion

1. **Dashboard prüfen:** Alle Aufgaben unter „App einrichten“ sind erledigt. Erscheint „Produktionszugang beantragen“, siehe Teil 3, Schritt 4.
2. **Länder:** „Testen und veröffentlichen“ → **„Produktion“** → Tab **„Länder/Regionen“** → **„Länder/Regionen hinzufügen“** → Auswahl aus Teil 0 → speichern.
3. **Release übernehmen:** Interner Test → Tab „Releases“ → beim getesteten Release **„Release hochstufen“** → **„Produktion“**. Versionshinweise (de-DE) aus STORE-EINTRAG.md, Abschnitt 6, einfügen → **„Weiter“** → **„Speichern“**. Es wird kein neues Bundle hochgeladen; die Produktion erhält genau die getestete Version.
4. **Zur Prüfung senden:** **„Veröffentlichungsübersicht“** → **„Änderungen zur Überprüfung senden“**. Mit **„Verwaltete Veröffentlichung“** (optional, dort einschaltbar) geht die App nach der Freigabe erst online, wenn du auf **„Veröffentlichen“** klickst.
5. **Prüfdauer:** meist wenige Tage, bei neuen Apps bis 7 Tage oder länger. Den Stand zeigt die Veröffentlichungsübersicht; Google schreibt außerdem an die Kontaktadresse des Kontos.
6. **Gestaffelte Einführung:** Für die allererste Version gibt es sie nicht; sie geht an alle Nutzer der gewählten Länder. Ab dem zweiten Release beim Hochstufen einen Prozentsatz wählen (z. B. 20 %), Abstürze unter „Android Vitals“ beobachten und dann auf 100 % erhöhen.
7. **Nach der Freigabe:** Die App steht unter `https://play.google.com/store/apps/details?id=<paketname>`; in der Suche taucht sie oft erst nach einigen Stunden auf. Tester mit dem Test-APK informieren: Text in STORE-EINTRAG.md („Nachricht an bisherige Tester“), dazu [TESTER.md](TESTER.md) („Wechsel zur Play-Store-Version“).

## 11. Pre-Launch-Bericht

Google installiert jede Version, die in einen Test-Track kommt, automatisch auf Testgeräten und tippt sich einige Minuten durch die App. Dabei kann es auch **„Foto aufnehmen“** auslösen. Weil **„Nach Aufnahme sofort senden“** nach der Installation eingeschaltet ist, würde die App dann echte Paket-Hashes samt Notiz mit der Gerätezeit **dauerhaft und öffentlich** auf der Doichain verankern. Das betrifft keine Daten von dir, belastet aber die Blockchain mit Testeinträgen, kostet den Dienstbetreiber Gebühren und zählt zum Tageskontingent der Google-IP-Adressen.

- **Deaktivieren** (vor Teil 8): „Testen und veröffentlichen“ → „Testen“ → **„Pre-Launch-Bericht“** → **„Einstellungen“** → Pre-Launch-Berichte ausschalten. Ob es dort einen Schalter gibt und wie er heißt, in der Play Console prüfen.
- **In Kauf nehmen:** Du bekommst dafür Absturzberichte, Screenshots von vielen Geräten und Hinweise zur Barrierefreiheit. Die Testeinträge sind harmlos, aber nicht löschbar.

Unabhängig davon können auch Googles Prüfer bei der Produktionsprüfung Fotos aufnehmen und verankern. Das lässt sich nicht verhindern.

## 12. Spätere Updates

| Änderung | Weg zu den Play-Nutzern |
|---|---|
| Nur JavaScript oder Assets (Texte, Prüflogik, Berichtslayout), ohne neue Datenflüsse | **EAS Update** auf Kanal `production` (siehe unten). Nutzer erhalten es beim nächsten Start, aktiv ab dem darauffolgenden. |
| Native Änderung (neues Expo-Modul, Berechtigung, `app.json`-Plugins, SDK-Update) oder neue Versionsnummer | Neuer Build und Upload: Teil 7 und 8, dann Teil 9 (Kurztest) und Teil 10 (hochstufen, gestaffelt einführen, zur Prüfung senden). |
| Neuer Datenfluss (neuer Dienst, neue Datenart) | Nie per EAS Update. Erst Datensicherheit (Teil 4) und Datenschutzerklärung anpassen, dann als neuer Build einreichen. |
| Store-Texte, Grafiken | In der Play Console ändern, dann in der Veröffentlichungsübersicht zur Prüfung senden. |

**JavaScript-Update vom PC** (aus dem frischen LF-Klon aus Teil 2):

```powershell
cd $HOME\DoiProof
git checkout main
git pull --ff-only
git status
npm ci
npm test
$env:EXPO_PUBLIC_SOURCE_COMMIT = git rev-parse HEAD
npx eas-cli@latest update --channel production --environment production --platform android --message "Kurze Beschreibung"
```

`git status` muss ohne Änderungen sein. Die vorletzte Zeile trägt den Commit für „Über diese App“ ein. `--platform android` beschränkt das Update auf Android; der Kanal `production` erreicht sonst auch die TestFlight-Tester. Die Ausgabe nennt die **Laufzeitversion** („Runtime version“). Sie muss der aus Teil 7 entsprechen; sonst erreicht das Update die Play-Version nicht (Ursache meist eine native Änderung oder CRLF-Zeilenenden). Alternativ ohne PC: GitHub → Actions → „EAS Update (JavaScript-Aktualisierung für Tester)“ → „Run workflow“ → Kanal `production` (veröffentlicht für Android und iOS, läuft unter Linux und damit immer mit LF).

Zum Prüfen in der Play-Version zweimal neu starten: „Über diese App“ zeigt dann `Update xxxxxxxx` statt „eingebautes Bundle“. Ein fehlerhaftes Update lässt sich mit `npx eas-cli@latest update:rollback` zurücknehmen.

**Neuer Store-Build:** Für eine neue Versionsnummer (z. B. 1.0.1) die Version in `app.json`, `package.json`, `desktop/package.json` und `core/version.mjs` gleich setzen (ein Test prüft das). Den `versionCode` zählt EAS selbst hoch, auch durch Test-APKs aus Release-Tags; Lücken stören Google nicht.

## 13. Stolpersteine und häufige Fragen

| Problem | Lösung |
|---|---|
| Paketname soll nachträglich geändert werden | Nicht möglich. Ein neuer Paketname ist eine neue App in der Play Console mit neuem Store-Eintrag; Nutzer der alten App müssen wechseln. Deshalb Teil 0, Punkt 1 vor dem ersten Upload entscheiden. |
| `eas submit`: „Package not found“ | App in der Play Console nicht angelegt oder anderer Paketname. Paketname in `app.json` und Play Console vergleichen; notfalls erstes Bundle von Hand hochladen (Teil 8). |
| `eas submit`: „The caller does not have permission“ oder 403 | Dienstkonto nicht eingeladen, App nicht zugeordnet, Rechte fehlen oder Developer API nicht aktiviert (Teil 6). Neue Rechte wirken manchmal erst nach einigen Stunden. |
| `eas submit`: „Only releases with status draft may be created on draft app“ | `submit.production.android` in `eas.json` geändert (`releaseStatus` nicht `draft`) oder mit einem anderen Profil aufgerufen (`--profile …`). `eas.json` mit dem Repository vergleichen (`git diff eas.json`) und mit `--profile production` erneut senden. |
| `eas submit`: „Version code … has already been used“ | Dieser Build ist schon hochgeladen. Für eine neue Version neu bauen (Teil 7). |
| Cloud Console: Schlüsselerstellung für Dienstkonten deaktiviert | Eine Organisationsrichtlinie des Google-Kontos verbietet JSON-Schlüssel. Ein Administrator der Organisation setzt eine Ausnahme für dieses Projekt, oder du nutzt ein Projekt ohne Organisation. |
| „App nicht installiert, da das Paket mit einem vorhandenen Paket in Konflikt steht“ oder der Play Store installiert nicht | Die Test-App (Sideload) ist noch installiert. Bei gleichem Paketnamen können Sideload- und Play-Version nicht gleichzeitig installiert sein, auch nicht übereinander. ZIPs exportieren (Teil 1), Test-App deinstallieren. |
| „Dein Gerät ist mit dieser Version nicht kompatibel“ | Android älter als 7.0, anderes Google-Konto im Play Store, Teilnahme-Link nicht angenommen, Release noch nicht ausgerollt oder Land nicht freigegeben (Teil 10). |
| Test-APKs aus GitHub-Releases nach dem Play-Start | Sie sind anders signiert und lassen sich nicht über die Play-Version installieren. Nicht mehr als Installationsweg für Nutzer empfehlen. Ab 2027 verlangt Android auch für Sideload-APKs einen registrierten Entwickler; den EAS-Schlüssel dann zusätzlich in der Play Console registrieren. |
| Hinweis zur Ziel-API | Seit 31.08.2026 verlangt Google API 36 für neue Apps und Updates. DoiProof (Expo SDK 57) erfüllt das. Die nächste Anhebung kommt voraussichtlich 2027 mit einem SDK-Update. |
| Hinweis zu 16-KB-Speicherseiten | Nach den Quellen mit React Native 0.86 erfüllt. Warnt der App-Bundle-Explorer trotzdem, melden. |
| Datenschutzerklärung abgelehnt | URL ohne Anmeldung, ohne Länder-Sperre und als HTML-Seite erreichbar? Inhalt passt zur Datensicherheit? Link auch in der App? Name des Anbieters wie im Store? |
| Ablehnung wegen irreführender Angaben oder Metadaten | Store-Texte sachlich halten (Teil 5), keine Rechtsversprechen, keinen nicht abgestimmten Bezug zu Doichain als Marke. |
| Ablehnung, weil die Kernfunktion nicht funktioniert | Doichain-Dienst während der Prüfung nicht erreichbar oder Tageskontingent erschöpft. Erreichbarkeit mit dem Betreiber klären und den Hinweis unter „App-Zugriff“ (Teil 4) prüfen. |
| Play Console verlangt eine Erklärung zu Vordergrunddiensten | Nicht abgeben, melden (Teil 8, Kontrolle 4). |
| EAS Update kommt in der Play-Version nicht an | Laufzeitversion von Build und Update vergleichen (Teil 7 und 12). Bei Abweichung: natives Detail geändert (dann neuer Build) oder Update aus einem Klon mit CRLF (dann Teil 2). |
| `eas submit` fragt nach einem Pfad zum Dienstkonto-Schlüssel | Der Schlüssel ist nicht bei EAS hinterlegt oder gehört zu einem anderen Paketnamen, etwa nach einer Änderung von `android.package`. Teil 6c mit dem aktuellen Stand von `app.json` wiederholen. |

## Quellen

Stand Oktober 2026, mit eas-cli 24.12. Die Play-Console-Hilfe war für die Recherche nur über Zusammenfassungen erreichbar; Feldnamen und Abläufe deshalb in der Oberfläche bestätigen.

- Expo: [Submit to the Google Play Store](https://docs.expo.dev/submit/android/), [Creating a Google Service Account](https://expo.fyi/creating-google-service-account), [App credentials](https://docs.expo.dev/app-signing/app-credentials/)
- Android: [Zielplattform für Google Play](https://developer.android.com/google/play/requirements/target-sdk), [App-Signatur](https://developer.android.com/studio/publish/app-signing), [Datenerhebung und -weitergabe (Datensicherheit)](https://developer.android.com/guide/topics/data/collect-share), [Entwicklerverifizierung](https://developer.android.com/developer-verification/guides/faq)
- Play-Console-Hilfe: [Testanforderungen für neue private Konten](https://support.google.com/googleplay/android-developer/answer/14151465), [Datensicherheit](https://support.google.com/googleplay/android-developer/answer/10787469), [Nutzerdaten und Datenschutzerklärung](https://support.google.com/googleplay/android-developer/answer/10144311), [Pre-Launch-Bericht](https://support.google.com/googleplay/android-developer/answer/9842757), [Gestaffelte Einführung](https://support.google.com/googleplay/android-developer/answer/6346149)
