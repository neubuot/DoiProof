# Play-Store-Eintrag: Texte, Grafiken und Screenshots

**Stand:** DoiProof 1.0.0, 11. Oktober 2026. Diese Seite enthält alle Texte und Grafiken für den Store-Eintrag in der Google Play Console. Die Texte sind kopierfertig: In jedem grauen Kasten oben rechts auf das Kopiersymbol klicken und in das passende Feld der Play Console einfügen. Standardsprache ist **Deutsch – de-DE**.

Die Texte formulieren bewusst so vorsichtig wie die App selbst. Sie versprechen nichts, was ein Hash nicht leisten kann, und nennen die Grenzen. Bitte beim Anpassen keine Wörter wie „rechtssicher“, „gerichtsfest“, „fälschungssicher“ oder „beweist die Echtheit“ ergänzen und keine Begriffe aus dem Umfeld von Kryptowährungen oder Geldanlagen („Krypto“, „Coin“, „Token“, „Wallet“, „Mining“, „Investment“). Solche Wörter verstoßen leicht gegen die Play-Richtlinien zu irreführenden Angaben oder lösen eine Einstufung als Finanz-App aus.

Das Repository ist öffentlich. Kontaktangaben stehen hier deshalb nur als Platzhalter in eckigen Klammern, etwa `[E-MAIL]`. Echte Namen, Anschriften, E-Mail-Adressen, Fotos und Standorte gehören nicht in diese Datei, sondern nur in die Play Console.

## Vorab zu entscheiden

| Punkt | Warum vorher |
|---|---|
| **Paketname** (derzeit `org.doichain.doiproof`, **noch nicht endgültig**) | Spätestens mit dem ersten hochgeladenen App-Bundle wird der Paketname fest mit dem Eintrag in der Play Console verbunden und lässt sich danach **nie mehr ändern**. `org.doichain.…` legt eine Verbindung zum Doichain-Projekt nahe. Ohne Zustimmung des Projekts kann Google das als Anmaßung einer fremden Identität werten. Entscheidung also **vor** „App erstellen“ treffen, etwa für eine umgekehrte eigene Domain wie `de.beispiel.doiproof`. |
| **Bezug zu Doichain in Name und Text** | Die Texte unten nennen Doichain nur sachlich als genutzte Blockchain, nie als Herausgeber oder Partner. Wörter wie „offiziell“ bitte nicht ergänzen. |
| **Datenschutzerklärung online** | Die URL muss beim Ausfüllen erreichbar sein (öffentlich, kein PDF). Die Vorlage für deine Website liegt bei den übrigen Play-Unterlagen. |
| **Kostenlos** | Beim Anlegen „Kostenlos“ wählen. Eine kostenlose App lässt sich später nicht mehr kostenpflichtig machen. |

Der **App-Name** im Store lässt sich dagegen später ändern.

## 1. App-Name

Feld: *Haupteintrag im Store → App-Name*, höchstens 30 Zeichen.

Vorschlag (24 Zeichen):

```text
DoiProof – Foto-Nachweis
```

Kürzere Variante (8 Zeichen), falls der Name allein stehen soll:

```text
DoiProof
```

Im App-Namen sind Zusätze wie „kostenlos“, „Nr. 1“, „neu“, „ohne Werbung“, Emojis oder Großbuchstaben zur Hervorhebung nicht erlaubt. Dasselbe gilt für den Entwicklernamen und das App-Symbol.

## 2. Kurzbeschreibung

Feld: *Haupteintrag im Store → Kurzbeschreibung*, höchstens 80 Zeichen.

Vorschlag (79 Zeichen):

```text
Foto und Aufnahmedaten zum Beweispaket binden, Hash auf der Doichain verankern.
```

Variante (75 Zeichen):

```text
Foto samt Aufnahmedaten nachweisbar machen: Hash auf der Doichain verankern
```

## 3. Vollständige Beschreibung

Feld: *Haupteintrag im Store → Vollständige Beschreibung*, höchstens 4000 Zeichen.

Länge: **3754 Zeichen** einschließlich Leerzeichen und Zeilenumbrüchen. Gezählt wurde per Skript, jeder Zeilenumbruch als ein Zeichen; zählt die Play Console Zeilenumbrüche doppelt, sind es 3792. Maßgeblich ist der Zähler in der Play Console. Die Platzhalter `[URL-DATENSCHUTZ]` und `[URL-IMPRESSUM]` am Ende vor dem Einfügen durch die echten Adressen ersetzen. Die beiden Adressen dürfen zusammen gut 200 Zeichen länger sein als die Platzhalter. Wer später Text ergänzt, zählt in der Play Console nach.

