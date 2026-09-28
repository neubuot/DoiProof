# DoiProof: ausführliches Benutzerhandbuch

**Stand:** Version 0.4, 28. September 2026. Die Funktion mit BTC- und Doichain-Vorabblöcken ist implementiert, aber noch nicht auf einem Mobilgerät getestet. Oberfläche und Datenformat können sich in späteren Versionen ändern; GitHub hält die Änderungen dieses Dokuments fest.

## 1. Was DoiProof erzeugt

Ein Nachweis besteht aus der ausgewählten Fotodatei, einem Manifest mit den bewusst gewählten Metadaten und dem gemeinsamen Beweispaket-Hash. Nur dieser Hash und eine kurze öffentliche Gerätenotiz werden an den Doichain-Dienst gesendet. Nach bestätigter Aufnahme in einen Block kann ein Dritter die Identität der vorgelegten Bytes und deren zeitlich eingeordneten Paketbestand prüfen. Die [Produktbeschreibung](PRODUKT-UND-BEWEISKETTE.md) erklärt die Aussagekraft und Grenzen ausführlich.

Für Entwicklung und Tests läuft die App mit Expo Go auf Android oder iOS. Ein eigener Release-Build mit attestierter App-Identität ist noch nicht eingerichtet. Die DoiProof-Oberfläche benötigt den laufenden Expo-Entwicklungsserver auf dem Notebook, solange sie über diesen Weg gestartet wird. Der Gerätestand von Version 0.4 ist noch offen.

## 2. Start über das Notebook

Im lokalen Git-Klon von DoiProof auf dem Notebook:

```sh
git pull
npm ci
npm start
```

Den QR-Code mit Expo Go öffnen. Wenn die direkte Verbindung zwischen Telefon und Notebook nicht funktioniert, den Server gegebenenfalls mit `npm start -- --tunnel` neu starten. Der private GitHub-Klon erfordert die gewohnte GitHub-Berechtigung. Nach Änderungen im Repository erst `git pull`, dann bei geänderten Abhängigkeiten `npm ci`; der aktuelle Code liegt im GitHub-Branch `main`. Ein Notebook-Test ist nicht notwendig, um diese Anleitung zu lesen.

## 3. Aufnahme vorbereiten

### Metadatenprofil

| Profil | Was die App erfasst |
|---|---|
| „Privat“ | Kein angeforderter GPS-Standort und keine optionalen Bild-/Gerätedetails. Das Foto selbst, sein Hash, Gerätezeit, Profil und gegebenenfalls Vorabblöcke bleiben Bestandteil des Pakets. |
| „Standortnachweis“ | Standort-Fix mit Koordinaten und verfügbaren Feldern wie Höhe, Genauigkeit, Richtung und Geschwindigkeit; dazu Bild- und Geräteangaben. Die Betriebssystemfreigabe ist nötig. |
| „Individuell“ | Schalter für „GPS, Höhe und Genauigkeit“, „Bildformat und Abmessungen“ sowie „Betriebssystem und App-Version“ einzeln setzen. |

Ein GPS-Fix wird nach Rückkehr von Kamera oder Mediathek gemessen; er ist keine Messung im Moment des Auslösens. Fehler, Abschattung oder simulierte Gerätestandorte sind möglich. Standortverweigerung führt bei aktivierter Standortoption zu einer Fehlermeldung; „Privat“ oder deaktiviertes GPS ermöglicht einen erneuten Versuch.

Die App-Version im Manifest wird unabhängig vom Metadatenschalter als Selbstauskunft gespeichert. Ein Quellcode-Commit wird nur eingetragen, wenn die Entwicklungsumgebung ihn beim Start bereitstellt. Beide Angaben sind keine Prüfung der ausführbaren Datei.

### Vorabblöcke

„BTC- und Doichain-Block vor Kameraaufnahme“ ist standardmäßig aktiv. Vor dem Kameraaufruf holt die App den jeweils aktuellen Block-Hash, die Höhe und die Headerzeit beider Ketten. Netzfehler verhindern den Kamerastart in diesem Modus. Nach erfolgreicher Abfrage kann man in der Kamera beliebig lange warten; die Referenz sagt deshalb nichts Genaues über die Auslösezeit. Bei ausgeschaltetem Schalter kann fotografiert werden, sofern die übrigen Voraussetzungen erfüllt sind; das Paket enthält dann keine Vorabblöcke. Bei „Foto wählen“ sind Vorabblöcke nie als Vorabaufnahme eingetragen.

