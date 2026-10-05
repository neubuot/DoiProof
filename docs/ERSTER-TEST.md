# Erster Test: DoiProof auf dem Android-Handy und Prüfer auf Handy und Windows

Diese Anleitung führt dich als Projektinhaber Schritt für Schritt zum ersten echten Test von DoiProof 1.0.0. Der Pull Request #25 muss dafür **noch nicht gemerged** sein; du testest direkt den Branch `claude/peaceful-ramanujan-qbwqku`.

**Was du am Ende hast:** die eigenständige App auf deinem Android-Handy, einen ersten Nachweis, ein exportiertes Beweispaket, PDF-Prüfberichte aus der App, aus dem Windows-Prüfer und aus der Kommandozeile – und die Gewissheit, dass alle drei Prüfer dasselbe Ergebnis liefern.

**Zeitbedarf:** etwa 1,5 Stunden, davon 20–60 Minuten Wartezeit auf den Cloud-Build.

## Übersicht

| Teil | Wo | Ergebnis |
|---|---|---|
| A. Vorbereitung | Windows-PC | Git, Node.js, Repository |
| B. Windows-Prüfer | Windows-PC | EXE aus dem PR-Build läuft |
| C. Erstes APK bauen | Windows-PC + Expo | Signiertes APK und Download-Link |
| D. App installieren | Android-Handy | DoiProof 1.0.0 installiert |
| E. Erster Nachweis | Android-Handy | Foto, Sensoren, Verankerung |
| F. Prüfer auf dem Handy | Android-Handy | Prüfung und PDF-Bericht in der App |
| G. Gegenprüfung | Windows-PC | Windows-Prüfer und Kommandozeile |
| H. Negativtest | PC + Handy | Verändertes Paket wird erkannt |
| I. Danach: automatischer Ablauf | GitHub + Expo | Merge, `EXPO_TOKEN`, Release-Tag |

## A. Vorbereitung auf dem Windows-PC

1. **Git und Node.js installieren** (falls noch nicht vorhanden). PowerShell öffnen und ausführen:

   ```powershell
   winget install --id Git.Git -e
   winget install --id OpenJS.NodeJS.LTS -e
   ```

   PowerShell danach **schließen und neu öffnen**, damit `git`, `node` und `npm` gefunden werden. Prüfen:

   ```powershell
   git --version
   node --version
   npm --version
   ```

2. **Skriptausführung für npm erlauben** (einmalig). Ohne diesen Schritt meldet PowerShell bei `npx` oft „…npx.ps1 kann nicht geladen werden, da die Ausführung von Skripts auf diesem System deaktiviert ist“:

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

   Mit `J` bzw. `Y` bestätigen. Alternativ alle Befehle in der klassischen Eingabeaufforderung (`cmd`) ausführen.

3. **Repository holen und den Test-Branch auschecken:**

   ```powershell
   cd $HOME
   git clone https://github.com/neubuot/DoiProof.git
   cd DoiProof
   git checkout claude/peaceful-ramanujan-qbwqku
   npm ci
   npm test
   ```

   `npm test` muss mit `# fail 0` enden.

## B. Windows-Prüfer aus dem PR-Build

Der Windows-Workflow hat die EXE bereits gebaut. Sie liegt als Artefakt am Workflow-Lauf (Anmeldung bei GitHub nötig):

1. Im Browser öffnen: <https://github.com/neubuot/DoiProof/actions/runs/37318798495>
2. Ganz unten unter **Artifacts** auf **DoiProof-Pruefer-Windows** klicken (ZIP, ca. 100 MB).
3. ZIP entpacken. Darin liegen `DoiProof-Pruefer-1.0.0-Windows.exe` und `SHA256SUMS.txt`.
4. Hash vergleichen (in PowerShell im entpackten Ordner):

   ```powershell
   Get-FileHash .\DoiProof-Pruefer-1.0.0-Windows.exe -Algorithm SHA256
   Get-Content .\SHA256SUMS.txt
   ```

   Beide Werte müssen übereinstimmen (Groß-/Kleinschreibung egal).
5. EXE per Doppelklick starten. Windows SmartScreen warnt, weil die EXE nicht code-signiert ist: **„Weitere Informationen“ → „Trotzdem ausführen“**.

