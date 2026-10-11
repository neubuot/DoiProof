# App-Inhalte in der Play Console: Antworten zum Ausfüllen

**Stand:** DoiProof 1.0.0, 11. Oktober 2026. Diese Seite gehört zu [PLAY-STORE.md, Teil 4](../PLAY-STORE.md#4-app-inhalte-ausfüllen). Sie enthält für jedes Formular unter **„App-Inhalte“** die Antwort und eine kurze Begründung. Antworttexte in grauen Kästen kannst du kopieren und direkt einfügen.

**Was du am Ende hast:** Alle Aufgaben unter „App-Inhalte“ sind mit einem grünen Haken erledigt. Formular, Datenschutzerklärung und App sagen dasselbe.

**Zeitbedarf:** 45 bis 90 Minuten.

**Voraussetzungen:**

- **Paketname vor dem Anlegen der App entscheiden.** Im Repository steht `org.doichain.doiproof`; dieser Name ist **noch nicht endgültig**. Spätestens mit dem ersten Upload ist er fest an den Eintrag in der Play Console gebunden und lässt sich danach nie mehr ändern (siehe [PLAY-STORE.md, Teil 0, Punkt 1](../PLAY-STORE.md#0-vorab-entscheidungen)). Die Antworten auf dieser Seite gelten für jeden Paketnamen.
- Die App ist in der Play Console angelegt ([PLAY-STORE.md, Teil 3](../PLAY-STORE.md#3-play-console-app-anlegen)), und zwar mit dem Organisationskonto. Ob die Pflicht zum geschlossenen Test mit 12 Testern entfällt, zeigt das Dashboard; mit dieser Seite hat das nichts zu tun.
- Die Datenschutzerklärung ist auf deiner Website veröffentlicht und unter `[URL-DATENSCHUTZ]` erreichbar.
- Die Support-E-Mail `[E-MAIL]` steht fest.
- Offene Punkte aus [PLAY-STORE.md, Teil 0](../PLAY-STORE.md#0-vorab-entscheidungen) sind geklärt oder bewusst offen gelassen: Betreiber des Doichain-Dienstes (`[BETREIBER DES DIENSTES]`), Android-Sicherung (`allowBackup`, derzeit `true`) und Rolle von Expo (Auftragsverarbeitungsvertrag, Punkt 8).

**Öffentliches Repository:** Namen, Anschriften und E-Mail-Adressen stehen hier nur als Platzhalter in eckigen Klammern. Die echten Angaben trägst du nur in der Play Console und auf deiner Website ein.

**Grundsatz:** Mehr anzugeben als nötig ist kein Verstoß, weniger schon. Punkte, bei denen man unterschiedlich entscheiden kann, sind mit **Ermessen** markiert. Die Empfehlung lautet dann: im Zweifel mehr angeben. Ausnahme: Angaben, die der Datenschutzerklärung widersprächen, etwa der Zweck „Analysen“ (siehe 7.4).

**Wo:** Play Console → App „DoiProof“ → linke Leiste **„Richtlinien und Programme“** → **„App-Inhalte“**. Alternativ im **Dashboard** unter „App einrichten“ die offenen Aufgaben anklicken. Jede Erklärung öffnest du mit **„Starten“** bzw. **„Verwalten“**, ausfüllen, **„Speichern“**.

**Hinweis zu Feldnamen:** Die Hilfeseiten der Play Console waren bei der Recherche nur über Zusammenfassungen erreichbar. Fragen und Schaltflächen können deshalb anders heißen oder in anderer Reihenfolge erscheinen. Beantworte sie dann nach dem Sinn. Diese Unterlage ist keine Rechtsberatung.

## Übersicht

| Nr. | Formular | Antwort in Kurzform |
|---|---|---|
| 1 | Datenschutzerklärung | `[URL-DATENSCHUTZ]` |
| 2 | App-Zugriff | Alle Funktionen ohne Zugriffsbeschränkung (Variante A; Prüferhinweis nur, wenn ein Textfeld angeboten wird). Nur mit Prüfschlüssel Variante B mit Prüferhinweis |
| 3 | Anzeigen, Werbe-ID | Keine Werbung; Werbe-ID: Nein |
| 4 | Einstufung des Inhalts | IARC-Fragebogen, Kategorie „Alle anderen App-Typen“, alle Fragen „Nein“ bis auf eine Ermessensfrage |
| 5 | Zielgruppe und Inhalte | Nur „18 und älter“, nicht an Kinder gerichtet |
| 6 | Nachrichten-Apps, COVID-19, Gesundheit, Finanzfunktionen, Behörden-Apps | Nein bzw. keine |
| 7 | Datensicherheit | Genauer Standort, Dateien und Dokumente, Sonstige nutzergenerierte Inhalte, Absturzprotokolle, Diagnose, Geräte- oder andere IDs; Zweck nur „App-Funktionen“; Expo-Daten „geteilt“ nur ohne Auftragsverarbeitungsvertrag; verschlüsselt; kein Konto; keine Löschung möglich |
| 8 | Berechtigungserklärungen | Voraussichtlich keine verlangt |
| 9 | Händlerstatus (EU) | Voraussichtlich „Händler“; in der Play Console prüfen, gegebenenfalls rechtlich beraten lassen |

## Grundlage: Was die App überträgt

Die Antworten folgen aus diesen Datenflüssen. Sie sind im Code geprüft; die Fundstellen stehen im Anhang [Belege](#belege).

| Nr. | Empfänger | Was die App sendet | Wann |
|---|---|---|---|
| D1 | Doichain-MCP-Dienst `https://doi-api.sendlabs.de/mcp`, Betreiber `[BETREIBER DES DIENSTES]` (noch zu klären) | SHA-256-Hash des Beweispakets und die Notiz „DoiProof v3; Gerät: <Aufnahmezeit laut Gerät>“ (bei ausgewählten Fotos „DoiProof evidence v3“). Der Dienst verankert beides **dauerhaft und öffentlich** auf der Doichain-Blockchain; löschen lässt es sich nicht. Optional geht ein vom Nutzer eingegebener PoE- oder Write-Schlüssel mit. Der Dienst sieht die IP-Adresse und zählt das kostenlose Kontingent je IP-Adresse. | Standardmäßig automatisch nach jeder Aufnahme („Nach Aufnahme sofort senden“ ist voreingestellt an; schaltet der Nutzer es aus, bleibt die Wahl gespeichert), sonst mit „Nachweis anlegen“ bzw. „Jetzt senden“ |
| D2 | Doichain-MCP-Dienst und `https://blockstream.info/api` | Nur öffentliche Abfragen: Kontingent, aktueller Block, Status eines Paket-Hashs, Block- und Transaktions-Hashes. Im Tab „Prüfen“ auch der Hash eines fremden Pakets. | Kontingent bei jedem Start; offene Einträge jede Minute; Vorab-Blöcke vor der Kamera (Standard an); Online-Abgleich im Tab „Prüfen“ und beim PDF-Bericht aus dem Verlauf (jeweils Standard an) |
| D3 | OpenStreetMap Foundation, `https://tile.openstreetmap.org`, ausgeliefert über das Content-Delivery-Netz der Fastly, Inc. (USA) | Abruf von 6 bis 12 Kartenkacheln rund um den Standort im Paket. Daraus lässt sich die Umgebung auf etwa 1 km genau bestimmen (etwa 0,3 bis 1 km²); die genauen GPS-Koordinaten gehen nicht mit. Der Dienst sieht außerdem die IP-Adresse. Auf dem Gerät bleiben die Kacheln 7 Tage im Zwischenspeicher. | Beim Erstellen eines PDF-Berichts, wenn „Standort im Bericht“ und „Kartenausschnitt (OpenStreetMap)“ an sind. Im Tab „Prüfen“ sind beide **standardmäßig an**, im Verlauf ist „Standort im Bericht“ standardmäßig aus. |
| D4 | Expo (650 Industries, Inc., USA), `u.expo.dev` | Update-Prüfung mit einer zufälligen, dauerhaft gespeicherten Installations-ID (Header `EAS-Client-ID`), Plattform, Laufzeitversion, Kanal und den IDs des laufenden und des eingebauten Updates. Hinzu kommen die IDs kürzlich fehlgeschlagener Updates und, falls das Update-System bei einem früheren Start nicht geladen werden konnte, dessen Fehlermeldung (Header `Expo-Fatal-Error`, höchstens 1024 Zeichen). Expo zählt anhand der Installations-ID außerdem, wie viele Installationen die Update-Funktion nutzen (Statistik und Abrechnung im Expo-Konto). | Bei jedem App-Start und bei „Nach Update suchen“ |
| D5 | niemand | Originalfoto, Manifest, Sensorwerte, Gerätemodell und die genauen GPS-Koordinaten bleiben auf dem Gerät. Sie verlassen es nur, wenn der Nutzer ein Beweispaket (ZIP) oder einen Prüfbericht (PDF) selbst über den Android-Teilen-Dialog weitergibt. Das ZIP enthält das Originalfoto Byte für Byte unverändert, also gegebenenfalls auch Ortsangaben, die die Kamera-App oder Galerie hineingeschrieben hat (EXIF-GPS), selbst im Profil „Privat“. Ins PDF bettet die App das Foto ohne EXIF, XMP, IPTC und Kommentare ein. | – |

Die App hat keine Analyse-, Absturz- oder Werbebibliothek, kein Tracking, kein Konto und keine In-App-Käufe. Alle Verbindungen laufen über HTTPS.

## 1. Datenschutzerklärung

**Feld „URL der Datenschutzerklärung“:**

```text
[URL-DATENSCHUTZ]
```

**Begründung und Anforderungen:**

- Google verlangt die Datenschutzerklärung für jede App, auch ohne Konto und Werbung.
- Die Seite muss öffentlich und ohne Anmeldung erreichbar sein, als HTML-Seite (kein PDF), ohne Länder-Sperre und nicht von Dritten bearbeitbar (kein geteiltes Online-Dokument). Sie muss als Datenschutzerklärung erkennbar sein und den Anbieter so nennen wie im Store-Eintrag. Außerdem nennt sie eine Kontaktstelle.
- Inhaltlich muss sie zu Abschnitt 7 passen. Sie nennt also die Empfänger aus D1 bis D4, die dauerhafte und öffentliche Speicherung auf der Blockchain, die Installations-ID bei Expo (auch zum Zählen der Installationen), den Kartenabruf bei OpenStreetMap über Fastly und die lokale Speicherung. Sie schließt Nutzungsanalyse aus; deshalb nennt das Formular als Zweck nur „App-Funktionen“.
- In der Vorlage behältst du jeweils die passende Variante: zur Android-Sicherung (Abschnitt 4.6) bei `allowBackup: true` Option A, bei `false` Option B; bei Expo und Fastly die Variante, die zu Auftragsverarbeitungsvertrag und Data Privacy Framework passt ([PLAY-STORE.md, Teil 0, Punkt 8](../PLAY-STORE.md#0-vorab-entscheidungen)).
- Google verlangt den Link **auch in der App**. „Über diese App“ enthält ihn noch nicht. Sobald die URL feststeht, werden die Links „Datenschutz“ und „Impressum“ dort eingebaut, und zwar vor dem Build in [PLAY-STORE.md, Teil 7](../PLAY-STORE.md#7-build) (siehe Teil 0, Punkt 5).

Die URL muss beim Speichern bereits erreichbar sein.

## 2. App-Zugriff

**Antwort:** „Alle Funktionen meiner App sind ohne Zugriffsbeschränkungen verfügbar“ (englisch „All functionality in my app is available without any access restrictions“).

**Begründung:** DoiProof hat keine Anmeldung, kein Konto, keine Mitgliedschaft und keine Bezahlschranke. Aufnehmen, Verankern, Verlauf, ZIP-Export, PDF-Bericht und Prüfer funktionieren ohne Zugangsdaten.

### Hinweis für die Prüfer

Google prüft die Kernfunktion. Zwei Dinge können dabei wie ein Fehler aussehen: Ohne Internet öffnet sich die Kamera nicht, solange der Schalter für die Vorab-Blöcke an ist. Außerdem ist das kostenlose Tageskontingent des Doichain-Dienstes je IP-Adresse begrenzt, und Googles Testgeräte teilen sich vermutlich IP-Adressen. Diesen Text dafür bereithalten:

**Englisch (empfohlen, falls ein Textfeld angeboten wird):**

```text
No login or account is required; all features work without credentials.
Core flow: tap "Foto aufnehmen" (take photo) or "Foto wählen" (choose photo). The app hashes the evidence package on the device and sends only this SHA-256 hash plus a short note with the device capture time to a Doichain service, which anchors it as a timestamp on the public Doichain blockchain. Photo, exact GPS coordinates and sensor values stay on the device. Only the optional map excerpt in the PDF report loads OpenStreetMap tiles around the recorded location (about 1 km).
Internet is required for anchoring and online verification. Without network, switch off "BTC- und Doichain-Block vor Kameraaufnahme", otherwise the camera does not open.
Without an own key the service grants a free daily quota per IP address (currently 10 per IP and UTC day, 200 per day in total; card "Tageskontingent"). If it is used up, the capture stays saved on the device (status "Einreichung unklar", after the next status check "Nicht verankert") and can be sent later with "Jetzt senden". Confirmation in a block usually takes 10 to 30 minutes ("Offene prüfen").
Location is optional: the default profile "Privat" never asks for it; only the profiles "Standort & Sensoren" or "Individuell" (with "GPS, Höhe und Genauigkeit") request foreground location, and denying it is fine.
To test the verifier: in the history ("Nachweisverlauf") tap "Beweispaket ZIP" and save the file (e.g. to Drive or Downloads). Then open the tab "Prüfen", tap "ZIP-Beweispaket importieren", choose the file and tap "Paket prüfen". Optionally tap "PDF-Prüfbericht erstellen und teilen".
Every anchoring is public and permanent on the blockchain.
```

**Kurzfassung, falls das Feld nur wenige Zeichen erlaubt (441 Zeichen; die lange englische Fassung hat 1638):**

```text
No login needed. Internet required: the app sends only a SHA-256 hash and a short note (capture time) to a Doichain service that anchors it publicly. Free quota per IP (10/day); if exhausted, items stay saved on the device and can be sent later ("Jetzt senden"). Location is optional (profiles "Standort & Sensoren"/"Individuell"). Verifier: history → "Beweispaket ZIP" → save → tab "Prüfen" → "ZIP-Beweispaket importieren" → "Paket prüfen".
```

**Deutsch (zum Verständnis oder falls ein deutsches Feld verlangt wird):**

```text
Keine Anmeldung und kein Konto nötig; alle Funktionen sind ohne Zugangsdaten nutzbar.
Ablauf: „Foto aufnehmen“ oder „Foto wählen“. Die App berechnet auf dem Gerät den SHA-256-Hash des Beweispakets und sendet nur diesen Hash mit einer kurzen Notiz (Aufnahmezeit laut Gerät) an einen Doichain-Dienst, der ihn als Zeitstempel auf der öffentlichen Doichain-Blockchain verankert. Foto, genaue GPS-Koordinaten und Sensorwerte bleiben auf dem Gerät. Nur der optionale Kartenausschnitt im PDF-Bericht lädt OpenStreetMap-Kacheln rund um den Standort (etwa 1 km).
Für Verankerung und Online-Prüfung ist Internet nötig. Ohne Netz den Schalter „BTC- und Doichain-Block vor Kameraaufnahme“ ausschalten, sonst öffnet sich die Kamera nicht.
Ohne eigenen Schlüssel gibt es ein kostenloses Tageskontingent je IP-Adresse (derzeit 10 je IP und UTC-Tag, insgesamt 200 je Tag; Karte „Tageskontingent“). Ist es erschöpft, bleibt die Aufnahme auf dem Gerät gesichert (Status „Einreichung unklar“, nach der nächsten Statusabfrage „Nicht verankert“) und lässt sich später mit „Jetzt senden“ einreichen. Die Bestätigung in einem Block dauert meist 10 bis 30 Minuten („Offene prüfen“).
Standort ist optional: Das Standardprofil „Privat“ fragt ihn nie ab; nur die Profile „Standort & Sensoren“ oder „Individuell“ mit „GPS, Höhe und Genauigkeit“ fragen nach dem Standort im Vordergrund, Ablehnen ist möglich.
Prüfer testen: Im Nachweisverlauf „Beweispaket ZIP“ antippen und die Datei speichern (z. B. Drive oder Downloads). Dann Tab „Prüfen“ → „ZIP-Beweispaket importieren“ → Datei wählen → „Paket prüfen“. Optional „PDF-Prüfbericht erstellen und teilen“.
Jede Verankerung steht dauerhaft und öffentlich auf der Blockchain.
```

**Wohin mit dem Text (Ermessen):**

- **Variante A (Standard):** „Ohne Zugriffsbeschränkungen“ wählen. Bietet die Play Console dabei kein Textfeld, entfällt der Hinweis. Die App ist trotzdem prüfbar: Bei erschöpftem Kontingent bleibt der Nachweis auf dem Gerät gesichert (Status „Einreichung unklar“ bzw. „Nicht verankert“), und Verlauf, ZIP-Export und Prüfer funktionieren weiter.
- **Variante B (nur mit Prüfschlüssel):** Stellt dir der Betreiber des Doichain-Dienstes einen befristeten Schlüssel ohne Kontingentgrenze zur Verfügung, wähle „Alle oder einige Funktionen sind eingeschränkt“. Dann **„Anleitung hinzufügen“**: Name z. B. „Verankerung ohne Kontingentgrenze“, Nutzername und Passwort leer lassen bzw., falls Pflicht, „not required“ eintragen. Unter „Sonstige Informationen“ den englischen Text einfügen und ergänzen: `Optional: enter the key below in the field "Eigener PoE- oder Write-Schlüssel (optional)" on the tab "Aufnehmen" to avoid the IP quota: [PRÜFSCHLÜSSEL]`. Den Schlüssel trägst du nur in der Play Console ein, nie im Repository. Nach der Freigabe sperrt ihn der Betreiber. Die App hält den Schlüssel nur für die laufende Sitzung im Speicher.

## 3. Anzeigen und Werbe-ID

### 3a. Anzeigen

**Antwort:** „Nein, meine App enthält keine Werbung“.

**Begründung:** DoiProof zeigt keine Anzeigen, auch keine Eigenwerbung oder Hinweise auf andere Apps, und enthält kein Werbe-SDK. Die App ist kostenlos und bleibt es.

### 3b. Werbe-ID

**Antwort:** „Verwendet deine App eine Werbe-ID?“ → **Nein**.

**Begründung:** Keine Bibliothek liest die Werbe-ID. Die Berechtigung `com.google.android.gms.permission.AD_ID` ist in `app.json` ausdrücklich gesperrt. Die Play Console vergleicht die Antwort mit dem hochgeladenen Bundle. Stünde AD_ID im Manifest, käme beim Upload ein Fehler. Kontrolle: Im App-Bundle-Explorer darf AD_ID nicht erscheinen ([PLAY-STORE.md, Teil 8](../PLAY-STORE.md#8-upload-in-den-internen-test)).

## 4. Einstufung des Inhalts (IARC-Fragebogen)

Aus dem Fragebogen ermittelt die International Age Rating Coalition (IARC) die Altersfreigaben für alle Regionen, in Deutschland nach USK. Die Altersfreigabe beschreibt nur die Inhalte. Sie ist unabhängig von der Zielgruppe in Abschnitt 5.

1. **„Fragebogen starten“**. E-Mail-Adresse: `[E-MAIL]`. An diese Adresse schickt IARC die Bestätigung.
2. **Kategorie:** „Alle anderen App-Typen“ (englisch „All Other App Types“). Heißt die Auswahl bei dir anders, die Kategorie für Werkzeuge, Dienstprogramme oder Produktivität wählen, nicht „Spiel“ und nicht „Soziale Netzwerke/Kommunikation“.
3. Fragen beantworten (Tabelle), **„Speichern“** → **„Weiter“** → Einstufungen prüfen → **„Einreichen“** bzw. **„Einstufung übernehmen“**.

Der genaue Wortlaut der aktuellen IARC-Fragen ließ sich bei der Recherche nicht abrufen. Die Tabelle gibt die Fragen sinngemäß wieder; beantworte jede Frage nach ihrem Sinn.

| Thema (sinngemäß) | Antwort | Begründung |
|---|---|---|
| Gewalt, Blut, Waffen (auch Verweise oder Darstellungen) | Nein | Werkzeug ohne solche Inhalte |
| Angst, Horror | Nein | – |
| Sexuelle Inhalte, Nacktheit | Nein | – |
| Vulgäre oder beleidigende Sprache, Diskriminierung, derber Humor | Nein | Feste, sachliche App-Texte |
| Drogen, Alkohol, Tabak (Darstellung, Verweise, Werbung) | Nein | – |
| Glücksspiel (echt oder simuliert), Lootboxen | Nein | Kein Spiel, keine Zufallsgewinne |
| Können Nutzer in der App miteinander kommunizieren oder Inhalte austauschen (Text, Sprache, Bilder)? | Nein | Kein Chat, kein Feed, keine Nutzerkonten, kein Freitext an andere. ZIP und PDF verlassen die App nur über den Android-Teilen-Dialog in eine App, die der Nutzer selbst wählt. Die Notiz auf der Blockchain ist ein fester App-Text mit der Aufnahmezeit, kein Freitext. |
| Teilt die App den aktuellen Standort des Nutzers mit anderen Nutzern? | Nein | Die genauen GPS-Koordinaten bleiben im lokalen Beweispaket. Den Kartenabruf (D3) sieht nur der Kartendienst, kein anderer Nutzer. |
| Gibt die App vom Nutzer angegebene persönliche Informationen an Dritte weiter? (falls gefragt) | **Ermessen**, Empfehlung Ja | E-Mail, Telefon oder Zahlungsdaten erfasst die App nicht. Der optionale Kartenausschnitt sendet aber die Umgebung des Standorts (etwa 1 km) an OpenStreetMap; Abschnitt 7 nennt das „geteilt“. Für die Stimmigkeit lieber Ja. |
| Digitale Käufe, In-App-Käufe | Nein | Kostenlos, keine Käufe |
| Uneingeschränkter Internetzugang, Webbrowser, Suchmaschine | Nein | Die App ruft nur feste Dienste auf (D1 bis D4) und hat keinen Browser |
| Werbung für Produkte mit Altersbeschränkung | Nein | Keine Werbung |

**Erwartetes Ergebnis:** USK ab 0 Jahren, PEGI 3, ESRB „Everyone“ bzw. IARC 3+, gegebenenfalls mit dem Hinweis „Teilt Informationen“. Ändert sich die App wesentlich, etwa durch eine Austauschfunktion zwischen Nutzern, musst du den Fragebogen neu ausfüllen.

## 5. Zielgruppe und Inhalte

**Zielaltersgruppen:** nur **„18 und älter“** ankreuzen.

**Begründung:**

- Jede Verankerung steht **dauerhaft, öffentlich und unlöschbar** auf der Blockchain. Minderjährige können diese Tragweite schwerer einschätzen, und ein Recht auf Löschung lässt sich technisch nicht erfüllen.
- Die App verarbeitet genaue GPS-Koordinaten. Mit dem Kartenausschnitt geht die Umgebung (etwa 1 km) an einen Dritten; Google stuft das als genauen Standort ein.
- Enthält die Zielgruppe Kinder unter 13 Jahren, gilt die **Familienrichtlinie** von Google Play mit strengen Zusatzpflichten. DoiProof ist dafür nicht gebaut.
- DoiProof holt keine Einwilligungen ein und kann das Alter nicht prüfen. Eine dauerhafte, öffentliche Veröffentlichung sollte deshalb nur von Volljährigen ausgelöst werden.

**Alternative:** „16–17“ und „18 und älter“, falls du Jugendliche ausdrücklich ansprechen willst. Dann muss die Datenschutzerklärung Jugendliche verständlich auf die dauerhafte Veröffentlichung hinweisen. Gruppen unter 16 nicht wählen.

**Folgefragen (falls angezeigt):**

| Frage (sinngemäß) | Antwort | Begründung |
|---|---|---|
| Könnte deine App unbeabsichtigt Kinder ansprechen? | Nein | Sachliche Gestaltung ohne Figuren, Spiele oder kindgerechte Sprache. Store-Grafiken und Texte richten sich an Erwachsene. |
| Enthält der Store-Eintrag Inhalte, die Kinder ansprechen? | Nein | Siehe [STORE-EINTRAG.md](STORE-EINTRAG.md) |

Diese Erklärung lässt sich erst abschließen, wenn Datenschutzerklärung, App-Zugriff und Anzeigen erledigt sind.

## 6. Weitere Erklärungen

| Formular | Antwort | Begründung |
|---|---|---|
| **Nachrichten-Apps** | „Ist deine App eine Nachrichten-App?“ → **Nein** | DoiProof veröffentlicht keine Nachrichten oder Magazininhalte |
| **COVID-19-Apps zur Kontaktverfolgung und Statusanzeige** | „Meine App ist keine öffentlich verfügbare COVID-19-App zur Kontaktverfolgung oder Statusanzeige“ | Kein Gesundheitsbezug |
| **Gesundheit** (Gesundheits-Apps) | Keine Gesundheitsfunktionen bzw. keine der aufgeführten Funktionen ankreuzen | Beschleunigung, Gyroskop, Magnetfeld, Luftdruck und Licht dienen nur als Begleitangaben bei Kameraaufnahmen im lokalen Beweispaket. Sie werden nicht gesendet und nicht als Gesundheits- oder Fitnessdaten ausgewertet. Die Berechtigung „Körperliche Aktivität“ (`ACTIVITY_RECOGNITION`) ist gesperrt; Health Connect wird nicht verwendet. |
| **Finanzfunktionen** | „Meine App bietet keine Finanzfunktionen“ | Keine Wallet, kein Handel, keine Börse, keine Token oder NFTs, keine Zahlungen, keine Kredite. Die App verankert nur einen Zeitstempel, also Hash und Notiz, auf einer öffentlichen Blockchain. Die Gebühren dafür zahlt der Betreiber des Dienstes, und der Nutzer erhält nichts, was einen Wert hat oder handelbar ist. Die Play-Richtlinie zu Blockchain-Inhalten betrifft tokenisierte digitale Assets und greift deshalb nicht. |
| **Behörden-Apps** | „Wird deine App von einer staatlichen Stelle oder in deren Auftrag entwickelt?“ → **Nein** | Kein Behördenbezug |

Auch im Store-Text Begriffe wie „Krypto“, „Coin“, „Token“ oder „Wallet“ vermeiden, damit die App nicht als Finanz-App eingestuft wird ([STORE-EINTRAG.md](STORE-EINTRAG.md)).

## 7. Datensicherheit

Das Formular hat vier Schritte: **„Datenerhebung und Sicherheit“**, **„Datentypen“**, **„Datennutzung und -verarbeitung“** und **„Vorschau“**. Am Ende **„Senden“** bzw. **„Speichern“**.

### 7.1 Googles Begriffe

- **Erheben** heißt: Die App überträgt Daten vom Gerät weg. Was nur auf dem Gerät verarbeitet wird, ist nicht anzugeben. Was eine Bibliothek in der App überträgt (hier: Expo), zählt mit.
- **Teilen** heißt: Daten gehen an einen Dritten. Nicht als Teilen gelten:
  - die Übermittlung an einen **Dienstleister**, der im Auftrag und nach Weisung des Entwicklers verarbeitet,
  - eine **vom Nutzer ausgelöste** Übermittlung, die er erwartet (z. B. Datei über den Teilen-Dialog verschicken), oder eine Übermittlung nach **deutlicher Offenlegung** und Zustimmung in der App,
  - Übermittlungen aus rechtlichen Gründen und vollständig anonymisierte Daten.
- **Flüchtig verarbeitet** heißt: Die Daten liegen nur im Arbeitsspeicher und nur so lange, wie die Anfrage dauert. Flüchtig verarbeitete Daten gehören trotzdem ins Formular, erscheinen aber nicht im Store.
- **Optional** heißt: Der Nutzer kann wählen, ob die Daten erhoben werden. **Erforderlich** heißt: Ohne die Übermittlung geht die Funktion nicht, oder der Nutzer kann sie nicht abschalten.

### 7.2 Schritt „Datenerhebung und Sicherheit“

| Frage (sinngemäß) | Antwort | Begründung |
|---|---|---|
| Erhebt oder teilt deine App einen der erforderlichen Nutzerdatentypen? | **Ja** | D1, D3 und D4 übertragen Daten vom Gerät |
| Werden alle von deiner App erhobenen Nutzerdaten bei der Übertragung verschlüsselt? | **Ja** | Alle Ziele (D1 bis D4) werden nur über HTTPS aufgerufen. Eine Freigabe für unverschlüsselten Verkehr steht nur im Debug-Manifest für Entwicklungs-Builds. |
| Welche Methoden zur Kontoerstellung unterstützt deine App? | **„Meine App erlaubt keine Kontoerstellung“** | Kein Konto, keine Anmeldung |
| Können sich Nutzer mit Konten anmelden, die außerhalb der App erstellt wurden? (falls gefragt) | **Nein** | Die App hat keine Anmeldung. Der optionale PoE- oder Write-Schlüssel hebt nur die Kontingentgrenze des Doichain-Dienstes auf. Die App hält ihn nur für die laufende Sitzung im Speicher; er öffnet kein Konto. |
| Können Nutzer die Löschung ihrer Daten anfordern? | **Nein** (**Ermessen**) | Hash und Notiz stehen dauerhaft auf einer öffentlichen Blockchain und lassen sich von niemandem löschen. Ein „Ja“ würde im Store eine Löschmöglichkeit versprechen, die es für die Kerndaten nicht gibt. Lokale Daten löscht der Nutzer selbst: App-Daten löschen oder App deinstallieren, vorher Beweispakete als ZIP sichern. Anfragen nach der DSGVO, etwa zu Protokollen bei Expo oder beim Dienstbetreiber, regelt die Datenschutzerklärung über die Kontaktadresse. |
| Unabhängige Sicherheitsprüfung (MASA), falls gefragt | Nein | Freiwillig, nicht durchgeführt |

### 7.3 Schritt „Datentypen“

Kreuze genau die Datentypen mit **Ja** an. Die englischen Namen in Klammern helfen, falls die Console Englisch anzeigt.

| Kategorie | Datentyp | Angabe | Begründung |
|---|---|---|---|
| Standort (Location) | Ungefährer Standort (Approximate location) | Nein | Die App sendet keinen ungefähren Standort. Der Kartenabruf verrät mehr und ist unter „Genauer Standort“ erfasst. **Ermessen:** Stellt sich heraus, dass der Doichain-Dienst oder Expo aus der IP-Adresse den Ort ableitet, zusätzlich angeben. |
| | Genauer Standort (Precise location) | **Ja** | D3, siehe 7.4 |
| Persönliche Daten (Personal info) | Name, E-Mail-Adresse, Adresse, Telefonnummer, ethnische Herkunft, politische oder religiöse Überzeugungen, sexuelle Orientierung, sonstige Daten | Nein | Die App fragt nichts davon ab |
| | Nutzer-IDs (User IDs) | Nein | Kein Konto. **Ermessen:** Gibt der Betreiber des Doichain-Dienstes Schlüssel aus, die einer Person zugeordnet sind, „Nutzer-IDs“ angeben: erhoben, optional, App-Funktionen; geteilt nur, wenn der Betreiber ein Dritter ist. |
| Finanzdaten (Financial info) | Zahlungsinformationen, Kaufverlauf, Kreditwürdigkeit, sonstige Finanzdaten | Nein | Kostenlos, keine Käufe, keine Zahlungen |
| Gesundheit und Fitness (Health and fitness) | Gesundheitsdaten, Fitnessdaten | Nein | Sensorwerte bleiben lokal (D5), keine Gesundheitsfunktion |
| Nachrichten (Messages) | E-Mails, SMS oder MMS, sonstige In-App-Nachrichten | Nein | Keine Nachrichtenfunktion |
| Fotos und Videos (Photos and videos) | Fotos | Nein | Das Foto verlässt das Gerät nur, wenn der Nutzer ZIP (Original) oder PDF (Foto ohne Kamera-Metadaten) selbst teilt; das ist vom Nutzer ausgelöst. Übertragen wird nur ein Hash, aus dem sich das Foto nicht zurückrechnen lässt. |
| | Videos | Nein | Die App nimmt keine Videos auf und wählt keine aus |
| Audio | Sprach- oder Tonaufnahmen, Musikdateien, sonstige Audiodateien | Nein | Mikrofon gesperrt |
| Dateien und Dokumente (Files and docs) | Dateien und Dokumente | **Ja** | Paket-Hash, siehe 7.4 |
| Kalender (Calendar) | Kalendertermine | Nein | – |
| Kontakte (Contacts) | Kontakte | Nein | – |
| App-Aktivitäten (App activity) | App-Interaktionen, Suchverlauf in der App, installierte Apps, sonstige Aktionen | Nein | Kein Analysewerkzeug. Die Update-Prüfung bei Expo ist unter „Geräte- oder andere IDs“ erfasst. |
| | Sonstige nutzergenerierte Inhalte (Other user-generated content) | **Ja** | Notiz mit Aufnahmezeit, siehe 7.4 |
| Web-Browsing | Web-Browsing-Verlauf | Nein | Kein Browser |
| App-Informationen und Leistung (App info and performance) | Absturzprotokolle (Crash logs) | **Ja** | D4, siehe 7.4 |
| | Diagnose (Diagnostics) | **Ja** (**Ermessen**) | D4, siehe 7.4 |
| | Sonstige Leistungsdaten der App | Nein | – |
| Geräte- oder andere IDs (Device or other IDs) | Geräte- oder andere IDs | **Ja** | Installations-ID bei Expo, siehe 7.4 |

Nicht anzugeben ist die **Android-Sicherung** (`allowBackup: true`). Sie läuft über das System in das Google-Konto des Nutzers, und du als Entwickler erhältst nichts. Ab Android 9 ist sie bei gesetzter Displaysperre Ende-zu-Ende-verschlüsselt. Erwähne sie aber in der Datenschutzerklärung (**Ermessen**, nach überwiegender Lesart keine Erhebung).

Auch die **IP-Adresse** ist kein eigener Datentyp. Sie zählt nur, wenn ein Empfänger daraus Ort oder Kennungen ableitet (siehe „Ungefährer Standort“).

### 7.4 Schritt „Datennutzung und -verarbeitung“

Für jeden angekreuzten Datentyp fragt die Console dasselbe: erhoben, geteilt oder beides? Flüchtig verarbeitet? Erforderlich oder optional? Zwecke der Erhebung und gegebenenfalls Zwecke der Weitergabe. Zwecke heißen in der Console: App-Funktionen, Analysen, Kommunikation durch Entwickler, Werbung oder Marketing, Betrugsprävention/Sicherheit/Compliance, Personalisierung, Kontoverwaltung.

#### Genauer Standort

| Frage | Antwort |
|---|---|
| Erhoben / geteilt | **Erhoben** und **geteilt** |
| Flüchtig verarbeitet | Nein |
| Erforderlich oder optional | **Optional** („Nutzer können wählen, ob diese Daten erhoben werden“) |
| Zweck der Erhebung | App-Funktionen |
| Zweck der Weitergabe | App-Funktionen |

**Begründung:**

- **Erhoben:** Für den Kartenausschnitt im PDF-Bericht lädt die App Kacheln der Zoomstufe 14 rund um den Standort. Die genauen GPS-Koordinaten selbst sendet sie nie. Aus der Auswahl der Kacheln lässt sich der Ort aber auf etwa 0,3 bis 1 km² eingrenzen. Google zählt alles unter 3 km² als **genauen** Standort; „ungefähr“ wäre also zu wenig.
- **Geteilt:** Die OpenStreetMap Foundation ist kein Dienstleister in deinem Auftrag. Sie ist ein Dritter mit eigenen Nutzungsregeln und protokolliert Anfragen. Die Ausnahme „vom Nutzer ausgelöst, mit deutlicher Offenlegung“ ist hier schwach, aus zwei Gründen. Erstens sind „Standort im Bericht“ und „Kartenausschnitt“ im Tab „Prüfen“ voreingestellt an. Zweitens betrifft es bei fremden ZIPs den Ort eines Dritten. Die Hinweistexte in der App sind vorhanden, ersetzen aber keine Einwilligung. Deshalb „geteilt“, solange die Voreinstellung im Prüfer an ist. Ausgeliefert werden die Kacheln über das Content-Delivery-Netz der Fastly, Inc. (USA). Am Formular ändert das nichts; die Datenschutzerklärung nennt es in Abschnitt 4.3.
- **Optional:** Beide Schalter lassen sich abschalten. Im Verlauf ist „Standort im Bericht“ standardmäßig aus, und die App funktioniert ohne Karte vollständig.
- **Nicht flüchtig:** Der Kacheldienst speichert Zugriffsprotokolle. Der 7-Tage-Zwischenspeicher auf dem Gerät spielt für das Formular keine Rolle.
- Die **genauen GPS-Koordinaten im Beweispaket** (Profil „Standort & Sensoren“ oder „Individuell“ mit „GPS, Höhe und Genauigkeit“) sendet die App nicht; sie bleiben lokal (D5). Dasselbe gilt für Ortsangaben, die die Kamera-App ins Originalfoto schreibt (EXIF-GPS): Sie bleiben im Original und damit im ZIP, auch im Profil „Privat“. Ins PDF übernimmt die App das Foto ohne diese Angaben.

#### Dateien und Dokumente

| Frage | Antwort |
|---|---|
| Erhoben / geteilt | **Erhoben** und **geteilt** |
| Flüchtig verarbeitet | Nein |
| Erforderlich oder optional | **Erforderlich** (**Ermessen**, siehe unten) |
| Zweck der Erhebung | App-Funktionen |
| Zweck der Weitergabe | App-Funktionen |

**Begründung:**

- **Was:** der SHA-256-Hash des Beweispakets (D1, D2). Er wird bei der Verankerung gesendet und bei Statusabfragen erneut. Im Tab „Prüfen“ geht auch der Hash eines fremden Pakets an den Dienst. Dazu kommen die öffentlichen Block-Hashes der Vorab-Blöcke aus dem Paket, die an den Dienst und an Blockstream gehen.
- **Warum diese Kategorie:** Nach Googles Beschreibung (laut Drittquellen, die Google zitieren) gehören zu „Dateien und Dokumente“ auch Informationen über Dateien des Nutzers, etwa Dateinamen. Der Hash ist ein Fingerabdruck der Beweispaket-Datei. Die Kategorie „Fotos“ wäre falsch: Die App sendet die Fotobytes nie selbst, und der Hash lässt das Foto nicht rekonstruieren.
- **Geteilt:** Der Hash steht dauerhaft und für jeden lesbar auf der Doichain. Ist der Betreiber des Dienstes ein Dritter und nicht dein Dienstleister, ist schon die Übermittlung ein Teilen. Die Ausnahme „vom Nutzer ausgelöst“ ließe sich vertreten, weil die Verankerung der Zweck der App ist und der Startbildschirm darauf hinweist. Das Senden läuft aber standardmäßig automatisch nach der Aufnahme. Deshalb im Zweifel „geteilt“.
- **Erforderlich (Ermessen):** Die Verankerung ist die Kernfunktion und läuft standardmäßig automatisch. „Optional“ wäre vertretbar, weil sich „Nach Aufnahme sofort senden“ (die Wahl bleibt gespeichert) und der Online-Abgleich abschalten lassen. Es würde im Store aber eine Wahlmöglichkeit betonen, die es für die Hauptfunktion praktisch nicht gibt. Empfehlung: „erforderlich“.
- **Nicht flüchtig:** Die Blockchain speichert dauerhaft.

#### Sonstige nutzergenerierte Inhalte (App-Aktivitäten)

| Frage | Antwort |
|---|---|
| Erhoben / geteilt | **Erhoben** und **geteilt** |
| Flüchtig verarbeitet | Nein |
| Erforderlich oder optional | **Erforderlich** |
| Zweck der Erhebung | App-Funktionen |
| Zweck der Weitergabe | App-Funktionen |

**Begründung:**

- **Was:** Mit jedem Hash geht die Notiz „DoiProof v3; Gerät: <Aufnahmezeit laut Gerät>“ an den Dienst (bei ausgewählten Fotos „DoiProof evidence v3“). Sie steht zusammen mit dem Hash dauerhaft und öffentlich auf der Blockchain. Die Aufnahmezeit verrät, wann jemand fotografiert hat.
- **Warum diese Kategorie (Ermessen):** Google nennt bei „Sonstige nutzergenerierte Inhalte“ ausdrücklich Notizen als Beispiel. Man könnte die Notiz auch unter „Dateien und Dokumente“ mitzählen. Die eigene Angabe macht die öffentliche Notiz aber sichtbar. Empfehlung: zusätzlich angeben.
- **Erforderlich:** Wer verankert, sendet die Notiz immer mit; ein Schalter dafür fehlt.

#### Expo-Daten: geteilt oder nicht, und welcher Zweck

Die drei folgenden Datentypen (Absturzprotokolle, Diagnose, Geräte- oder andere IDs) gehen alle an Expo (D4). Für alle drei gilt:

- **Erhoben oder auch geteilt** hängt vom Auftragsverarbeitungsvertrag mit Expo ab ([PLAY-STORE.md, Teil 0, Punkt 8](../PLAY-STORE.md#0-vorab-entscheidungen)):
  - **Mit Vertrag** (Data Processing Addendum von Expo): Expo verarbeitet als Dienstleister in deinem Auftrag. Angabe: nur **erhoben**, nicht geteilt. In der Datenschutzerklärung (Abschnitt 4.4) die Variante „AVV“ behalten.
  - **Ohne Vertrag:** Expo ist kein Dienstleister im Sinne von Google. Angabe: **erhoben und geteilt**, Zweck der Weitergabe „App-Funktionen“. In der Datenschutzerklärung die Variante „OHNE AVV“ behalten.
- **Zweck:** nur **„App-Funktionen“**, **„Analysen“ nicht ankreuzen**. Die Angaben dienen der Update-Funktion selbst; du wertest sie nicht als Nutzungs- oder Absturzanalyse aus. Die Datenschutzerklärung schließt Nutzungsanalyse ausdrücklich aus. Ein Haken bei „Analysen“ würde ihr widersprechen, und genau solche Widersprüche prüft Google. Dass Expo anhand der Installations-ID zählt, wie viele Installationen die Update-Funktion nutzen (Statistik und Abrechnung im Expo-Konto), nennt die Datenschutzerklärung in Abschnitt 4.4.

#### Absturzprotokolle

| Frage | Antwort |
|---|---|
| Erhoben / geteilt | **Erhoben**; zusätzlich **geteilt** nur ohne Auftragsverarbeitungsvertrag mit Expo |
| Flüchtig verarbeitet | Nein |
| Erforderlich oder optional | **Erforderlich** |
| Zweck der Erhebung | App-Funktionen |
| Zweck der Weitergabe (nur ohne Vertrag) | App-Funktionen |

**Begründung:**

- **Was:** Kann das Update-System beim Start nicht geladen werden, startet die App mit der eingebauten Version, und `expo-updates` schreibt die Fehlermeldung in eine Datei. Bei der nächsten Update-Prüfung sendet es sie im Header `Expo-Fatal-Error` (höchstens 1024 Zeichen) an Expo (D4). Gewöhnliche Abstürze der App sendet DoiProof nicht; eine Absturzbibliothek gibt es nicht.
- **Geteilt oder nicht, Zweck:** siehe oben.
- **Erforderlich:** Die Übermittlung lässt sich in der App nicht abschalten.

#### Diagnose (Ermessen)

| Frage | Antwort |
|---|---|
| Erhoben / geteilt | **Erhoben**; zusätzlich **geteilt** nur ohne Auftragsverarbeitungsvertrag mit Expo |
| Flüchtig verarbeitet | Nein |
| Erforderlich oder optional | **Erforderlich** |
| Zweck der Erhebung | App-Funktionen |
| Zweck der Weitergabe (nur ohne Vertrag) | App-Funktionen |

**Begründung:** Jede Update-Prüfung sendet technische Zustandsdaten an Expo: Laufzeitversion, die IDs des laufenden und des eingebauten Updates und die IDs von Updates, deren Start kürzlich fehlgeschlagen ist (D4). Das sind technische Diagnoseangaben im weiteren Sinn. Man kann sie als bloße Protokollangaben auch weglassen. Empfehlung nach dem Grundsatz „im Zweifel mehr“: angeben. Geteilt oder nicht und Zweck: siehe oben.

#### Geräte- oder andere IDs

| Frage | Antwort |
|---|---|
| Erhoben / geteilt | **Erhoben**; zusätzlich **geteilt** nur ohne Auftragsverarbeitungsvertrag mit Expo |
| Flüchtig verarbeitet | Nein |
| Erforderlich oder optional | **Erforderlich** |
| Zweck der Erhebung | App-Funktionen |
| Zweck der Weitergabe (nur ohne Vertrag) | App-Funktionen |

**Begründung:**

- **Was:** Die Expo-Bibliothek `expo-eas-client` erzeugt beim ersten Start eine zufällige ID (UUID) und speichert sie in der App. `expo-updates` sendet sie bei jedem Start im Header `EAS-Client-ID` an Expo, ebenso bei jeder Update-Abfrage und jedem Update-Download. Die ID hängt nicht an der Hardware, bleibt aber bis zum Löschen der App-Daten oder zur Deinstallation gleich. Sie ist also pseudonym, und Google nennt vergleichbare IDs wie die „Firebase installation ID“ ausdrücklich.
- **Geteilt oder nicht:** siehe oben.
- **Erforderlich:** Die Update-Prüfung läuft bei jedem Start und lässt sich in der App nicht abschalten.
- **Zweck:** „App-Funktionen“, weil Expo darüber Updates ausliefert. Auch das Zählen der Installationen gehört zum Update-Dienst von Expo, nicht zu einer Auswertung durch dich; „Analysen“ deshalb nicht ankreuzen (siehe oben).

### 7.5 Schritt „Vorschau“

Die Vorschau zeigt den späteren Abschnitt „Datensicherheit“ im Store. Erwartet etwa:

- **Weitergegebene Daten:** Standort; Dateien und Dokumente; App-Aktivitäten. Ohne Auftragsverarbeitungsvertrag mit Expo zusätzlich App-Informationen und Leistung; Geräte- oder andere IDs.
- **Erhobene Daten:** Standort; Dateien und Dokumente; App-Aktivitäten; App-Informationen und Leistung; Geräte- oder andere IDs.
- **Zwecke:** bei allen Datentypen nur „App-Funktionen“.
- **Sicherheitspraktiken:** Daten werden bei der Übertragung verschlüsselt; Daten können nicht gelöscht werden.

Weicht die Vorschau davon ab, die Antworten in 7.3 und 7.4 vergleichen. Danach **„Senden“**.

### 7.6 Was die Antworten ändern würde

| Änderung | Folge für das Formular |
|---|---|
| Der Betreiber des Doichain-Dienstes bist du selbst oder ein Dienstleister in deinem Auftrag | Hash und Notiz bleiben „geteilt“, weil sie öffentlich auf der Blockchain stehen. In der Datenschutzerklärung den Empfänger anpassen. |
| Der Dienst speichert IP-Adressen über die Tageszählung hinaus oder leitet daraus den Ort ab | „Ungefährer Standort“ und gegebenenfalls „Geräte- oder andere IDs“ auch für den Dienst angeben; „geteilt“, wenn er ein Dritter ist |
| Der Dienst gibt personenbezogene Schlüssel aus | „Nutzer-IDs“ angeben (siehe 7.3) |
| Kartenausschnitt im Tab „Prüfen“ standardmäßig aus | „Genauer Standort“ bleibt erhoben. „Geteilt“ ließe sich dann mit der Ausnahme „vom Nutzer ausgelöst“ begründen. Empfehlung: trotzdem „geteilt“ lassen. |
| Kartenausschnitt in der App entfernt | „Genauer Standort“ entfällt |
| `allowBackup` auf `false` | Keine Änderung am Formular; in der Datenschutzerklärung (Abschnitt 4.6, „Android-Sicherung“) Option B statt Option A behalten |
| Kein Auftragsverarbeitungsvertrag mit Expo (oder er endet) | Absturzprotokolle, Diagnose und Geräte- oder andere IDs zusätzlich „geteilt“, Zweck der Weitergabe „App-Funktionen“; in der Datenschutzerklärung (Abschnitt 4.4) Variante „OHNE AVV“ |
| Du wertest Daten von Expo über die Update-Verteilung hinaus aus, etwa als Nutzungs- oder Absturzstatistik | „Analysen“ als Zweck ergänzen und die Datenschutzerklärung anpassen; die Aussage „keine Nutzungsanalyse“ gilt dann nicht mehr |
| Neue Bibliothek oder neuer Dienst (Analyse, Absturzberichte, Karten) | Vor dem Build Formular und Datenschutzerklärung anpassen, nie per EAS Update ausliefern ([PLAY-STORE.md, Teil 12](../PLAY-STORE.md#12-spätere-updates)) |

## 8. Berechtigungserklärungen

Die Play Console verlangt Erklärungen nur für bestimmte Berechtigungen. Sie erscheinen nach dem ersten Upload als Aufgabe unter „App-Inhalte“ oder als Fehler im Release. Für DoiProof ist **voraussichtlich keine** nötig. Endgültige Berechtigungen im Release: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE` und `WRITE_EXTERNAL_STORAGE` (nur bis Android 9). Dazu kommt die signaturgeschützte Berechtigung `<paketname>.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` aus einer Android-Bibliothek; sie ist unbedenklich.

| Berechtigung oder Thema | Erklärung nötig? | Begründung |
|---|---|---|
| Standort (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`) | Nein | Die App fragt den Standort nur im Vordergrund ab, und zwar nur, wenn im Profil „Standort & Sensoren“ oder „Individuell“ (mit „GPS, Höhe und Genauigkeit“) „Foto aufnehmen“ oder „Foto wählen“ angetippt wird. `ACCESS_BACKGROUND_LOCATION` ist gesperrt. Eine Erklärung verlangt Google nur für den Standort im Hintergrund. Für Ende Januar 2027 hat Google eine Änderung der Standortrichtlinie angekündigt (Standort-Schaltfläche ab Ziel-API 37). Das betrifft einen späteren Build. |
| Kamera (`CAMERA`) | Nein | Normale Laufzeitberechtigung. Die App fragt sie erst beim Tippen auf „Foto aufnehmen“ ab. Die Kamera ist als optionales Hardware-Merkmal deklariert. |
| Foto- und Videoberechtigungen (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`) | Nein | Beide sind gesperrt, ebenso `READ_MEDIA_VISUAL_USER_SELECTED` und `READ_EXTERNAL_STORAGE`. „Foto wählen“ nutzt die Android-Fotoauswahl (Photo Picker), die keine Berechtigung braucht. Fragt die Console trotzdem danach, im App-Bundle-Explorer die Berechtigungen prüfen und melden. |
| `WRITE_EXTERNAL_STORAGE` (nur bis Android 9) | Nein | Die Bibliothek `expo-image-picker` verlangt sie unter Android 7 bis 9 für Kameraaufnahmen. Eine Erklärung verlangt Google nur für „Alle Dateien“ (`MANAGE_EXTERNAL_STORAGE`), die DoiProof nicht nutzt. |
| Vordergrunddienste | Voraussichtlich nein | `expo-location` trägt einen Standortdienst ins Manifest ein, die Berechtigungen `FOREGROUND_SERVICE` und `FOREGROUND_SERVICE_LOCATION` fehlen aber, und die App startet den Dienst nie. Verlangt die Console trotzdem eine Erklärung, **nicht abgeben, sondern melden**: Der Dienst lässt sich per Config-Plugin entfernen ([PLAY-STORE.md, Teil 8](../PLAY-STORE.md#8-upload-in-den-internen-test)). |
| Körperliche Aktivität (`ACTIVITY_RECOGNITION`) | Nein | Gesperrt. Die Sensoren der App brauchen sie unter Android nicht. |
| Werbe-ID (`AD_ID`) | Nein | Gesperrt, siehe 3b |
| `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE` | Nein | Normale Berechtigungen ohne Erklärung |
| SMS, Anrufliste, Bedienungshilfen, `QUERY_ALL_PACKAGES`, exakte Wecker, Health Connect | Nein | Nicht vorhanden |

## 9. Händlerstatus in der EU (Gesetz über digitale Dienste)

**In der Play Console prüfen, gegebenenfalls rechtlich beraten lassen.** Diese Erklärung gehört nicht zu „App-Inhalte“, sondern zu den Konto- bzw. Entwicklereinstellungen. Eine offizielle Google-Hilfeseite dazu war bei der Recherche nicht auffindbar; Ort und Wortlaut zeigt erst dein Konto.

- **Grundlage:** Nach dem Gesetz über digitale Dienste der EU (Digital Services Act, Art. 30 und 31) müssen Plattformen die Identität von **Händlern** erfassen und Verbrauchern anzeigen. Nach der Verbraucherrechte-Richtlinie (in Deutschland § 312l BGB) müssen Marktplätze außerdem mitteilen, ob ein Anbieter Händler ist.
- **Einordnung:** Händler ist, wer zu gewerblichen oder beruflichen Zwecken handelt. Auch eine kostenlose App ohne Werbung kann darunter fallen, wenn sie im Zusammenhang mit einer gewerblichen Tätigkeit erscheint. Ein **Organisationskonto** steht für eine Organisation oder ein Unternehmen. Deshalb musst du dich vermutlich als **Händler** ausweisen.
- **Folge:** Für Nutzer in der EU zeigt Google Play dann Name, Geschäftsanschrift, Telefonnummer und E-Mail-Adresse an. Verwende dafür geschäftliche Angaben, keine privaten. Organisationskonten zeigen nach den vorliegenden Quellen ohnehin eine bestätigte E-Mail-Adresse und Telefonnummer.
- **Nicht-Händler** zeigt Play laut Drittquellen mit dem Hinweis an, dass Verbraucherrechte gegenüber dem Anbieter nicht gelten. Diese Angabe wählst du nur, wenn du sicher bist, dass sie zutrifft.
- **Impressum:** Unabhängig davon brauchen geschäftsmäßige digitale Dienste in Deutschland ein Impressum (§ 5 DDG). Play hat dafür kein eigenes Feld. Verlinke es in der Store-Beschreibung (`[URL-IMPRESSUM]`), auf der Website und in „Über diese App“ (siehe [STORE-EINTRAG.md](STORE-EINTRAG.md)).

## Wann die Antworten neu zu prüfen sind

- vor jedem neuen Store-Build mit neuer Bibliothek, neuer Berechtigung oder neuem Netzwerkziel,
- wenn sich Voreinstellungen ändern, die Daten senden (Karte, Online-Abgleich, „Nach Aufnahme sofort senden“),
- wenn der Betreiber des Doichain-Dienstes oder dessen Umgang mit IP-Adressen geklärt ist oder sich der Stand des Auftragsverarbeitungsvertrags mit Expo ändert,
- wenn Google Fragen oder Kategorien ändert. Die Play Console meldet das als neue Aufgabe im Dashboard.

Formular, Datenschutzerklärung, Store-Text und App-Texte immer gemeinsam ändern.

## Belege

Alle Pfade sind relativ zum Repository; Prüfstand Branch `claude/peaceful-ramanujan-qbwqku` (Commit `76d2a20`), `expo-updates` 57.0.24, `expo-eas-client` 57.0.4.

| Aussage | Fundstelle (Datei:Zeile) |
|---|---|
| D1: Adresse des Doichain-Dienstes, JSON-RPC per HTTPS-POST, optionaler Header `X-API-Key` | `core/mcp.mjs:6`, `core/mcp.mjs:42-53` (Header in `:50`) |
| D1: Verankerung sendet `sha256` und `note` (höchstens 160 Zeichen) | `src/doichain.ts:76-81` |
| D1: Inhalt der Notiz mit Aufnahmezeit | `src/screens/CaptureScreen.tsx:140-141` |
| D1: Senden nach der Aufnahme standardmäßig an, Wahl bleibt gespeichert (`doiproof-settings.json`) | `src/screens/CaptureScreen.tsx:51`, `:230`, Schalter `:365`, Laden und Speichern `:121-129`; `src/appSettings.ts:7`; `src/settings.ts:4-13` |
| D1: Hinweis „öffentlich und dauerhaft“ in der App | `src/screens/CaptureScreen.tsx:302`, `:319-321` |
| D1: Kontingent je IP-Adresse (10 je Tag, 200 insgesamt), Schlüssel nur in der Sitzung | `src/screens/CaptureScreen.tsx:359-364` |
| D2: Kontingentabfrage beim Start, Statusabfragen jede Minute und beim Zurückkehren | `src/screens/CaptureScreen.tsx:111`, `:114-117`; `src/doichain.ts:41-43`, `:71-74` |
| D2: Vorab-Blöcke (Blockstream und Doichain) vor der Kamera, Standard an | `src/chainAnchors.ts:4`, `:20-27`, `:29-50`; `src/screens/CaptureScreen.tsx:52`, `:173-176` |
| D2: Online-Abgleich im Prüfer und beim PDF aus dem Verlauf, Standard an | `src/screens/VerifyScreen.tsx:13`, Hinweis `:73`; `src/screens/CaptureScreen.tsx:63`, `:385`; `core/verify.mjs:16`, `:289`, `:300`, `:305`, `:328`, `:342` |
| D3: Kachelserver, Zoomstufe 14, 7 Tage Zwischenspeicher, Ausschnitt 662 × 340 px | `core/map.mjs:10`, `:13`, `:15`, `:23` |
| D3: Kachelauswahl rund um den Standort, Abruf mit User-Agent | `core/map.mjs:64-81`, `:114-147` (Abruf `:131-133`) |
| D3: Zwischenspeicher und User-Agent in der App | `src/platform.ts:45-69`, `:72-77` |
| D3: Karte nur bei „Standort im Bericht“ und „Kartenausschnitt“ | `src/verifier.ts:48-59` |
| D3: Voreinstellung im Verlauf (Standort aus, Karte an) und Hinweistext | `src/screens/CaptureScreen.tsx:61-62`, `:387-389` |
| D3: Voreinstellung im Prüfer (Standort und Karte an) und Hinweistext | `src/screens/VerifyScreen.tsx:18-19`, `:84-86` |
| D3: Auslieferung über das CDN der Fastly, Inc. | OSMF-Betriebsbericht vom 24.07.2022 (Quellen) |
| D3: Genauigkeit unter 3 km² | Ausschnitt aus `core/map.mjs:23` und `:64-81` nachgerechnet; Definition auf developer.android.com (Quellen) |
| D4: Update-Prüfung bei jedem Start | `app.json:11-15` (`checkAutomatically: ON_LOAD`); `node_modules/@expo/config-plugins/build/utils/Updates.js:198-199` (ON_LOAD → ALWAYS) |
| D4: Header `EAS-Client-ID`, Plattform, Laufzeitversion bei der Update-Abfrage | `node_modules/expo-updates/android/src/main/java/expo/modules/updates/loader/FileDownloader.kt:938-958` (`EAS-Client-ID` in `:952`) |
| D4: `EAS-Client-ID` auch beim Update-Download | `node_modules/expo-updates/android/src/main/java/expo/modules/updates/loader/FileDownloader.kt:832-836` |
| D4: Header `Expo-Fatal-Error` (höchstens 1024 Zeichen) | `node_modules/expo-updates/android/src/main/java/expo/modules/updates/loader/FileDownloader.kt:959-968` |
| D4: Fehlermeldung nur, wenn das Update-System beim Start nicht geladen werden kann (Notstart mit der eingebauten Version) | `node_modules/expo-updates/android/src/main/java/expo/modules/updates/launcher/NoDatabaseLauncher.kt:32-36`, `:45`, `:63-66`; `node_modules/expo-updates/android/src/main/java/expo/modules/updates/procedures/StartupProcedure.kt:83` |
| D4: IDs des laufenden, eingebauten und fehlgeschlagenen Updates | `node_modules/expo-updates/android/src/main/java/expo/modules/updates/loader/FileDownloader.kt:998-1012` |
| D4: Zufällige, dauerhaft gespeicherte Installations-ID | `node_modules/expo-eas-client/android/src/main/java/expo/modules/easclient/EASClientID.kt:6-7`, `:26-37`; Verwendung `node_modules/expo-updates/android/src/main/java/expo/modules/updates/EnabledUpdatesController.kt:77` |
| D4: Kanal aus dem Header `expo-channel-name`, Kanal `production` | `node_modules/expo-updates/android/src/main/java/expo/modules/updates/IUpdatesController.kt:114`; `eas.json:13-16` |
| D4: manuelle Update-Prüfung | `src/components/AboutCard.tsx:13-19` |
| D5: Foto und Verlauf lokal gespeichert | `src/bundle.ts:6`, `:13-18`; `src/history.ts:6-7` |
| D5: ZIP und PDF nur über den Teilen-Dialog | `src/bundle.ts:48-55`; `src/verifier.ts:62-68` |
| D5: ZIP-Import kopiert in den App-Cache, ohne Speicherberechtigung | `src/verifier.ts:13-18` |
| D5: Originalfoto unverändert kopiert und ins ZIP übernommen; im PDF ohne EXIF, XMP, IPTC und Kommentare; Hinweise in App und Bericht | `src/bundle.ts:13-18`, `:28-30`; `core/image.mjs:141-175`; `core/report-pdf.mjs:819-825`; `core/report-model.mjs:609`; `src/screens/CaptureScreen.tsx:321` |
| D5: Gerätemodell und Systemversion nur im lokalen Manifest | `src/evidence.ts:40-44` |
| Standort nur im Vordergrund und nur, wenn das Profil ihn enthält („Standort & Sensoren“ oder „Individuell“ mit „GPS, Höhe und Genauigkeit“), bei Kamera und Fotoauswahl; Standardprofil „Privat“ | `src/evidence.ts:51-56`; `src/evidenceManifest.ts:29-35`; `src/screens/CaptureScreen.tsx:59`, `:170`, `:309-314` |
| Sensorwerte nur bei Kameraaufnahmen | `src/evidence.ts:57` |
| Kamerafreigabe erst beim Tippen auf „Foto aufnehmen“ | `src/screens/CaptureScreen.tsx:164-166` |
| Fotoauswahl ohne Berechtigung (Photo Picker) | `src/screens/CaptureScreen.tsx:189`; `node_modules/expo-image-picker/android/src/main/java/expo/modules/imagepicker/ImagePickerModule.kt:85-87` |
| Keine weiteren Netzwerkziele, keine Analyse- oder Werbebibliothek | Netzwerkaufrufe nur in `core/mcp.mjs:44`, `core/map.mjs:131`, `core/verify.mjs:328`, `src/chainAnchors.ts:33`, `:37`; Abhängigkeiten `package.json:15-36` |
| Gesperrte Berechtigungen (u. a. `ACTIVITY_RECOGNITION`, `READ_*`, `AD_ID`, Hintergrundstandort, Mikrofon) | `app.json:45-55` |
| `WRITE_EXTERNAL_STORAGE` nur bis Android 9, Kamera optional | `plugins/with-android-play.js:12-26` |
| `ACCESS_NETWORK_STATE` aus `expo-updates` | `node_modules/expo-updates/android/src/main/AndroidManifest.xml:2` |
| Standortdienst im Manifest ohne Vordergrunddienst-Berechtigung | `node_modules/expo-location/android/src/main/AndroidManifest.xml:2-9`; `node_modules/expo-location/plugin/build/withLocation.js:124-135` |
| Android-Sicherung standardmäßig an | `node_modules/@expo/config-plugins/build/android/AllowBackup.js:26` |
| Unverschlüsselter Verkehr nur im Debug-Manifest | `node_modules/expo/template.tgz` → `package/android/app/src/debug/AndroidManifest.xml` |
| Einreichung als Entwurf im internen Test | `eas.json:21-26` |

## Quellen

Stand Oktober 2026. Die Seiten unter support.google.com waren bei der Recherche nur über Suchzusammenfassungen erreichbar; Wortlaut und Feldnamen in der Play Console bestätigen.

- Android-Entwicklerdoku: [Datenerhebung und -weitergabe (Datentypen, genauer und ungefährer Standort)](https://developer.android.com/guide/topics/data/collect-share), [Photo Picker](https://developer.android.com/training/data-storage/shared/photo-picker)
- Play-Console-Hilfe: [Datensicherheit](https://support.google.com/googleplay/android-developer/answer/10787469), [Nutzerdaten und Datenschutzerklärung](https://support.google.com/googleplay/android-developer/answer/10144311), [Inhaltsbewertungen](https://support.google.com/googleplay/android-developer/answer/188189), [Zielgruppe und Familienrichtlinie](https://support.google.com/googleplay/android-developer/answer/9893335), [Finanzfunktionen](https://support.google.com/googleplay/android-developer/answer/13849271), [Gesundheits-Apps](https://support.google.com/googleplay/android-developer/answer/14738291), [Blockchain-Inhalte](https://support.google.com/googleplay/android-developer/answer/13607354), [Foto- und Videoberechtigungen](https://support.google.com/googleplay/android-developer/answer/14115180), [Vordergrunddienste](https://support.google.com/googleplay/android-developer/answer/13392821)
- Expo: [EAS-Client-ID](https://docs.expo.dev/eas/observe/reference/client-id/)
- OpenStreetMap Foundation, Operations Working Group: [Post-Mortem zur Standard-Kachelebene vom 24.07.2022](https://operations.osmfoundation.org/2022/07/24/standard-tile-layer.html) (Kacheln über das CDN von Fastly, Render-Server in Europa, Australien und den USA, Verteilung nach geografischer Lage)
- EU: [Gesetz über digitale Dienste](https://commission.europa.eu/strategy-and-policy/priorities-2019-2024/europe-fit-digital-age/digital-services-act_de)