Die Abfragezeiten und die spätere Aufnahme-Gerätezeit stammen vom Gerät. Die Existenz der genannten Blöcke lässt sich unabhängig prüfen; der behauptete Ablauf auf dem Gerät ist bislang nicht attestiert.

## 4. Foto und Einreichung

1. „Foto aufnehmen“ oder „Foto wählen“ tippen. Bei Bedarf die Kamera-/Mediathekfreigabe erteilen.
2. Nach Rückkehr berechnet die App den SHA-256 der gelieferten Bilddatei und erstellt das Manifest. Sichtbar sind Foto-Hash, Manifest-Hash und Beweispaket-Hash; bei aktivem Vorabmodus auch die Blockreferenzen.
3. Das Feld „Tageskontingent“ mit „Kontingent aktualisieren“ abfragen. Ohne Schlüssel nennt die derzeitige App bis zu 10 Einreichungen je vom Server gesehener IP-Adresse und UTC-Tag und einen gemeinsamen Tagesdeckel von 200. VPN, Proxy und geteilter Anschluss können dasselbe Kontingent nutzen. Maßgeblich ist die aktuelle Serverantwort.
4. Optional „Eigener PoE- oder Write-Schlüssel“ eintragen. Der Schlüssel wird während dieser App-Sitzung im Speicher gehalten und an den MCP-Dienst übertragen. **Niemals einen Admin-Schlüssel eintragen.**
5. „Nach Aufnahme sofort senden“ ist standardmäßig aktiv und greift auch bei einem aus der Mediathek gewählten Bild. Bei deaktiviertem Schalter „Nachweis anlegen“ tippen. „Status prüfen“ fragt den Status des gerade ausgewählten Hashs ab.

Falls eine Übertragung fehlschlägt, ist der ausgewählte Inhalt nicht allein deshalb im Nachweisverlauf gespeichert. Eine lokale Kopie der Bilddatei wird erst nach angenommener Einreichung abgelegt. Die App behauptet keine automatische Galerie-Sicherung. Im Zweifel Einreichung und Verlauf prüfen, dann ein vollständiges ZIP exportieren.

### Status

| Anzeige/API-Status | Bedeutung |
|---|---|
| `pending` | Vom Dienst als ausstehend gemeldet; noch kein bestätigter Blocknachweis. |
| `confirmed` | Nachweis wurde im Doichain-Block gefunden; Transaktion und Block unabhängig nachprüfen. |
| `expired` | PoE-Status des Dienstes abgelaufen; eine historisch bestätigte Transaktion kann weiter bestehen. Den konkreten Ketteneintrag selbst prüfen. |
| Sonstiger Status oder Fehler | Keine Bestätigung aus dem Wortlaut ableiten; Abfrage und gegebenenfalls Dienst prüfen. |

Der Verlauf prüft offene Einträge beim App-Start, bei Rückkehr in den Vordergrund, während der Nutzung und mit „Offene prüfen“. Eine ergänzende Abfrage des Transaktionsblocks kann einen Block-Hash hinzufügen; fehlt er im lokalen Verlauf, ist die Transaktion gesondert zu verifizieren. Die lokal gespeicherte Anzahl der Bestätigungen ist nur ein früherer Abfragestand.

## 5. Export und Aufbewahrung

Im „Nachweisverlauf“:

- „PDF-Beleg“ erstellt eine lesbare Zusammenfassung und öffnet den Systemdialog zum Teilen. Je nach Gerät kann Drucken als Alternative erscheinen. Erst eine abgeschlossene Freigabe/Speicherung im Zielsystem bewahrt eine externe Kopie.
- „Sensible Metadaten im PDF zeigen“ steuert nur die Anzeige im PDF. Das vollständige ZIP enthält immer das ausgewählte Bild und das vollständige Manifest mit den tatsächlich erfassten Koordinaten und Geräteangaben.
- „Beweispaket ZIP“ teilt `original.<endung>`, `manifest.json`, `verification.json` und `README.txt`. Den Export in einem gesicherten Verzeichnis ablegen, eine zweite Kopie aufbewahren und Empfängern nur bewusst Zugriff geben.

Der Nachweisverlauf und die bewahrte Bildkopie liegen lokal in der App. Es gibt derzeit keine automatische Synchronisierung oder ZIP-Importfunktion. App-Löschung, Gerätewechsel oder Datenverlust können den internen Verlauf beseitigen. Ein exportiertes ZIP ist deshalb für die langfristige unabhängige Prüfung entscheidend. Ältere Nachweise ohne Manifest oder fehlende Bilddatei erlauben keinen vollständigen ZIP-Export.

## 6. Technische Prüfung eines übergebenen Pakets

Die vier Hash-Schritte für v2 sind:

