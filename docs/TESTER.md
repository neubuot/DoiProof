# DoiProof testen: Anleitung für Tester

Danke, dass du DoiProof 1.0 testest. Die App erstellt aus einem Foto und Messwerten des Handys ein Beweispaket und verankert dessen Fingerabdruck (SHA-256) auf der Doichain. Mit dem Tab **„Prüfen“** kannst du außerdem Beweispakete prüfen und einen PDF-Prüfbericht erzeugen.

> **Wichtig:** Deine Nachweise liegen nur auf deinem Gerät. Beim Deinstallieren der App gehen sie verloren. Exportiere wichtige Nachweise vorher als **„Beweispaket ZIP“**.
>
> **Wechsel zur Play-Store-Version:** Die Version aus dem Google Play Store ist anders signiert als das Test-APK. Android installiert sie deshalb nicht über die Test-App: erst alle Nachweise als ZIP exportieren, dann die Test-App deinstallieren und DoiProof aus dem Play Store installieren. Die exportierten ZIPs lassen sich weiterhin im Tab „Prüfen“ prüfen.

## Android: Installation

1. Öffne den Download-Link aus der Einladung oder aus den [GitHub-Releases](https://github.com/neubuot/DoiProof/releases) (Abschnitt „Android-App … (APK für Tester)“) auf dem Android-Handy. Alternativ auf der Expo-Build-Seite den QR-Code mit der Handykamera scannen.
2. Die Datei `….apk` herunterladen (warnt Chrome vor dem Dateityp: „Trotzdem herunterladen“) und über die Download-Meldung oder „Dateien → Downloads“ öffnen.
3. Android fragt, ob der Browser bzw. die Dateien-App **unbekannte Apps installieren** darf: in den Einstellungen für diese App erlauben und zurückkehren. Auf Samsung-Geräten blockiert eventuell die „Automatische Sperre“ die Installation: unter Einstellungen → Sicherheit und Datenschutz → Automatische Sperre vorübergehend ausschalten und danach wieder einschalten.
4. **Google Play Protect** kann warnen oder einen Scan anbieten, weil die App nicht aus dem Play Store stammt: Scan zulassen bzw. „Weitere Details“ → „Trotzdem installieren“. Die App ist signiert; installiere sie nur über den Link aus der Einladung oder dem offiziellen Release.
5. DoiProof öffnen.

**Neue Versionen:**

- **Kleine Änderungen** (Texte, Prüflogik, Bericht) kommen automatisch als Update: Die App lädt sie beim Start im Hintergrund; aktiv werden sie beim **nächsten** Start. App also ganz schließen (aus der Übersicht wischen) und erneut öffnen. Unter „Über diese App“ → „Nach Update suchen“ geht es auch sofort.
- **Größere Änderungen** erfordern ein neues APK. Es wird einfach über die vorhandene App installiert; deine Nachweise bleiben erhalten.

## iPhone: Installation über TestFlight

1. Du erhältst eine Einladung per E-Mail oder einen öffentlichen TestFlight-Link.
2. Installiere die App **TestFlight** aus dem App Store.
3. Öffne die Einladung auf dem iPhone („In TestFlight anzeigen“ bzw. Einlösecode in TestFlight eingeben) und tippe auf **Installieren**.
4. Updates erscheinen in TestFlight; kleinere Änderungen kommen zusätzlich automatisch beim App-Start (wie bei Android, aktiv nach dem nächsten Neustart).
5. TestFlight-Versionen laufen nach 90 Tagen ab. Exportiere Nachweise rechtzeitig als ZIP.

## Erste Schritte

1. **Profil wählen:** „Privat“ (nur Foto und Zeit), „Standort & Sensoren“ (GPS, Bewegung, Kompass, Luftdruck, Licht, Bild- und Gerätedaten) oder „Individuell“.
2. **„Foto aufnehmen“** tippen. Beim ersten Mal fragt das System nach Kamera, Standort und (iPhone) „Bewegung & Fitness“. Du kannst jede Freigabe verweigern – die App vermerkt das dann im Beweispaket, statt abzubrechen.
3. Vor dem Öffnen der Kamera lädt die App aktuelle Bitcoin- und Doichain-Blöcke. Bei fehlendem Netz den Schalter „BTC- und Doichain-Block vor Kameraaufnahme“ ausschalten oder später erneut versuchen.
4. Nach der Aufnahme siehst du die Fingerabdrücke und welche Sensoren erfasst wurden. Mit „Nach Aufnahme sofort senden“ wird nur der Paket-Hash an die Doichain gesendet.
5. Im **Nachweisverlauf**: „Prüfbericht PDF“ prüft dein Paket mit derselben Logik wie die Prüfprogramme und erstellt den PDF-Bericht; „Beweispaket ZIP“ exportiert Foto und Manifest.
6. Im Tab **„Prüfen“**: ein ZIP (eigenes oder von jemand anderem) importieren, „Paket prüfen“, optional online abgleichen, „PDF-Prüfbericht erstellen und teilen“.

Ein frischer Nachweis ist zunächst **ausstehend**; die Bestätigung in einem Doichain-Block dauert meist bis zu etwa zehn Minuten. „Offene prüfen“ aktualisiert den Status.

## Was du bitte testest

- Aufnahme in beiden Profilen, mit und ohne Netz, mit verweigerter Standort- oder Bewegungsfreigabe.
- Sensoren: Sind im Prüfbericht (Anhang) Werte für Beschleunigung, Gyroskop, Magnetfeld/Kompass, Luftdruck und – nur Android – Licht vorhanden oder ausdrücklich als „nicht verfügbar“ vermerkt?
- Export als ZIP, Prüfen im Tab „Prüfen“ (auch ein ZIP von einem anderen Gerät), PDF teilen und öffnen.
- Ein verändertes ZIP (z. B. Foto im ZIP ausgetauscht) muss „Prüfung fehlgeschlagen“ ergeben.
- App-Neustart: Verlauf, lokale Entwürfe und „Jetzt senden“.

## Feedback geben

Bitte nenne: Gerät und Betriebssystemversion, die Zeile unter **„Über diese App“** (Version, Kanal, Update/Commit), die Schritte bis zum Fehler und was du erwartet hättest. Auf dem iPhone geht das auch direkt per Screenshot über TestFlight.

Das GitHub-Repository ist **öffentlich**. Lade dort keine echten Fotos, Beweispakete, Standorte oder Prüfberichte mit persönlichen Daten hoch. Schicke solche Dateien nur auf dem vereinbarten vertraulichen Weg.

## Datenschutz in Kürze

- Foto, genaue GPS-Koordinaten und Sensorwerte bleiben auf dem Gerät und im exportierten ZIP. Gesendet werden nur der Paket-Hash und eine kurze Notiz mit der Gerätezeit (öffentlich und dauerhaft auf der Doichain), öffentliche Blockabfragen und beim App-Start die Update-Abfrage bei Expo (mit einer zufälligen Installationskennung) – Ausnahme ist der Kartenausschnitt im PDF (nächster Punkt).
- Das Originalfoto im ZIP bleibt unverändert. Hat deine Kamera-App Ortsangaben ins Foto geschrieben (EXIF-GPS), stehen sie auch im Profil „Privat“ darin; im PDF-Bericht werden sie entfernt. Willst du das nicht, schalte die Ortsmarkierung in der Kamera-App aus.
- Der PDF-Prüfbericht kann das Foto und den Standort enthalten; beides lässt sich vor dem Erstellen ausschalten. Steht der Standort im Bericht, kommt standardmäßig ein Kartenausschnitt dazu (Schalter „Kartenausschnitt (OpenStreetMap)“, abschaltbar); dafür sieht der Kartendienst OpenStreetMap (ausgeliefert über Fastly) den Standort auf etwa 1 km genau und deine IP-Adresse.
- Gerätezeit, Ort und Sensorwerte sind Angaben deines Geräts. Der Bericht belegt, dass genau dieses Foto mit genau diesen Angaben seit dem Block unverändert ist – nicht, wer fotografiert hat oder ob das Motiv echt ist.

## Bekannte Einschränkungen

- Android unterbricht die Sensoren der App, solange die System-Kamera geöffnet ist. Die Messreihe liegt deshalb kurz vor und kurz nach der Aufnahme; iPhones messen auch währenddessen.
- iPhones haben keinen für Apps zugänglichen Lichtsensor; das wird als „nicht verfügbar“ vermerkt.
- Die Windows-Version des Prüfers ist nicht code-signiert; Windows SmartScreen kann warnen.
