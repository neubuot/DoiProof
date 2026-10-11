# DoiProof: ausführliches Benutzerhandbuch

**Stand:** Version 1.0.0, 5. Oktober 2026. Oberfläche und Datenformat können sich in späteren Versionen ändern; GitHub hält die Änderungen dieses Dokuments fest. Die Grundlagen zur Aussagekraft stehen in der [Produktbeschreibung](PRODUKT-UND-BEWEISKETTE.md).

## 1. Was DoiProof erzeugt

Ein Nachweis besteht aus der Fotodatei, einem **Manifest** mit den bei der Aufnahme gemessenen Angaben (Gerätezeit, Vorabblöcke und je nach Profil Standort, Bewegungs-, Kompass-, Luftdruck- und Lichtsensoren, Bild- und Gerätedaten) und dem gemeinsamen **Beweispaket-Hash**. Nur dieser Hash und eine kurze öffentliche Gerätenotiz gehen an den Doichain-Dienst. Nach der Aufnahme in einen Doichain-Block kann jeder prüfen, dass genau dieses Foto mit genau diesen Angaben seit diesem Block unverändert ist.

## 2. Installation

DoiProof 1.0 ist eine eigenständige App:

- **Android:** signiertes APK aus dem GitHub-Release bzw. von der Expo-Build-Seite.
- **iPhone:** über TestFlight nach Einladung.

Die Schritte für Tester stehen in [TESTER.md](TESTER.md). Kleinere Änderungen erhält die App automatisch als Update (aktiv nach dem nächsten Start); „Über diese App“ zeigt Version, Kanal und Update-Stand und bietet „Nach Update suchen“.

Für Entwicklung läuft die App weiterhin mit Expo Go über `npm start` (siehe [README](../README.md)); Updates sind dort nicht aktiv.

## 3. Aufnahme vorbereiten

Oben wechselt die App zwischen **„Aufnehmen“** und **„Prüfen“**.

### Metadatenprofil

| Profil | Was die App erfasst |
|---|---|
| „Privat“ | Kein Standort, keine Sensoren, keine Bild-/Gerätedetails. Foto-Hash, Gerätezeit, Profil und gegebenenfalls Vorabblöcke bleiben Bestandteil des Pakets. Das Manifest vermerkt ausdrücklich, dass Standort und Sensoren nicht angefordert wurden. |
| „Standort & Sensoren“ | Standort-Fix mit Koordinaten, Höhe, Genauigkeit, Richtung und Geschwindigkeit; Sensoren (Beschleunigung, Gyroskop, Magnetometer, Kompass, Luftdruck, Licht); Bild- und Gerätedaten. |
| „Individuell“ | Schalter für „GPS, Höhe und Genauigkeit“, „Bewegung, Kompass, Luftdruck, Licht“, „Bildformat und Abmessungen“ sowie „Betriebssystem und App-Version“ einzeln setzen. |

### Berechtigungen

Vor dem Öffnen der Kamera fragt die App die benötigten Freigaben ab: Kamera, Standort („beim Verwenden der App“) und auf dem iPhone „Bewegung & Fitness“. **Verweigerst du eine Freigabe, wird die Aufnahme nicht abgebrochen**: Das Manifest vermerkt dann „Berechtigung verweigert“ für den Standort bzw. die betroffenen Sensoren.

### Sensoren

Die Sensoren starten kurz vor dem Öffnen der Kamera und messen alle 200 ms. Für jeden Sensor speichert die App

- den **Einzelwert zur Aufnahme** mit Zeitstempel (der Messwert, der dem Moment der Rückkehr aus der Kamera am nächsten liegt),
- eine **kurze Messreihe** (höchstens je zehn Werte vor dem Öffnen der Kamera, bei geöffneter Kamera und nach der Rückkehr) und
- die Zahl aller empfangenen Werte.

Nicht vorhandene Sensoren (z. B. Lichtsensor auf dem iPhone, Barometer auf manchen Android-Geräten), verweigerte Freigaben, Fehler oder Sensoren ohne Messwert im Zeitfenster werden mit Status und Begründung vermerkt. Android unterbricht die Sensoren der App, solange die System-Kamera geöffnet ist; die Reihe liegt dann kurz vor und nach der Aufnahme. Der Kompass meldet ohne Standortfreigabe nur die magnetische Richtung.

### Vorabblöcke

„BTC- und Doichain-Block vor Kameraaufnahme“ ist standardmäßig aktiv. Vor dem Kameraaufruf holt die App Hash, Höhe und Headerzeit beider Ketten. Netzfehler verhindern den Kamerastart in diesem Modus; der Schalter lässt sich bewusst ausschalten. Bei „Foto wählen“ gibt es keine Vorabblöcke. Nach erfolgreicher Abfrage kann man in der Kamera beliebig lange warten; die Referenz sagt deshalb nichts Genaues über die Auslösezeit, belegt aber, dass das Paket nicht vor diesem Block entstanden sein kann.