```text
foto = SHA-256(Bytes von original.<endung>)
manifest = SHA-256(UTF-8 des kanonischen Manifest-JSON ohne Schluss-Zeilenumbruch)
paket = SHA-256(UTF-8 von "DoiProof:v2\nphoto:<foto>\nmanifest:<manifest>"))
```

Die Zeichenfolge enthält zwei echte Zeilenumbrüche und keinen am Ende. Kanonisierung nach `src/evidence.ts`: Objektschlüssel rekursiv per JavaScript `localeCompare` sortieren, `undefined` weglassen und JSON ohne Formatierungsleerraum serialisieren. `manifest.json` im ZIP hat für die Lesbarkeit einen abschließenden Zeilenumbruch; zum Nachrechnen der Manifest-Bytes diesen ausnehmen. Die Werte müssen mit `verification.json` und `manifest.photo.sha256` übereinstimmen. Ein `sha256sum original.*` oder `shasum -a 256 original.*` prüft zunächst den Fotohash. Zur vollständigen Prüfung sind die konkrete Kanonisierung und für alte Pakete die jeweilige v1-Implementierung maßgeblich.

Dann den Paket-Hash unabhängig über Doichain `check_proof` oder eine eigene Kettenprüfung suchen, Transaktion und bestätigenden Block kontrollieren und gegebenenfalls die im Manifest genannten BTC-/DOI-Vorabblöcke auf ihren Ketten vergleichen. Zeitangaben getrennt behandeln: Gerätezeit, GPS-Messzeit, Headerzeiten und Bestätigungsblockzeit sind unterschiedliche Quellen. `verification.json` ist ein exportierter Status-Schnappschuss und kein signierter Serverbeleg. Für strittige Fälle eine fachkundige unabhängige Prüfung veranlassen.

## 7. Häufige Fragen und Störungen

**Was ist der Unterschied zwischen PDF und ZIP?** Das PDF erläutert den Nachweis; das ZIP enthält die überprüfbaren Originalbytes und das Manifest. Für die technische Nachrechnung das ZIP sichern.

**Beweist der Vorabblock, dass das Foto später entstanden ist?** Nein. Er belegt die Existenz eines genannten Blocks; die App meldet selbst, dass sie ihn vor dem Kameraaufruf gelesen hat. Alte Bilder und manipulierbare Geräte sind mögliche Gegenhypothesen.

**Beweist der Doichain-Block den Unfallort oder Eigentum am Gemälde?** Nein. Er bindet einen Paket-Hash an eine Transaktion. Ort, Gegenstand, Recht und Ereignis benötigen weitere Nachweise.

**Was passiert bei fehlendem Netz?** Vorabblöcke können die Kamera blockieren. Später erneut versuchen oder den Schalter für diese Aufnahme bewusst ausschalten. Ohne erfolgreiche Einreichung kein bestätigter Nachweis.

**Warum bleibt ein Nachweis `pending`?** Die Einreichung und die Aufnahme in einen Block sind verschiedene Schritte. Später „Offene prüfen“ verwenden und den Kettenstatus kontrollieren.

**Welche Daten verlassen das Gerät?** Bei der Verankerung der Paket-Hash und eine kurze öffentliche Gerätenotiz; für Vorabblöcke werden öffentliche Blockdienste kontaktiert. Auch ein solcher Netzwerkaufruf kann technische Verbindungsdaten beim Dienst hinterlassen. Bild und rohe Standortdaten werden von DoiProof dabei nicht hochgeladen. Das Teilen von PDF oder ZIP ist eine gesonderte, vom Nutzer ausgelöste Weitergabe.

**Wo finde ich den Software-Fingerprint?** Version 0.4 erfasst keinen unabhängig gemessenen Fingerprint einer installierten App-Datei. Versionsnummer und möglicher Commit sind Selbstauskünfte. App-/Geräteattestierung und signierte Challenge sind als [#6](https://github.com/neubuot/DoiProof/issues/6) und [#7](https://github.com/neubuot/DoiProof/issues/7) vorgemerkt.

## 8. Dokumentation und Änderungen

Die [Kurzanleitung](KURZANLEITUNG.md), die [Produkt- und Beweiskettenbeschreibung](PRODUKT-UND-BEWEISKETTE.md), dieses Handbuch sowie [ARCHITECTURE.md](ARCHITECTURE.md) gehören zum Repository. Änderungen an Oberfläche, Datenformat, Verankerung oder Export sollen die betroffenen Dokumente im gleichen Pull Request aktualisieren. Bei älteren Paketen immer die Version im Manifest und den dazugehörigen Git-Stand heranziehen.