```text
DoiProof verbindet ein Foto mit den bei der Aufnahme gemessenen Angaben zu einem Beweispaket und verankert dessen digitalen Fingerabdruck (SHA-256-Hash) auf der öffentlichen Blockchain Doichain. Wer das Beweispaket erhält, kann später nachrechnen, dass genau dieses Foto mit genau diesen Angaben spätestens zur Zeit des bestätigenden Blocks vorlag und seitdem unverändert ist.

SO FUNKTIONIERT ES
• Foto aufnehmen oder auswählen. Die App berechnet den Hash der Bilddatei auf dem Gerät.
• Profil wählen: „Privat“ (Manifest ohne Standort und Sensoren), „Standort & Sensoren“ oder „Individuell“. Zur Gerätezeit kommen je nach Profil Standort und, bei Kameraaufnahmen, Messwerte von Bewegung, Kompass, Luftdruck und Licht hinzu, soweit das Gerät sie liefert.
• Vor einer Kameraaufnahme ruft die App die aktuellen Blöcke von Bitcoin und Doichain ab (abschaltbar). Sie zeigen, dass das Manifest nicht vor diesen Blöcken erstellt wurde; das Foto selbst könnte älter sein.
• Nur der Hash des Pakets und eine kurze Notiz (bei Kameraaufnahmen mit der Aufnahmezeit laut Gerät) gehen an den Doichain-Dienst. Voreingestellt sendet die App sofort nach der Aufnahme; abschaltbar, die Wahl bleibt gespeichert.
• Sobald die Einreichung in einem Doichain-Block steht, meist nach 10 bis 30 Minuten, ist der Nachweis bestätigt.

PRÜFEN UND WEITERGEBEN
• Beweispaket als ZIP teilen: Originalfoto, Manifest mit allen Angaben, Status und Prüfanleitung.
• PDF-Prüfbericht mit Ergebnis, Beweiskette, allen Messwerten und auf Wunsch einem Kartenausschnitt.
• Prüfer in der App: eigene oder fremde ZIP-Pakete importieren, auf dem Gerät prüfen und optional online abgleichen.
• Unabhängig nachprüfbar mit dem quelloffenen Prüfer für Kommandozeile und Windows (github.com/neubuot/DoiProof).

WOFÜR
Zustand nach einem Schaden, Übergabe einer Mietwohnung, Baufortschritt, Inventar für die Versicherung, Arbeitsergebnisse für Auftraggeber.

WAS EIN NACHWEIS BELEGT – UND WAS NICHT
• Belegt: Diese Dateibytes und dieses Manifest lagen spätestens zur Zeit des bestätigenden Blocks vor und sind seitdem unverändert.
• Belegt nicht: wer das Foto gemacht hat, ob das Motiv echt ist und wann genau ausgelöst wurde.
• Gerätezeit, Standort, Sensorwerte und App-Version sind Angaben des Geräts, also Selbstauskünfte. Ein manipuliertes Gerät könnte sie fälschen.
• Blockzeiten sind keine sekundengenauen Uhrzeiten. DoiProof stellt keinen qualifizierten Zeitstempel nach eIDAS aus. Wie ein Nachweis zu bewerten ist, entscheidet der Einzelfall.

DATENSCHUTZ
• Foto, genaue GPS-Koordinaten und Sensorwerte bleiben auf deinem Gerät, bis du ZIP oder PDF selbst teilst.
• Kartenausschnitt im PDF (abschaltbar): Die App lädt Kartenkacheln von OpenStreetMap, ausgeliefert über Fastly (USA). Der Kartendienst sieht dabei deine IP-Adresse und die Umgebung des Standorts (etwa 1 km).
• Das Originalfoto im ZIP bleibt unverändert. Schreibt deine Kamera-App den Aufnahmeort hinein, steht er dort auch im Profil „Privat“. Im Foto des PDF-Berichts ist er entfernt.
• Paket-Hash und Notiz stehen öffentlich und dauerhaft auf der Blockchain und lassen sich nicht löschen.
• Die Einreichung läuft über den Doichain-Dienst, Blockabfragen zusätzlich über Blockstream. Beide sehen dabei deine IP-Adresse.
• Beim Start fragt die App bei Expo nach Updates und überträgt dabei eine zufällige Installationskennung.
• Kein Konto, keine Werbung, kein Tracking.

GUT ZU WISSEN
• Die Verankerung braucht Internet. Sie ist kostenlos und begrenzt: derzeit 10 Nachweise je IP-Adresse und Tag, dazu eine Tagesgrenze des Dienstes.
• Der Nachweisverlauf liegt nur auf diesem Gerät und geht beim Deinstallieren verloren. Wichtige Nachweise deshalb als ZIP sichern.

Datenschutzerklärung: [URL-DATENSCHUTZ]
Impressum: [URL-IMPRESSUM]
```