Die Oberfläche zeigt „WINDOWS · VERSION 1.0.0“. Für die Prüfung brauchst du gleich ein Beweispaket vom Handy (Teil G).

## C. Erstes APK bauen (einmalig mit deinem Expo-Login)

Der erste Build erzeugt den **Android-Signaturschlüssel**, der danach in Expo gespeichert bleibt. Er läuft deshalb einmal interaktiv mit deinem eigenen Expo-Konto (Rolle **Owner** oder **Admin** in `neubuots-team`), nicht mit dem Robot-Token.

1. Im Ordner `DoiProof` (Branch aus Teil A):

   ```powershell
   npx eas-cli@latest login
   npx eas-cli@latest whoami
   npx eas-cli@latest project:info
   ```

   `project:info` muss `@neubuots-team/doiproof` mit der ID `190b3b9c-3911-4831-947e-06bb20ce9d89` zeigen.

2. Build starten:

   ```powershell
   npx eas-cli@latest build --platform android --profile preview
   ```

   Mögliche Rückfragen beantworten:
   - Frage nach der **Versionsverwaltung** (`versionCode` remote initialisieren): **ja** bzw. Vorschlag übernehmen.
   - **„Generate a new Android Keystore?“**: **ja**. EAS erzeugt und speichert den Schlüssel; nichts davon landet im Repository.

3. Warten. Kostenlose Expo-Konten können in einer Warteschlange stehen; der Build selbst dauert typisch 10–20 Minuten. Am Ende zeigt das Terminal einen **Link und einen QR-Code**. Dieselbe Seite findest du unter <https://expo.dev/accounts/neubuots-team/projects/doiproof/builds>.

## D. App auf dem Android-Handy installieren

1. QR-Code aus Teil C mit der Handykamera scannen oder den Link auf dem Handy öffnen (z. B. per E-Mail an dich selbst).
2. Auf der Expo-Seite **„Install“** bzw. den APK-Download antippen.
3. Android fragt, ob der Browser **unbekannte Apps installieren** darf: in den Einstellungen erlauben, zurück, **Installieren**.
4. **Google Play Protect** warnt eventuell vor einer unbekannten App: **„Weitere Details“ → „Trotzdem installieren“**.
5. DoiProof öffnen. Unten im Tab **„Aufnehmen“** zeigt die Karte **„Über diese App“** `DoiProof 1.0.0 · Kanal preview`.

Hinweis: Eine eventuell vorhandene Expo-Go-Version enthält deine alten Testdaten; die neue App übernimmt sie nicht.

## E. Erster Nachweis auf dem Handy

1. Tab **„Aufnehmen“**, Metadatenprofil **„Standort & Sensoren“** wählen.
2. **„Foto aufnehmen“** tippen. Freigaben für **Kamera** und **Standort** („Bei Nutzung der App“) erteilen. Die App lädt zuerst die BTC- und Doichain-Blöcke und startet die Sensoren, dann öffnet sich die Kamera.
3. Foto aufnehmen und bestätigen. Danach siehst du drei Fingerabdrücke (Foto, Manifest, Beweispaket), den Standort und die Zeile **„Sensoren (Geräteangaben)“** – erwartet: Beschleunigung, Gyroskop, Magnetometer, Kompass „erfasst“; Barometer und Licht je nach Gerät „erfasst“ oder „nicht verfügbar“.
4. Weil **„Nach Aufnahme sofort senden“** an ist, wird nur der Paket-Hash eingereicht. Status zuerst **„Ausstehend“**.
5. Nach etwa 10 Minuten im **Nachweisverlauf** auf **„Offene prüfen“** tippen, bis der Eintrag **„Bestätigt“** zeigt.

Optional gleich einen zweiten Nachweis im Profil „Standort & Sensoren“ aufnehmen und dabei die **Standortfreigabe verweigern**: Die Aufnahme muss trotzdem gespeichert werden, mit dem Hinweis „Standortfreigabe verweigert – im Manifest vermerkt“.

## F. Prüfer auf dem Handy