## 4. Foto und Einreichung

1. „Foto aufnehmen“ oder „Foto wählen“ tippen.
2. Nach der Rückkehr berechnet die App den SHA-256 der Bilddatei, misst Standort und letzte Sensorwerte und erstellt das Manifest v3. Sichtbar sind Foto-, Manifest- und Paket-Hash, Standort, Sensorübersicht und Vorabblöcke.
3. „Tageskontingent“ zeigt die freien Einreichungen (ohne Schlüssel bis zu 10 je IP-Adresse und UTC-Tag, insgesamt höchstens 200). Maßgeblich ist die Serverantwort.
4. Optional einen eigenen PoE- oder Write-Schlüssel eintragen; er bleibt nur in dieser App-Sitzung im Speicher. **Niemals einen Admin-Schlüssel eintragen.**
5. „Nach Aufnahme sofort senden“ ist standardmäßig aktiv; schaltest du es aus, bleibt die Wahl auch nach einem Neustart gespeichert. Sonst „Nachweis anlegen“ tippen. „Status prüfen“ fragt den Status des angezeigten Hashs ab.

Foto und Manifest werden vor dem Senden im privaten App-Verzeichnis gesichert („Lokal gesichert“) und lassen sich nach einem Neustart mit „Jetzt senden“ einreichen. Bei fehlender Serverantwort zeigt die App „Einreichung unklar“ und fragt später nach. Die App legt das Foto nicht in der Galerie ab; sichere wichtige Nachweise als ZIP.

### Status

| Anzeige/API-Status | Bedeutung |
|---|---|
| `local` | Nur lokal gespeichert; noch keine Einreichung. |
| `submission_unknown` | Keine eindeutige Serverantwort; Status abfragen oder später erneut senden. |
| `unknown` („Nicht verankert“) | Der Dienst kennt den Hash nicht, etwa nach erschöpftem Tageskontingent; mit „Jetzt senden“ erneut einreichen. |
| `pending` | Eingereicht, noch kein bestätigter Block. |
| `confirmed` | Im Doichain-Block gefunden; Transaktion und Block lassen sich unabhängig prüfen. |
| `expired` | PoE-Name des Dienstes abgelaufen; die historische Transaktion besteht weiter. |

Offene Einträge werden beim Start, bei Rückkehr in die App, minütlich und mit „Offene prüfen“ aktualisiert.

## 5. Prüfbericht, Export und Aufbewahrung

Im „Nachweisverlauf“:

- **„Prüfbericht PDF“** baut das Beweispaket, prüft es mit derselben Logik wie Kommandozeile und Windows-Prüfer, gleicht es – wenn eingeschaltet – online ab und erstellt den PDF-Prüfbericht. Schalter: „Kettenstatus online abgleichen“, „Foto im Bericht“, „Standort im Bericht“ (standardmäßig aus) und „Kartenausschnitt (OpenStreetMap)“ (standardmäßig an; wirkt nur, wenn „Standort im Bericht“ an ist).
- **„Beweispaket ZIP“** teilt `original.<endung>`, `manifest.json`, `verification.json` und `README.txt`. Das ZIP enthält immer das Foto und das vollständige Manifest mit Standort und Sensorwerten.

Der Verlauf liegt nur auf diesem Gerät. App-Löschung oder Gerätewechsel beseitigen ihn; das exportierte ZIP ist für die langfristige Prüfung entscheidend. Eine zweite Kopie aufbewahren.

### Aufbau des PDF-Prüfberichts

1. **Seite 1:** Ergebnis (bestanden / unvollständig / fehlgeschlagen), Foto, „Auf einen Blick“, Zeitstrahl und „Was die Prüfung zeigt“ (gefüllt = mathematisch belegt, umrandet = stimmiges Indiz).
2. **Seite 2:** Beweiskette mit allen Hashwerten, Transaktion und Block, Zeitanker, QR-Code zu verifile.it, „Dieser Bericht belegt / belegt nicht“.
3. **Anhang:** zuerst der Kartenausschnitt, sofern der Standort im Bericht steht und die Karte nicht abgeschaltet ist (wie im Windows-Prüfer: Koordinaten, Karte mit Markierung, Quellenangabe), dann jede im Manifest gebundene Angabe nach Quelle, nicht erfasste Sensoren mit Grund, Messreihen als Minimum/Maximum/Mittelwert/Anzahl und in Anhang B jede Einzelmessung.

„Bestanden“ setzt den Online-Abgleich voraus. Ohne ihn ist das Ergebnis „unvollständig“: Das Paket ist unverändert, ein Zeitpunkt der Versiegelung ist aber noch nicht belegt.

## 6. Pakete prüfen (Tab „Prüfen“)