## 4. Kategorie und Tags

Felder: *Store-Präsenz → Store-Einstellungen*. Die Menübezeichnungen können je nach Version der Play Console leicht abweichen.

| Feld | Vorschlag | Begründung |
|---|---|---|
| App oder Spiel | **App** | |
| Kategorie | **Tools** | DoiProof ist ein Werkzeug, das Nachweise erstellt und prüft. In „Fotografie“ erwarten Nutzer Kamera- und Bildbearbeitungs-Apps; dort würde DoiProof mit diesen verglichen. Ersatzweise passt „Produktivität“. **Nicht** „Finanzen“ wählen. |
| Tags | bis zu 5 aus Googles fester Liste | Google bietet im Dialog „Tags verwalten“ eine vorgegebene Liste mit Vorschlägen an. Dort nach diesen Begriffen suchen und nur übernehmen, was wirklich passt: *Kamera*, *Foto*, *Dokumente*, *Dienstprogramme*. Nicht wählen: alles zu Finanzen, Kryptowährungen oder Antivirus/Sicherheit, weil die App dann mit fachfremden Apps verglichen wird. Bleiben weniger als 5 passende Tags, lieber weniger wählen. |

## 5. Kontaktangaben

Felder: *Store-Präsenz → Store-Einstellungen → Kontaktdaten im Store*, dazu die Datenschutzerklärung unter *Richtlinien und Programme → App-Inhalte*.