1. Im Verlauf beim bestätigten Eintrag **„Beweispaket ZIP“** → im Teilen-Dialog z. B. **„In Dateien speichern“/Downloads**, Google Drive oder per E-Mail an dich selbst. Diese ZIP-Datei brauchst du auch auf dem PC.
2. **„Prüfbericht PDF“** antippen (Schalter **„Kettenstatus online abgleichen“** an). Das PDF öffnen: Seite 1 muss **„Echt versiegelt und unverändert.“** zeigen, die letzten Seiten listen alle Sensorwerte.
3. Tab **„Prüfen“** → **„ZIP-Beweispaket importieren“** → die eben gespeicherte ZIP wählen → **„Paket prüfen“**. Die Ergebniskarte zeigt dasselbe Ergebnis wie das PDF.
4. **„PDF-Prüfbericht erstellen und teilen“** – das ist der Bericht des Handy-Prüfers.

## G. Gegenprüfung auf dem Windows-PC

ZIP vom Handy auf den PC holen (Google Drive, E-Mail, Quick Share/„Nearby Share“ oder USB-Kabel → Ordner `Download`).

**Windows-Prüfer:**

1. EXE aus Teil B starten, ZIP auf die Fläche ziehen.
2. **„Kettenstatus zusätzlich abfragen“** einschalten → **„Paket prüfen“**. Erwartet: „KETTENABFRAGE ERFOLGREICH“.
3. **„Details anzeigen“**: Foto, alle Manifest- und Sensorangaben.
4. **„Bericht sichern“** → Dateityp **PDF** → speichern und öffnen.

**Kommandozeile** (im Ordner `DoiProof`, Pfad anpassen):

```powershell
npm run verify -- "$HOME\Downloads\DoiProof-....zip" --online --pdf "$HOME\Desktop\bericht-cli.pdf" --zeitzone Europe/Berlin
```

Alle drei PDF-Berichte (Handy, Windows-Prüfer, Kommandozeile) müssen dieselbe Berichtsnummer und dasselbe Ergebnis zeigen.

## H. Negativtest: verändertes Paket

1. Am PC die ZIP-Datei in einen Ordner entpacken (Rechtsklick → „Alle extrahieren“).
2. `manifest.json` mit dem Editor öffnen, **eine einzige Ziffer** ändern (z. B. bei `"latitude"`), speichern.
3. **Die vier Dateien** im Ordner markieren (nicht den Ordner selbst) → Rechtsklick → **„In ZIP-Datei komprimieren“** (Windows 11) bzw. „Senden an → ZIP-komprimierter Ordner“.
4. Diese neue ZIP im Windows-Prüfer prüfen: erwartet **„PRÜFUNG FEHLGESCHLAGEN“** mit „Manifest-Hash stimmt nicht überein“. Einen PDF-Bericht speichern: Banner rot, „Prüfung fehlgeschlagen“.
5. Die veränderte ZIP aufs Handy schicken und im Tab **„Prüfen“** importieren: dasselbe Ergebnis.

## I. Danach: automatischer Ablauf über GitHub und Expo

Wenn der Test passt:

1. **PR #25 mergen:** <https://github.com/neubuot/DoiProof/pull/25> → „Ready for review“ → „Squash and merge“.
2. **Robot-Token anlegen:** auf expo.dev in der Organisation `neubuots-team` einen Robot-Nutzer mit Rolle **Developer** anlegen und ein Token erzeugen. Das Token **nur** in GitHub eintragen, nirgends sonst speichern oder in einen Chat kopieren.
3. **GitHub-Secret setzen:** Repository → **Settings → Secrets and variables → Actions → New repository secret**, Name `EXPO_TOKEN`, Wert = Token.
4. **Release auslösen** (im Ordner `DoiProof`):

   ```powershell
   git checkout main
   git pull
   git tag v1.0.0
   git push origin v1.0.0
   ```

   Danach entsteht automatisch das GitHub-Release `v1.0.0` mit Windows-EXE, `SHA256SUMS.txt` und dem Abschnitt „Android-App 1.0.0 (APK für Tester)“ mit Expo-Downloadlink. Das neue APK lässt sich über die Test-App installieren (gleicher Signaturschlüssel, höherer `versionCode`).
5. **Tester einladen:** Link auf das Release bzw. [TESTER.md](TESTER.md) weitergeben.