1. „ZIP-Beweispaket importieren“ und ein eigenes oder fremdes DoiProof-ZIP aus Dateien, Downloads oder einem Messenger wählen (bis 200 MiB, Manifest v1, v2 oder v3).
2. „Kettenstatus online abgleichen“ ein- oder ausschalten. Online werden nur der Paket-Hash und die Hashes der Vorabblöcke abgefragt.
3. „Paket prüfen“. Die Ergebniskarte zeigt dieselben Aussagen wie der PDF-Bericht.
4. Optional Foto, Standort oder „Kartenausschnitt (OpenStreetMap)“ für den Bericht abwählen (alle drei sind standardmäßig an) und „PDF-Prüfbericht erstellen und teilen“.

Ein verändertes oder beschädigtes Paket ergibt „Prüfung fehlgeschlagen“ mit der Stelle, an der die Kette bricht. Auch dafür lässt sich ein PDF erzeugen.

## 7. Technische Prüfung durch Dritte

Mit dem [Prüfprogramm](PRUEFPROGRAMM.md) lässt sich ein Paket unabhängig von der App prüfen: `npm run verify -- paket.zip --online --pdf bericht.pdf`. Für Windows gibt es den [Windows-Prüfer](DESKTOP-PRUEFER.md). Das Hashverfahren und die Kanonisierung (v3: RFC 8785) sind dort beschrieben. Zeitangaben getrennt behandeln: Gerätezeit, Standort-Messzeit, Sensorzeiten, Headerzeiten und Bestätigungsblockzeit sind unterschiedliche Quellen. `verification.json` ist ein Status-Schnappschuss und kein signierter Serverbeleg.

## 8. Häufige Fragen und Störungen

**Was ist der Unterschied zwischen PDF und ZIP?** Das PDF erläutert und dokumentiert die Prüfung; das ZIP enthält die nachrechenbaren Originalbytes. Für eine spätere Prüfung immer das ZIP aufbewahren.

**Belegen die Sensorwerte, dass das Foto echt ist?** Nein. Sie sind Angaben des Geräts zum Zeitpunkt der Aufnahme und sind gegen nachträgliche Änderung geschützt. Ein manipuliertes Gerät könnte sie fälschen. Sie sind ein Indiz, das mit anderen Umständen abgeglichen werden kann (z. B. Luftdruck und Höhe am angegebenen Ort).

**Warum fehlt der Lichtsensor?** iPhones stellen Apps keinen Umgebungslichtsensor zur Verfügung; manche Android-Geräte melden Licht nur bei Änderungen. Der Bericht vermerkt den Grund.

**Beweist der Vorabblock, dass das Foto später entstanden ist?** Nein. Er belegt, dass das Paket nicht vor dem Block erstellt wurde. Ein altes Bild könnte erneut fotografiert oder ausgewählt werden.

**Was passiert bei fehlendem Netz?** Vorabblöcke können die Kamera blockieren (Schalter ausschalten oder später erneut versuchen). Der Nachweis bleibt lokal gesichert, bis er gesendet wird.

**Welche Daten verlassen das Gerät?** Bei der Verankerung der Paket-Hash und eine kurze öffentliche Gerätenotiz; für Vorabblöcke und Online-Prüfungen öffentliche Blockabfragen; für Updates die Update-Abfrage bei Expo. Foto, Standort und Sensorwerte nicht. Ausnahme beim PDF-Bericht: Ist „Kartenausschnitt (OpenStreetMap)“ an (Standard, sobald der Standort im Bericht steht), lädt die App höchstens 12 Kartenkacheln von OpenStreetMap; der Kartendienst sieht dabei den ungefähren Standort (auf etwa 1 km genau) und deine IP-Adresse. Die Kacheln liegen danach sieben Tage im privaten Cache der App und werden nach Ablauf beim nächsten Kartenabruf gelöscht. Das Teilen von PDF oder ZIP ist eine bewusste Weitergabe durch dich.

**Wo finde ich den Software-Fingerprint?** Das Manifest enthält Version, gegebenenfalls Commit, Update-Kanal, Laufzeitversion und Update-ID – als Selbstauskunft, nicht als Attestierung ([Issue #6](https://github.com/neubuot/DoiProof/issues/6), [Issue #7](https://github.com/neubuot/DoiProof/issues/7)).

## 9. Dokumentation und Änderungen

[Kurzanleitung](KURZANLEITUNG.md), [Produkt- und Beweiskettenbeschreibung](PRODUKT-UND-BEWEISKETTE.md), dieses Handbuch, [ARCHITECTURE.md](ARCHITECTURE.md) und die [Release-Notes](../RELEASE_NOTES.md) gehören zum Repository. Änderungen an Oberfläche, Datenformat, Verankerung oder Export aktualisieren die betroffenen Dokumente im selben Pull Request. Bei älteren Paketen immer die Version im Manifest und den passenden Git-Stand heranziehen.