| Feld | Eintrag | Hinweis |
|---|---|---|
| E-Mail-Adresse (Pflicht) | `[E-MAIL]` | Wird im Store **öffentlich** angezeigt. Am besten eine eigene Support-Adresse statt der persönlichen. |
| Telefonnummer (optional) | leer lassen oder `[TELEFON]` | Wird ebenfalls öffentlich angezeigt. |
| Website (optional) | `[WEBSITE]` | Die Seite, auf der auch Impressum und Datenschutzerklärung liegen. |
| Datenschutzerklärung (Pflicht) | `[URL-DATENSCHUTZ]` | Muss zur Datenschutzerklärung auf deiner Website führen und zu den Angaben im Formular „Datensicherheit“ passen. Dieselbe Adresse gehört in die App („Über diese App“); der Link wird dort vor dem Build eingebaut, sobald die URL feststeht ([PLAY-STORE.md, Teil 0](../PLAY-STORE.md#0-vorab-entscheidungen)). |
| Impressum | `[URL-IMPRESSUM]` | Play hat dafür kein eigenes Feld. Üblich ist der Link am Ende der Beschreibung (siehe oben) und auf der Website. |
| Entwicklername | `[VERANTWORTLICHER]` | Kommt aus dem Organisationskonto und gilt für alle Apps des Kontos. |
| Händlerstatus (EU) | `[ANSCHRIFT]`, `[TELEFON]` | Laut Recherche fragt die Play Console für den Vertrieb in der EU ab, ob du als Händler auftrittst. Bei einem Organisationskonto ist das wahrscheinlich. Dann sehen EU-Nutzer Anschrift und Telefonnummer; dafür geschäftliche Angaben verwenden. Den genauen Wortlaut im Konto prüfen. |

Das Organisationskonto ist nach den vorliegenden Quellen von der Pflicht zum 14-tägigen geschlossenen Test mit 12 Testern befreit. Ob die Play Console das für dein Konto genauso sieht, zeigt das Dashboard.

## 6. „Was ist neu“ für Version 1.0.0

Diese Versionshinweise trägst du nicht im Store-Eintrag ein, sondern beim Hochstufen des getesteten Releases in die Produktion ([PLAY-STORE.md, Teil 10](../PLAY-STORE.md#10-produktion), Schritt 3) in das Feld **Versionshinweise**. Für den internen Test genügt ein kurzer Satz (Teil 9, Schritt 2). Höchstens 500 Zeichen je Sprache. Die Sprachmarken `<de-DE>` und `</de-DE>` gehören dazu, Google zählt nur den Text dazwischen.

Länge des Textes zwischen den Sprachmarken: **384 Zeichen** (per Skript gezählt, bei doppelt gezählten Zeilenumbrüchen 389).

```text
<de-DE>
Erste Version im Play Store.
• Foto aufnehmen oder auswählen und mit Gerätezeit, auf Wunsch auch Standort und (bei Kameraaufnahmen) Sensorwerten, zu einem Beweispaket binden
• Hash des Pakets auf der Doichain verankern
• Beweispaket als ZIP und PDF-Prüfbericht teilen
• ZIP-Pakete direkt in der App prüfen
Wichtige Nachweise bitte als ZIP sichern: Der Verlauf liegt nur auf dem Gerät.
</de-DE>
```

### Nachricht an bisherige Tester

Nicht in den Store, sondern per E-Mail oder Messenger an alle, die das Test-APK installiert haben. Gilt, solange der Paketname gleich bleibt: Die Play-Version ist von Google signiert, die Test-App von Expo. Android behandelt beide als unvereinbar, deshalb muss die Test-App vorher weg. Bei einem neuen Paketnamen können beide Apps nebeneinander bestehen; dann entfällt Schritt 3.

```text
DoiProof gibt es jetzt im Google Play Store. Die Play-Version lässt sich nicht über die Test-App installieren. Bitte so vorgehen:
1. In der Test-App unter „Aufnehmen“ → Nachweisverlauf: Einträge mit „Lokal gesichert“, „Nicht verankert“ oder „Einreichung unklar“, die verankert werden sollen, mit „Jetzt senden“ einreichen und warten, bis „Bestätigt“ erscheint („Offene prüfen“ aktualisiert den Status). Die Play-Version kann importierte ZIP-Dateien nur prüfen, nicht mehr einreichen.
2. Danach jeden Nachweis, den du behalten willst, mit „Beweispaket ZIP“ exportieren und die ZIP-Dateien an einem sicheren Ort ablegen (z. B. Google Drive).
3. Die Test-App deinstallieren. Dabei wird der Nachweisverlauf auf dem Handy gelöscht; die exportierten ZIP-Dateien und die Einträge auf der Doichain bleiben erhalten.
4. DoiProof aus dem Play Store installieren. Die gesicherten ZIP-Dateien kannst du im Tab „Prüfen“ jederzeit wieder prüfen.
```

## 7. Grafiken

Beide Dateien liegen in diesem Ordner und sind fertig zum Hochladen unter *Haupteintrag im Store → Grafiken*.

| Datei | Play-Feld | Vorgabe von Google | Erzeugt |
|---|---|---|---|
| [`icon-512.png`](icon-512.png) | App-Symbol | 512 × 512 px, PNG 32 Bit mit Alphakanal, höchstens 1 MB | 512 × 512, PNG RGBA, voll deckend, 14 KB |
| [`feature-graphic.png`](feature-graphic.png) | Funktionsgrafik (Pflicht) | 1024 × 500 px, JPEG oder PNG 24 Bit **ohne** Alphakanal | 1024 × 500, PNG RGB, 74 KB |

- **App-Symbol:** aus `assets/icon.png` verkleinert. Die dünnen Ringe im Original sind halbtransparent; sie sind auf den Petrol-Hintergrund gerechnet, damit das Symbol im hellen und im dunklen Store gleich aussieht. Ecken und Schatten ergänzt Google selbst, deshalb ist das Symbol quadratisch.
- **Funktionsgrafik:** Petrol-Hintergrund wie in der App, links das App-Symbol, rechts „DoiProof“ und „Dein Foto. Dein Nachweis.“. Alles Wichtige steht mittig mit breitem Rand, weil Google die Grafik je nach Ansicht beschneidet. Kein Gerät, keine Bildschirminhalte, kein Kleingedrucktes.

## 8. Screenshots

Feld: *Haupteintrag im Store → Screenshots für Smartphones*.

### Vorgaben

- **2 bis 8 Screenshots** je Gerätetyp. Für Empfehlungen im Store nennen Drittquellen mindestens 4 Screenshots mit mindestens 1080 px; 6 sind ein guter Wert.
- **Format:** JPEG oder PNG mit 24 Bit, ohne Alphakanal.
- **Größe:** jede Seite zwischen 320 und 3840 px. Die lange Seite darf höchstens doppelt so lang sein wie die kurze.
- **Seitenverhältnis:** Hochformat **9:16**, ideal **1080 × 1920 px**. Querformat wäre 16:9.
- Viele aktuelle Handys erzeugen Screenshots im Format 20:9, etwa 1080 × 2400. Die lange Seite ist dann mehr als doppelt so lang wie die kurze, und Google lehnt das Bild ab. Deshalb wie unten beschrieben zuschneiden.

### Datenschutz bei den Aufnahmen

- **Nur Testdaten.** Ein neutrales Testmotiv fotografieren, etwa eine Tasse, eine Pflanze oder ein Blatt mit dem Wort „Testfoto“. Keine Personen, Kennzeichen, Dokumente oder Bildschirme und nicht an deiner Wohnadresse.
- **Profil „Privat“** verwenden. Für den Sensor-Screenshot „Individuell“ mit ausgeschaltetem „GPS, Höhe und Genauigkeit“. So erscheinen nirgends Koordinaten.
- In der Kamera-App die Ortsmarkierung ausschalten (je nach Hersteller etwa „Standort-Tags“ oder „Standort speichern“). Sonst steht der Aufnahmeort im Originalfoto der Test-ZIPs, auch im Profil „Privat“.
- Beim PDF-Bericht **„Standort im Bericht“ aus** lassen. Dann gibt es auch keinen Kartenausschnitt.
- Jede Einreichung steht öffentlich und dauerhaft auf der Doichain und verbraucht Tageskontingent. Zwei oder drei Test-Nachweise reichen.
- Vorher Benachrichtigungen ausblenden („Bitte nicht stören“), damit in der Statusleiste nichts Privates erscheint.
- Screenshots mit Testdaten nur in die Play Console hochladen, nicht ins Repository.

### Reihenfolge

Die ersten Bilder sind im Store ohne Wischen zu sehen. Sie zeigen deshalb den Ablauf: Aufnahme, Beweispaket, Bestätigung.

| Nr. | Bildschirm | So einstellen |
|---|---|---|
| 1 | **Aufnehmen**, oberer Bereich | Ganz nach oben scrollen. Sichtbar: „Dein Foto. Dein Nachweis.“, Profil „Privat“ ausgewählt, „Foto aufnehmen“ und „Foto wählen“. |
| 2 | **Nach der Aufnahme** | Testfoto mit „Foto aufnehmen“ erstellen. So scrollen, dass Vorschau, die drei Hashwerte (Foto, Manifest, Beweispaket) und die Vorabblöcke zu sehen sind. |
| 3 | **Nachweisverlauf** | Warten, bis der Eintrag „Bestätigt“ zeigt. Sichtbar: Eintrag mit Status sowie „Prüfbericht PDF“ und „Beweispaket ZIP“. |
| 4 | **Prüfen**, Ergebnis | ZIP des Testnachweises im Tab „Prüfen“ importieren, „Kettenstatus online abgleichen“ an, „Paket prüfen“. Sichtbar: „Auf einen Blick“ und „Beweiskette“. |
| 5 | **PDF-Prüfbericht, Seite 1** | Bericht mit „Foto im Bericht“ an und „Standort im Bericht“ aus erstellen und in einer PDF-Ansicht öffnen. |
| 6 | **PDF-Prüfbericht, Seite 2** | Beweiskette, Zeitanker, QR-Code sowie „Dieser Bericht belegt / belegt nicht“. |
| 7 | *optional:* **Sensoren** | Profil „Individuell“, nur „Bewegung, Kompass, Luftdruck, Licht“ an. Nach einer Aufnahme den Abschnitt „Sensoren (Geräteangaben)“ zeigen. |
| 8 | *optional:* **Über diese App** | Erst, wenn dort die Links zu Datenschutz und Impressum eingebaut sind. |

**Offener Punkt zu Nr. 4 und 5:** Das Ergebnisbanner lautet bei bestandener Prüfung „Echt versiegelt und unverändert.“, und sein Begleittext enthält das Wort „fälschungssicher“. Das geht weiter als die Beschreibung oben. Vor den Aufnahmen klären, ob der Bannertext angepasst wird. Sonst Nr. 4 so scrollen, dass das Banner nicht im Bild ist, und Nr. 5 weglassen.

### Aufnehmen und auf 9:16 zuschneiden

1. Auf dem Handy **Ein/Aus-Taste und Leiser-Taste** gleichzeitig kurz drücken. Die Bilder landen in der Galerie unter „Screenshots“.
2. Die Screenshots auf den PC holen (Google Drive, Quick Share, E-Mail oder USB-Kabel) und in den Ordner `Downloads\doiproof-roh` legen. Am besten gleich nach der Reihenfolge benennen: `01.png`, `02.png` …
3. PowerShell öffnen und Folgendes einfügen. Der Befehl schneidet jedes Bild von oben auf 9:16 zu, bringt es auf 1080 × 1920 px und speichert es als JPEG ohne Alphakanal in `Downloads\doiproof-play`. Die Originale bleiben unverändert.

   ```powershell
   Add-Type -AssemblyName System.Drawing
   $quelle = "$HOME\Downloads\doiproof-roh"
   $ziel = "$HOME\Downloads\doiproof-play"
   $oben = 0   # Pixel, die oben wegfallen, z. B. 110 für die Statusleiste
   New-Item -ItemType Directory -Force $ziel | Out-Null
   $jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
   $qualitaet = [System.Drawing.Imaging.EncoderParameters]::new(1)
   $qualitaet.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]92)
   foreach ($datei in Get-ChildItem "$quelle\*" -Include *.png, *.jpg) {
     $bild = [System.Drawing.Image]::FromFile($datei.FullName)
     $hoehe = [int][math]::Round($bild.Width * 16 / 9)
     if ($oben + $hoehe -gt $bild.Height) { Write-Warning "$($datei.Name): zu kurz, `$oben verkleinern"; $bild.Dispose(); continue }
     $neu = [System.Drawing.Bitmap]::new(1080, 1920, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
     $stift = [System.Drawing.Graphics]::FromImage($neu)
     $stift.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
     $stift.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
     $stift.DrawImage($bild, [System.Drawing.Rectangle]::new(0, 0, 1080, 1920), [System.Drawing.Rectangle]::new(0, $oben, $bild.Width, $hoehe), [System.Drawing.GraphicsUnit]::Pixel)
     $stift.Dispose(); $bild.Dispose()
     $neu.Save((Join-Path $ziel ($datei.BaseName + '.jpg')), $jpeg, $qualitaet)
     $neu.Dispose()
     "$($datei.Name) -> $($datei.BaseName).jpg"
   }
   ```

4. Die Ergebnisse im Ordner `doiproof-play` ansehen. Fehlt oben etwas Wichtiges oder steht unten Überflüssiges, `$oben` anpassen und den Block erneut einfügen. Mit `$oben = 110` (bei 1080 px Breite) fällt meist die Statusleiste mit Uhrzeit und Akku weg. Den passenden Wert für dein Handy findest du durch Ausprobieren.
5. Kontrolle: Rechtsklick auf ein Bild → *Eigenschaften* → *Details*. Dort muss 1080 × 1920 stehen.

Der Befehl nutzt nur Bordmittel von Windows. Er wurde nicht auf einem Windows-PC getestet. Meldet PowerShell einen Fehler, kannst du die Bilder auch mit der App „Fotos“ zuschneiden (*Bild bearbeiten → Zuschneiden*, festes Seitenverhältnis 16:9 hochkant) und anschließend in Paint mit *Speichern unter → JPEG-Bild* sichern.

## 9. Vor dem Speichern prüfen

- [ ] Paketname entschieden, bevor die App in der Play Console angelegt wird.
- [ ] Platzhalter `[URL-DATENSCHUTZ]` und `[URL-IMPRESSUM]` in der Beschreibung ersetzt, beide Seiten im Browser erreichbar.
- [ ] Beschreibung und Datenschutzerklärung nennen dieselben Dienste: Doichain-Dienst, Blockstream, OpenStreetMap (ausgeliefert über Fastly), Expo.
- [ ] Kein Text und kein Screenshot verspricht mehr als die Beschreibung, also nichts wie „rechtssicher“, „gerichtsfest“ oder „fälschungssicher“.
- [ ] Auf keinem Screenshot sind Koordinaten, Karten, Personen, Namen oder private Benachrichtigungen zu sehen.
- [ ] App-Symbol und Funktionsgrafik aus diesem Ordner hochgeladen.