Spätere JavaScript-Änderungen auf `main` erreichen installierte Apps automatisch über EAS Update (Kanal `preview`); aktiv nach dem zweiten App-Start.

## Wenn etwas hakt

| Problem | Lösung |
|---|---|
| `npx … kann nicht geladen werden` | Teil A, Schritt 2 (Skriptausführung erlauben) oder `cmd` verwenden. |
| `npm ci` scheitert | Node.js-Version prüfen (`node --version`, LTS 22 oder neuer), PowerShell neu öffnen, erneut versuchen. |
| `project:info` zeigt ein anderes Projekt oder „not authorized“ | Mit dem Konto anmelden, das Owner/Admin in `neubuots-team` ist (`npx eas-cli@latest logout`, dann `login`). |
| Build bricht ab | Build-Seite auf expo.dev öffnen, Log-Abschnitt mit rotem Fehler kopieren und hier im Chat schicken (ohne Tokens). |
| App startet, Blockabfrage scheitert | Internet prüfen; sonst Schalter „BTC- und Doichain-Block vor Kameraaufnahme“ für diesen Test ausschalten. |
| Status bleibt „Ausstehend“ | Doichain-Blöcke brauchen meist bis zu 10 Minuten, gelegentlich länger. „Offene prüfen“ später erneut. |
| Windows-Prüfer startet nicht | SmartScreen: „Weitere Informationen“ → „Trotzdem ausführen“. Antivirus kann ungesignierte EXE kurz prüfen. |

## Hilfe durch Claude

Claude kann dein Handy nicht bedienen, dich aber auf dem PC begleiten. Drei Wege, jeweils mit fertigem Prompt:

### 1. Claude in Chrome (Browser-Schritte)

Für GitHub- und Expo-Webseiten (Artefakt herunterladen, Build-Seite finden, Secret-Seite öffnen, PR mergen). Prompt:

> Hilf mir bei den Browser-Schritten aus der Anleitung https://github.com/neubuot/DoiProof/blob/claude/peaceful-ramanujan-qbwqku/docs/ERSTER-TEST.md (Teile B, C3 und I). Navigiere jeweils zur richtigen Seite und erkläre, was ich klicken soll. Wichtig: Gib niemals Tokens, Passwörter oder Secrets ein und lies sie nicht vor – die trage ich selbst ein. Führe Merge, Löschen oder Veröffentlichen erst aus, nachdem ich ausdrücklich „ja“ geschrieben habe.

### 2. Claude Code auf dem Windows-PC (Terminal-Schritte)

Für Teil A, die Kommandozeilen-Prüfung (G) und Fehlersuche. Interaktive Abfragen von `eas login` und `eas build` (Teil C) führst du selbst in einem eigenen PowerShell-Fenster aus. Prompt im Ordner `DoiProof`:

> Ich teste DoiProof nach docs/ERSTER-TEST.md. Prüfe zuerst, ob Git und Node.js installiert sind und der Branch claude/peaceful-ramanujan-qbwqku ausgecheckt ist, führe `npm ci` und `npm test` aus und erkläre mir das Ergebnis. Die Befehle `npx eas-cli login` und `npx eas-cli build` führe ich selbst in einem separaten Fenster aus; hilf mir, ihre Ausgaben zu deuten, wenn ich sie dir zeige. Wenn ich dir eine ZIP-Datei nenne, prüfe sie mit `npm run verify -- <datei> --online --pdf <bericht.pdf> --zeitzone Europe/Berlin`. Ändere keine Dateien im Repository, committe und pushe nichts, und frage nie nach Tokens oder Passwörtern.

### 3. Claude-App als Begleiter (Handy oder PC)

Für Rückfragen unterwegs, z. B. während du am Handy installierst. Prompt:

> Begleite mich Schritt für Schritt durch die Anleitung https://github.com/neubuot/DoiProof/blob/claude/peaceful-ramanujan-qbwqku/docs/ERSTER-TEST.md. Nenne mir immer nur den nächsten Schritt, warte auf meine Rückmeldung und hilf bei Fehlermeldungen. Frage nie nach Tokens, Passwörtern oder echten Fotos.

Du kannst Fehlermeldungen (ohne Tokens) auch hier in dieser Sitzung schicken; ich analysiere sie und passe bei Bedarf Code oder Anleitung an.
