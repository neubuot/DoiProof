# Datenschutzerklärung der App DoiProof – Vorlage

> **Vorlage, keine Rechtsberatung.** Diese Datei ist ein Entwurf für die Datenschutzerklärung, die du auf deiner eigenen Website veröffentlichst. Ersetze vorher alle Platzhalter in eckigen Klammern, triff die markierten Entscheidungen und lass den Text von einer fachkundigen Person prüfen (Anwalt oder Datenschutzberater). Auf die Website kommt **nur** der Abschnitt zwischen „Beginn des Textes für die Website“ und „Ende des Textes für die Website“. Die Hinweise davor und der Anhang „Belege für den Entwickler“ werden nicht veröffentlicht.

**Stand der Vorlage:** 11. Oktober 2026, DoiProof 1.0.0 für Android, Code-Stand `76d2a20`. Das Repository ist öffentlich. Echte Namen, Anschriften und E-Mail-Adressen trägst du deshalb nur in die Kopie auf deiner Website ein, nie in diese Datei.

## Vor dem Veröffentlichen

### Platzhalter

| Platzhalter | Was hinein gehört |
|---|---|
| `[VERANTWORTLICHER]` | Name oder Firma, genau wie als Entwickler in der Play Console angezeigt |
| `[ANSCHRIFT]` | ladungsfähige Anschrift |
| `[E-MAIL]` | Kontaktadresse für Datenschutzfragen, am besten dieselbe wie im Store |
| `[URL-DATENSCHUTZ]`, `[URL-IMPRESSUM]` | Adressen der beiden Seiten auf deiner Website |
| `[DATUM]` | Tag der Veröffentlichung |
| `[PAKETNAME]` | derzeit `org.doichain.doiproof`, **noch nicht endgültig**. Er wird spätestens mit dem ersten Upload in der Play Console festgelegt und lässt sich danach nie mehr ändern. Die Entscheidung fällt vor dem Anlegen der App. |
| `[BETREIBER DES DIENSTES]`, `[ANSCHRIFT DES BETREIBERS]`, `[URL DATENSCHUTZ DES BETREIBERS]` | wer `doi-api.sendlabs.de` betreibt (Entscheidung 1) |
| `[SERVERSTANDORT DES DIENSTES]` | Land, in dem dieser Dienst läuft |
| `[SPEICHERDAUER BEIM DIENST]` | wie lange der Dienst IP-Adressen und Anfragen speichert; beim Betreiber erfragen |
| `[SITZ VON BLOCKSTREAM]` | Entscheidung 3 |
| `[ZUSTÄNDIGE AUFSICHTSBEHÖRDE]` | Datenschutzbehörde deines Bundeslands mit Anschrift und Website; eine Liste führt die Datenschutzkonferenz (datenschutzkonferenz-online.de) |

### Entscheidungen

1. **Betreiber des Doichain-Dienstes.** In Abschnitt 4.1 genau eine Option behalten. Option A: Du betreibst den Dienst selbst, oder ein Dienstleister betreibt ihn in deinem Auftrag; dann brauchst du mit ihm einen Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Option B: Ein Dritter betreibt ihn in eigener Verantwortung. Bei Option A auch den Satz „[NUR BEI OPTION A IN 4.1 …]“ in Abschnitt 2 behalten. Die Wahl muss zu deinen Angaben im Formular „Datensicherheit“ passen ([PLAY-STORE.md](../PLAY-STORE.md), Teil 0 und 4).
2. **Android-Sicherung (`allowBackup`).** Derzeit `true`. In Abschnitt 4.6 Option A (Sicherung erlaubt) oder Option B (`android.allowBackup: false` in `app.json`) behalten. Bei Option A auch die Sätze „[NUR BEI OPTION A IN 4.6 …]“ in Abschnitt 2 und 4.4 behalten, bei Option B streichen. Die Einstellung ist nativ und muss vor dem Build feststehen.
3. **Sitz von Blockstream.** Den Blockdienst `blockstream.info` betreibt Blockstream Corporation Inc. Öffentliche Quellen nennen als Sitz Kanada (Montréal) oder die USA (Kalifornien). Die Datenschutzerklärung unter <https://blockstream.com/privacy> war bei der Recherche nicht abrufbar. Prüfe dort Sitz und Rechtsform und behalte in Abschnitt 4.2 die passende Variante.
4. **Rolle von Expo.** Prüfe, ob Expo einen Auftragsverarbeitungsvertrag anbietet, und schließe ihn ab. Mit Vertrag in Abschnitt 4.4 die Varianten „AVV“ behalten, ohne Vertrag die Varianten „OHNE AVV“. Das muss zum Formular „Datensicherheit“ passen: Mit Vertrag sind die Expo-Daten dort nur „erhoben“, ohne Vertrag auch „geteilt“ ([PLAY-STORE.md](../PLAY-STORE.md), Teil 0, Punkt 8). Als Zweck in beiden Fällen nur „App-Funktionen“ ankreuzen, nicht „Analysen“; Abschnitte 2 und 5 verneinen eine Nutzungsanalyse.
5. **EU-US Data Privacy Framework (DPF).** Die DPF-Liste war bei der Recherche nicht erreichbar. Prüfe dort (<https://www.dataprivacyframework.gov/list>) drei Einträge und behalte jeweils die passende Variante:
   - „650 Industries“ (Expo, Abschnitt 4.4): Expo erklärt selbst, nach dem DPF zu arbeiten; eine Suchzusammenfassung zeigt den Eintrag als aktiv (EU-US und Schweiz, zertifiziert seit 2020). Ist er nicht aktiv, die Variante mit Standardvertragsklauseln behalten. Sie setzt voraus, dass diese Klauseln mit Expo vereinbart sind, meist als Teil des Auftragsverarbeitungsvertrags. Fehlen DPF-Eintrag und Vertrag, lass dich beraten.
   - „Fastly“ (Abschnitt 4.3): Über das Netz der Fastly, Inc. kommen die OpenStreetMap-Kartenkacheln.
   - „Google LLC“ (Abschnitt 4.5). Ist der Eintrag nicht aktiv, dort den Satz zur Zertifizierung streichen.

### Außerdem

- **Anrede:** Die Vorlage spricht Nutzer wie die App mit „du“ an. Für „Sie“ den Text durchgehend anpassen.
- **Geltungsbereich:** Der Text gilt nur für die Android-App aus Google Play. Für iOS (TestFlight, App Store) später ergänzen: Apple statt Google als Vertriebsweg; auf dem iPhone verlangen die Bewegungssensoren eine eigene Freigabe.
- **Website:** Die Seite muss öffentlich, ohne Anmeldung und als HTML-Seite erreichbar sein (kein PDF). Für die Website selbst (Hosting, Server-Protokolle) brauchst du eine eigene Datenschutzerklärung oder einen eigenen Abschnitt; diese Vorlage deckt nur die App ab.
- **Gleichklang:** Datenschutzerklärung, Formular „Datensicherheit“ und die Hinweise in der App müssen zusammenpassen. Den Link zur Erklärung braucht Google auch in der App. „Über diese App“ enthält ihn noch nicht; er wird eingebaut, sobald `[URL-DATENSCHUTZ]` feststeht, und zwar vor dem Build ([PLAY-STORE.md](../PLAY-STORE.md), Teil 0, Punkt 5).
- **Neue Datenflüsse** (ein weiterer Dienst, eine neue Datenart) erst hier und im Formular ergänzen, dann ausliefern, und zwar nie per EAS Update.

---

**Beginn des Textes für die Website**

---

## Datenschutzerklärung für die App „DoiProof“

Stand: [DATUM]

### 1. Verantwortlicher

[VERANTWORTLICHER]\
[ANSCHRIFT]\
E-Mail: [E-MAIL]\
Impressum: [URL-IMPRESSUM]

Diese Erklärung gilt für die Android-App „DoiProof“ aus Google Play (Paketname [PAKETNAME]). Sie beschreibt, welche Daten die App verarbeitet, wohin sie gelangen und welche Rechte du hast.

### 2. Das Wichtigste in Kürze

DoiProof bindet ein Foto und die bei der Aufnahme gemessenen Angaben (Gerätezeit, auf Wunsch Standort und, bei Kameraaufnahmen, Sensorwerte) zu einem Beweispaket. Den digitalen Fingerabdruck dieses Pakets (SHA-256-Hash) verankert die App auf der öffentlichen Blockchain Doichain.

**Auf deinem Gerät bleiben:** Foto, Manifest mit allen Messwerten, die genauen GPS-Koordinaten, Sensorwerte, Nachweisverlauf und Berichte. Sie verlassen das Gerät nur, wenn du ein Beweispaket (ZIP) oder einen Prüfbericht (PDF) selbst teilst. [NUR BEI OPTION A IN 4.6: Hast du die Google-Sicherung eingeschaltet, kann Android sie außerdem in deinem Google-Konto sichern (4.6).]

**Das Gerät verlassen:**

- Paket-Hash und eine kurze Notiz mit der Aufnahmezeit an den Doichain-Dienst. Beides steht danach **öffentlich und dauerhaft** auf der Blockchain und **kann nicht gelöscht werden**.
- Abfragen öffentlicher Block- und Transaktionsdaten beim Doichain-Dienst und bei Blockstream.
- Nur beim Kartenausschnitt im PDF-Bericht: Abrufe von Kartenkacheln bei OpenStreetMap. Der Kartendienst erfährt dabei die Umgebung des Standorts auf etwa 1 km genau.
- Bei jedem Start eine Update-Prüfung bei Expo mit einer zufälligen Installationskennung.
- Bei jeder dieser Verbindungen deine IP-Adresse.

Es gibt kein Konto, keine Werbung, keine Nutzungsanalyse, kein Tracking und keine In-App-Käufe. Technische Diagnoseangaben erhält Expo im Rahmen der Update-Prüfung (4.4); zusammengefasste Statistiken und Absturzberichte stellt uns Google Play bereit (4.5). Wir betreiben keinen eigenen Server, der Daten aus der App empfängt. [NUR BEI OPTION A IN 4.1: Ausnahme ist der Doichain-Dienst.]

### 3. Rechtsgrundlagen im Überblick

- **Art. 6 Abs. 1 lit. b DSGVO (Vertrag):** Mit Installation und Nutzung der kostenlosen App entsteht ein Nutzungsverhältnis. Die Funktionen, die du in der App auslöst, etwa Verankerung, Prüfung und Bericht, erbringen wir auf dieser Grundlage.
- **Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse):** für Update-Prüfung, Missbrauchsschutz und Store-Statistiken. Das jeweilige Interesse nennen wir unten.
- **Keine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO):** Die App holt keine Einwilligung ein. Ihre Schalter wählen Funktionen aus.
- **Speichern auf dem Gerät:** Informationen speichert und liest die App auf deinem Gerät nur, soweit das für die von dir genutzte App unbedingt erforderlich ist (§ 25 Abs. 2 Nr. 2 TDDDG).
- **Keine Pflicht zur Bereitstellung:** Du bist weder gesetzlich noch vertraglich verpflichtet, Daten bereitzustellen. Ohne Übermittlung von Hash und Notiz kann die App keinen Nachweis verankern. Ohne Internetverbindung funktionieren Verankerung, Vorab-Blöcke, Online-Prüfung, Kartenausschnitt und Update-Prüfung nicht. Standort und Sensorwerte sind freiwillig.

### 4. Verarbeitungen im Einzelnen

#### 4.1 Verankerung auf der Doichain

**Wann:** Nach einer Aufnahme, wenn „Nach Aufnahme sofort senden“ eingeschaltet ist (Voreinstellung), oder wenn du „Nachweis anlegen“ bzw. „Jetzt senden“ antippst. Solange die App geöffnet ist, fragt sie den Stand offener Einreichungen etwa jede Minute und beim Zurückkehren in die App ab. Beim Öffnen und auf Knopfdruck fragt sie das verbleibende Tageskontingent ab.

**Daten:**

- Paket-Hash: ein SHA-256-Wert aus 64 Zeichen, berechnet aus Foto und Manifest.
- Notiz: bei Kameraaufnahmen „DoiProof v3; Gerät: “ und die Aufnahmezeit laut Gerät (UTC, auf die Millisekunde), bei ausgewählten Fotos nur „DoiProof evidence v3“.
- Bei Statusabfragen: Paket-Hash, Transaktions-ID und Block-Hash.
- Ein eigener API-Schlüssel, falls du einen eingibst. Er bleibt nur bis zum Schließen der App im Arbeitsspeicher. Wer dir den Schlüssel gegeben hat, kann deine Einreichungen diesem Schlüssel zuordnen.
- Deine IP-Adresse. Sie ist technisch nötig; der Dienst zählt damit das kostenlose Tageskontingent je IP-Adresse.

Nicht gesendet werden Foto, Manifest, Standort, Sensorwerte und Gerätedaten.

**Empfänger:**

- [OPTION A] Den Doichain-Dienst (`doi-api.sendlabs.de`) betreiben wir selbst [oder: betreibt [BETREIBER DES DIENSTES] in unserem Auftrag nach Art. 28 DSGVO].
- [OPTION B] Den Doichain-Dienst (`doi-api.sendlabs.de`) betreibt [BETREIBER DES DIENSTES], [ANSCHRIFT DES BETREIBERS], in eigener Verantwortung. Seine Datenschutzerklärung: [URL DATENSCHUTZ DES BETREIBERS].
- Die Öffentlichkeit: Der Dienst schreibt Paket-Hash, Notiz und den Zeitpunkt der Einreichung in eine Transaktion auf der Doichain. Diese Transaktion signiert und bezahlt der Dienst aus seiner eigenen Wallet; dein Name oder ein Konto von dir steht nicht darin. Jeder kann den Eintrag lesen, und jeder Rechner, der die Blockchain betreibt, speichert eine Kopie.

**Personenbezug:** Aus dem Hash lassen sich weder Foto noch Standort zurückrechnen. Weil er vom Foto abhängt, lässt er sich auch nicht erraten. Einem Inhalt zuordnen kann ihn nur, wer das Beweispaket besitzt: du und alle, denen du es gibst. Für sie ist der Eintrag mit dir verknüpft. Die Notiz verrät zudem, wann laut deinem Gerät fotografiert wurde. Wir behandeln Hash und Notiz deshalb als personenbezogene Daten.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO. Die öffentliche Verankerung ist die Kernfunktion, die du mit der App auslöst; ohne sie entsteht kein Nachweis. Die IP-Adresse verarbeitet der Dienst zusätzlich nach Art. 6 Abs. 1 lit. f DSGVO, um das kostenlose Kontingent gerecht zu verteilen und Missbrauch abzuwehren.

**Speicherdauer:** Der Eintrag auf der Blockchain bleibt **dauerhaft** erhalten. Sein Name läuft zwar nach etwa acht Monaten (36 000 Blöcken) ab, die Transaktion bleibt aber in der Historie der Blockchain lesbar. Beim Dienst: [SPEICHERDAUER BEIM DIENST].

**Grenzen deiner Rechte:** Einen Eintrag auf der Blockchain kann niemand ändern oder entfernen, weder wir noch der Betreiber des Dienstes. Berichtigung (Art. 16 DSGVO) und Löschung (Art. 17 DSGVO) sind für ihn technisch nicht möglich. Entscheide deshalb vor dem Senden. Das automatische Senden schaltest du im Abschnitt „Einreichung“ mit „Nach Aufnahme sofort senden“ aus. Die App speichert diese Wahl; sie gilt auch nach einem Neustart. Löschst du das Beweispaket und alle Kopien, kann niemand mehr den Hash einem Inhalt zuordnen; die Notiz mit der Zeitangabe bleibt lesbar. Deine Rechte gegenüber dem Dienst, etwa zu gespeicherten IP-Adressen, bleiben unberührt.

**Drittland:** Der Dienst läuft in [SERVERSTANDORT DES DIENSTES]. Die Blockchain speichern Rechner in aller Welt, auch in Staaten ohne angemessenes Datenschutzniveau. Dort gelten möglicherweise geringere Schutzstandards, und Behörden können auf die Daten zugreifen. Die weltweite Veröffentlichung ist für die von dir gewünschte Verankerung erforderlich (Art. 49 Abs. 1 lit. b DSGVO).

#### 4.2 Online-Prüfung und Vorab-Blöcke

**Wann und was:**

- **Vorab-Blöcke:** Ist „BTC- und Doichain-Block vor Kameraaufnahme“ eingeschaltet (Voreinstellung), ruft die App vor dem Öffnen der Kamera den neuesten Doichain-Block beim Doichain-Dienst und den neuesten Bitcoin-Block bei Blockstream (`blockstream.info`) ab. Außer der Anfrage selbst sendet die App dabei nichts. Zurück kommen öffentliche Block-Hashes, die ins Manifest aufgenommen werden.
- **Online-Abgleich:** Ist „Kettenstatus online abgleichen“ eingeschaltet (Voreinstellung im Tab „Prüfen“ und beim PDF-Bericht im Tab „Aufnehmen“), fragt die App Paket-Hash, Transaktions-ID und Block-Hashes beim Doichain-Dienst ab, den Hash des Bitcoin-Vorab-Blocks bei Blockstream. Das gilt auch für fremde Beweispakete, die du prüfst.

In beiden Fällen sehen die Dienste deine IP-Adresse. Foto, Manifest und GPS-Koordinaten sendet die App dabei nicht.

**Empfänger:** der Doichain-Dienst wie in 4.1 und Blockstream Corporation Inc., [SITZ VON BLOCKSTREAM], in eigener Verantwortung. Datenschutzerklärung: <https://blockstream.com/privacy>.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO. Beide Funktionen kannst du ausschalten.

**Speicherdauer:** Die abgerufenen Block-Hashes bleiben im Manifest auf deinem Gerät (4.6). Bei den Diensten richtet sie sich nach deren Angaben.

**Drittland:** [VARIANTE KANADA: Für Kanada besteht ein Angemessenheitsbeschluss der EU-Kommission (Art. 45 DSGVO).] [VARIANTE USA: Blockstream sitzt in den USA. Ein Angemessenheitsbeschluss für Blockstream ist uns nicht bekannt. Die Abfrage ist für die von dir eingeschaltete Funktion erforderlich (Art. 49 Abs. 1 lit. b DSGVO).]

#### 4.3 Kartenausschnitt im PDF-Bericht

**Wann:** Nur wenn du einen PDF-Prüfbericht erstellst und dabei „Standort im Bericht“ und „Kartenausschnitt (OpenStreetMap)“ eingeschaltet sind. Im Tab „Aufnehmen“ ist „Standort im Bericht“ voreingestellt aus. Im Tab „Prüfen“ sind beide Schalter voreingestellt an; du kannst sie vor dem Erstellen ausschalten.

**Daten:** Die App lädt 6 bis 12 Kartenkacheln der Zoomstufe 14 von `tile.openstreetmap.org`. Aus den angefragten Kacheln ergibt sich die Umgebung des Standorts auf etwa 1 km genau. In den Angaben zur Datensicherheit bei Google Play gilt das als „genauer Standort“, weil die Fläche kleiner als 3 km² ist. Dazu kommen deine IP-Adresse und die Kennung „DoiProof/Version (Android)“ mit einem Link zum Projekt. Die genauen Koordinaten sendet die App nicht. Bei einem fremden Beweispaket betrifft das den Standort aus diesem Paket.

**Empfänger:** OpenStreetMap Foundation, St John's Innovation Centre, Cowley Road, Cambridge, CB4 0WS, Vereinigtes Königreich, in eigener Verantwortung. Datenschutzerklärung: <https://osmfoundation.org/wiki/Privacy_Policy>.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO, weil du den Kartenausschnitt für deinen Bericht anforderst. Enthält ein fremdes Paket den Standort einer anderen Person, gilt Art. 6 Abs. 1 lit. f DSGVO. Das Interesse ist ein verständlicher Prüfbericht; übertragen wird nur die Umgebung (etwa 1 km), nicht die genauen Koordinaten.

**Speicherdauer:** Die Kacheln liegen bis zu 7 Tage im Zwischenspeicher der App, dann löscht die App sie. Ihre Dateinamen verraten die Umgebung; lesen kann sie nur die App. Bei der OpenStreetMap Foundation richtet sich die Speicherdauer nach deren Angaben.

**Drittland:** Die OpenStreetMap Foundation liefert die Kacheln über das Content-Delivery-Netz der Fastly, Inc., USA, aus. Deine Anfrage (IP-Adresse und angefragte Kachel) kann dabei auf Servern von Fastly auch außerhalb der EU verarbeitet werden, insbesondere in den USA. Für das Vereinigte Königreich, den Sitz der OpenStreetMap Foundation, besteht ein Angemessenheitsbeschluss der EU-Kommission (Art. 45 DSGVO), derzeit bis 27. Dezember 2031. [VARIANTE DPF: Fastly, Inc. ist nach dem EU-US Data Privacy Framework zertifiziert. Für die USA stützt sich die Übermittlung auf den Angemessenheitsbeschluss der EU-Kommission vom 10. Juli 2023 (Art. 45 DSGVO).] [VARIANTE OHNE DPF: Die Abfrage ist für den von dir angeforderten Kartenausschnitt erforderlich (Art. 49 Abs. 1 lit. b DSGVO).]

#### 4.4 App-Updates über Expo

**Wann:** Bei jedem Start der App und wenn du unter „Über diese App“ auf „Nach Update suchen“ tippst. So erhältst du Fehlerbehebungen, ohne die App über Google Play neu zu laden.

**Daten:**

- eine zufällige Installationskennung. Die App erzeugt sie beim ersten Start und speichert sie auf dem Gerät. Sie stammt nicht aus Hardware- oder Kontodaten und ändert sich, wenn du die App neu installierst oder ihre Daten löschst. [NUR BEI OPTION A IN 4.6: Stellt Android die App-Daten aus deiner Google-Sicherung wieder her, kann die bisherige Kennung erhalten bleiben.]
- Plattform (Android), Laufzeitversion, Update-Kanal und die Kennungen des installierten, des eingebauten und fehlgeschlagener Updates
- deine IP-Adresse
- nur wenn bei einem früheren Start das Update-System der App nicht geladen werden konnte und die App deshalb mit der eingebauten Version gestartet ist: eine technische Fehlermeldung von höchstens 1024 Zeichen

Anhand der Installationskennung zählt Expo außerdem, wie viele Installationen die Update-Funktion nutzen (Statistik und Abrechnung im Expo-Konto).

**Empfänger:** 650 Industries, Inc. („Expo“), USA. [VARIANTE AVV: als unser Auftragsverarbeiter nach Art. 28 DSGVO auf Grundlage eines Vertrags zur Auftragsverarbeitung.] [VARIANTE OHNE AVV: in eigener Verantwortung; Datenschutzerklärung: <https://expo.dev/privacy>.]

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO. Unser Interesse: Fehler und Sicherheitslücken schnell beheben sowie fehlerhafte Updates erkennen und zurücknehmen. Speichern und Auslesen der Installationskennung auf dem Gerät: § 25 Abs. 2 Nr. 2 TDDDG.

**Speicherdauer:** Die Kennung bleibt auf dem Gerät, bis du die App deinstallierst oder ihre Daten löschst. Bei Expo richtet sie sich nach [VARIANTE AVV: dem Auftragsverarbeitungsvertrag und] der Datenschutzerklärung von Expo (<https://expo.dev/privacy>).

**Drittland:** USA. [VARIANTE DPF: 650 Industries, Inc. ist nach dem EU-US Data Privacy Framework zertifiziert. Die Übermittlung stützt sich auf den Angemessenheitsbeschluss der EU-Kommission vom 10. Juli 2023 (Art. 45 DSGVO).] [VARIANTE OHNE DPF: Die Übermittlung stützt sich auf Standardvertragsklauseln der EU-Kommission (Art. 46 Abs. 2 lit. c DSGVO).]

Die Update-Prüfung lässt sich in der App nicht abschalten; ohne Internetverbindung findet sie nicht statt. Zum Widerspruch siehe Abschnitt 6.

#### 4.5 Bezug über Google Play

Download, Installation und Updates der App laufen über Google Play. Dafür verarbeitet Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland, in eigener Verantwortung Daten wie dein Google-Konto und Angaben zu deinem Gerät. Einzelheiten: <https://policies.google.com/privacy>. Darauf haben wir keinen Einfluss. Google verarbeitet Daten auch in den USA; Google LLC ist nach dem EU-US Data Privacy Framework zertifiziert.

Über die Play Console erhalten wir von Google zusammengefasste Statistiken, etwa Installationen nach Land, Gerät und Android-Version. Dazu kommen Absturzberichte mit Gerätemodell, Android-Version und technischem Fehlerprotokoll von Nutzern, die Google das Teilen von Nutzungs- und Diagnosedaten erlaubt haben. Daraus können wir keine Personen erkennen. Bewertungen, die du im Store veröffentlichst, sehen wir mit dem dort angezeigten Namen.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO. Unser Interesse: die App verbessern und auf Bewertungen antworten.

#### 4.6 Speicherung auf deinem Gerät

Die App speichert in ihrem privaten Speicherbereich, auf den andere Apps nicht zugreifen können:

- die Originalfotos deiner Nachweise, unverändert und damit auch mit allen Metadaten, die die Kamera-App eingebettet hat
- das Manifest jedes Nachweises: Gerätezeit, App-Version, Vorab-Blöcke und je nach Profil den genauen Standort (Koordinaten, Höhe, Genauigkeit, Richtung, Geschwindigkeit, Hinweis auf einen simulierten Standort), Sensorwerte, Bildformat, Bildgröße und Dateiname, Gerätemodell sowie Android-Version
- den Nachweisverlauf mit Hashes und dem Stand der Verankerung
- die erstellten PDF-Berichte
- vorübergehend im Zwischenspeicher: ZIP-Dateien zum Teilen, importierte ZIP-Pakete und Kartenkacheln (4.3)
- die Installationskennung (4.4)
- deine Wahl bei „Nach Aufnahme sofort senden“ (4.1)

Wir erhalten keine dieser Daten.

Voreingestellt ist das Profil „Privat“: Das Manifest enthält dann keinen Standort, keine Sensorwerte und keine Bild- und Gerätedaten. Das Profil steuert nur, was im Manifest steht; das Originalfoto bleibt unverändert. Hat deine Kamera-App Ortsangaben in die Bilddatei geschrieben (EXIF-GPS, etwa bei eingeschalteter Ortsmarkierung), sind diese auch im Profil „Privat“ im Originalfoto und damit im Beweispaket (ZIP) enthalten. Das kann auch Fotos betreffen, die du mit „Foto wählen“ auswählst. Soll das Original keinen Ort enthalten, schalte die Ortsmarkierung in deiner Kamera-App aus. Im Foto des PDF-Berichts entfernt die App diese Angaben (4.8).

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO und § 25 Abs. 2 Nr. 2 TDDDG.

**Speicherdauer:** bis du die App deinstallierst oder in den Android-Einstellungen ihre Daten löschst. Einzelne Nachweise lassen sich in der App derzeit nicht löschen. Den Zwischenspeicher leert Android bei Platzbedarf; Kartenkacheln löscht die App nach 7 Tagen. **Beim Deinstallieren gehen alle Nachweise verloren.** Sichere wichtige Nachweise vorher mit „Beweispaket ZIP“.

**Android-Sicherung:**

[OPTION A – Sicherung erlaubt] Hast du auf deinem Gerät die Google-Sicherung eingeschaltet, kann Android die App-Daten automatisch in deinem Google-Konto sichern: Fotos, Manifeste, Verlauf, Berichte, deine Sende-Einstellung und die Installationskennung. Google speichert die Sicherung in einem privaten Bereich deines Google Drive, ab Android 9 mit eingerichteter Displaysperre Ende-zu-Ende-verschlüsselt. Das geschieht im Rahmen deiner Vereinbarung mit Google; wir haben darauf keinen Zugriff. Android sichert je App höchstens 25 MB. Sind die App-Daten größer, was schon bei wenigen Fotos der Fall ist, sichert Android die App gar nicht. Die Sicherung ersetzt deshalb den ZIP-Export nicht. Ausschalten kannst du sie in den Android-Einstellungen unter „System“ → „Sicherung“; die Bezeichnung unterscheidet sich je nach Hersteller.

[OPTION B – Sicherung ausgeschlossen] Die App ist von der automatischen Android-Sicherung in deinem Google-Konto ausgenommen. Beim direkten Umzug auf ein neues Gerät per Kabel oder WLAN können manche Geräte die App-Daten trotzdem übertragen.

#### 4.7 Berechtigungen

| Berechtigung | Wofür | Wann |
|---|---|---|
| Kamera | Foto für einen Nachweis aufnehmen | Abfrage beim Tippen auf „Foto aufnehmen“ |
| Standort (genau und ungefähr) | Standort und Kompassrichtung ins Manifest aufnehmen | Abfrage nur im Profil „Standort & Sensoren“ oder im Profil „Individuell“ mit eingeschaltetem „GPS, Höhe und Genauigkeit“; nur während du die App benutzt, nie im Hintergrund |
| Speicher (nur Android 7 bis 9) | Android verlangt sie dort für die Kamerafunktion. Die App legt keine Dateien in öffentlichen Ordnern ab. | Abfrage zusammen mit der Kamera |
| Internet, Netzwerkstatus | Verbindungen aus Abschnitt 4 | ohne Abfrage |
| Vibration | von einem Baustein der App angemeldet; DoiProof nutzt sie nicht | ohne Abfrage |

- **Bewegungs- und Umgebungssensoren** (Beschleunigung, Drehrate, Magnetfeld, Luftdruck, Licht) brauchen unter Android keine Berechtigung. Die App liest sie nur während einer Kameraaufnahme mit eingeschalteten Sensoren, etwa fünfmal pro Sekunde.
- **Standortbestimmung:** Sie läuft über die Standortdienste der Google-Play-Dienste. Ob dabei Daten an Google gehen, hängt von deinen Geräteeinstellungen ab, etwa von „Google-Standortgenauigkeit“.
- **„Foto wählen“** nutzt die Fotoauswahl von Android. Die App erhält nur das gewählte Foto und braucht keinen Zugriff auf deine Mediathek. Ebenso erhält der Tab „Prüfen“ nur die ZIP-Datei, die du auswählst.
- **Verweigerte Freigaben:** Ohne Standortfreigabe vermerkt die App das im Manifest und nimmt trotzdem auf. Ohne Kamerafreigabe bleibt „Foto wählen“. Freigaben änderst du jederzeit unter Einstellungen → Apps → DoiProof → Berechtigungen.

#### 4.8 Teilen von Beweispaket und Prüfbericht

Teilst du ein Beweispaket (ZIP) oder einen Prüfbericht (PDF), öffnet die App den Teilen-Dialog von Android. Den Empfänger wählst du selbst, ob App, Dienst oder Person; er verarbeitet die Daten in eigener Verantwortung. Wir erhalten nichts.

- Das ZIP enthält immer das Originalfoto und das vollständige Manifest, also alle erfassten Angaben einschließlich der genauen GPS-Koordinaten, sowie gegebenenfalls Ortsangaben der Kamera in der Bilddatei (4.6).
- Im PDF-Bericht kannst du Foto, Standort und Karte ausblenden. Hashes, Prüfergebnis und die übrigen Angaben aus dem Manifest, etwa Sensorwerte und Gerätedaten, stehen immer darin.
- Ins PDF übernimmt die App das Foto ohne Metadaten wie EXIF, XMP und IPTC, also auch ohne Ortsangaben der Kamera. Der Anhang des Berichts nennt, auch bei ausgeblendetem Foto, Kameraangaben wie Hersteller, Modell und Aufnahmezeit laut Bilddatei, soweit vorhanden. Ob das Original Ortsangaben enthält, vermerkt er nur mit „vorhanden“ oder „keine“.
- Der Bericht enthält einen QR-Code mit einem Link zu verifile.it und dem Paket-Hash. Wer ihn öffnet, ruft diese Website auf.

Teile beides nur mit Empfängern, denen du vertraust. Rechtsgrundlage für das Erstellen der Dateien: Art. 6 Abs. 1 lit. b DSGVO.

#### 4.9 Kontakt

Schreibst du uns eine E-Mail, verarbeiten wir deine Adresse und deine Nachricht, um zu antworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bei Fragen zur App, sonst Art. 6 Abs. 1 lit. f DSGVO. Wir löschen die Nachricht, sobald die Anfrage erledigt ist und keine gesetzliche Aufbewahrungspflicht besteht.

### 5. Was wir nicht tun

DoiProof nutzt keine Werbung, keine Werbe-ID und keine Dienste zur Nutzungsanalyse oder zum Tracking. Wir verkaufen keine Daten, bilden keine Profile und treffen keine automatisierten Entscheidungen im Sinne von Art. 22 DSGVO.

### 6. Deine Rechte

Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20).

**Widerspruchsrecht (Art. 21 DSGVO):** Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Abschnitte 4.1 zur IP-Adresse, 4.3 bei fremden Beweispaketen, 4.4, 4.5 und 4.9) kannst du aus Gründen, die sich aus deiner besonderen Situation ergeben, jederzeit widersprechen. Schreib dazu an [E-MAIL].

Die App holt keine Einwilligung ein; einen Widerruf braucht es daher nicht. Freigaben wie Kamera und Standort kannst du jederzeit in den Android-Einstellungen zurücknehmen. Das wirkt für die Zukunft.

Weil die App ohne Konto arbeitet, kennen wir dich in der Regel nicht und können dir keine Daten zuordnen (Art. 11 DSGVO). Die Daten auf deinem Gerät verwaltest du selbst. Nenne uns für eine Anfrage nach Möglichkeit den Paket-Hash. Zu den Grenzen bei Einträgen auf der Blockchain siehe 4.1. Anfragen richtest du an [E-MAIL].

Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), insbesondere an deinem Wohnort. Für uns zuständig ist: [ZUSTÄNDIGE AUFSICHTSBEHÖRDE].

### 7. Kinder

DoiProof richtet sich an Erwachsene und nicht an Kinder. Weil die App ohne Konto auskommt, kennen wir das Alter der Nutzer nicht. Erfahren wir, dass uns ein Kind Daten geschickt hat, etwa per E-Mail, löschen wir sie. Einträge auf der Blockchain lassen sich auch dann nicht löschen (siehe 4.1).

### 8. Änderungen

Wir passen diese Erklärung an, wenn sich die App oder die Rechtslage ändert. Neue Datenflüsse kommen erst in die App, wenn diese Erklärung sie beschreibt. Die aktuelle Fassung steht unter [URL-DATENSCHUTZ]; maßgeblich ist das Datum oben.

---

**Ende des Textes für die Website**

---

## Anhang: Belege für den Entwickler (nicht veröffentlichen)

Jede Aussage zu Datenflüssen ist im Code des Stands `76d2a20` geprüft. Pfade unter `node_modules/` beziehen sich auf die installierten Pakete (Expo SDK 57). Zeilennummern können sich mit späteren Änderungen verschieben. Ändert sich eine der Stellen, Erklärung, Formular „Datensicherheit“ und Store-Texte gemeinsam anpassen.

### Belege im Code

| Aussage | Beleg |
|---|---|
| Adresse des Doichain-Dienstes; alle Aufrufe als HTTPS-POST, optionaler Schlüssel im Header `X-API-Key` | `core/mcp.mjs:6`, `core/mcp.mjs:42-53` (Header `:50`) |
| Verankerung sendet nur Hash und Notiz (gekürzt auf 160 Zeichen) | `src/doichain.ts:76-81` |
| Notiz „DoiProof v3; Gerät: <Zeit>“ bzw. „DoiProof evidence v3“ | `src/screens/CaptureScreen.tsx:140-141` |
| Aufnahmezeit = Gerätezeit nach Rückkehr aus der Kamera, ISO-Format UTC mit Millisekunden; bei ausgewählten Fotos keine | `src/screens/CaptureScreen.tsx:191`, `:201` |
| Automatisches Senden voreingestellt an, abschaltbar; die Wahl bleibt gespeichert (`doiproof-settings.json` im privaten Dokumentordner) | `src/screens/CaptureScreen.tsx:51`, `:121-129`, `:230`, `:365`; `src/settings.ts:4-13`; `src/appSettings.ts:7`, `:10-17` |
| Tageskontingent beim Öffnen und auf Knopfdruck | `src/screens/CaptureScreen.tsx:111`, `:131-134`, `:361`; `src/doichain.ts:41-43` |
| Statusabfragen offener Einreichungen jede Minute und bei Rückkehr in die App | `src/screens/CaptureScreen.tsx:74-91`, `:114-117`; `src/doichain.ts:54-74` |
| API-Schlüssel nur im Arbeitsspeicher; Kontingent je IP und Tag | `src/screens/CaptureScreen.tsx:50`, `:363-364` |
| Paket-Hash aus Foto-Hash und Manifest-Hash | `core/manifest.mjs:4`, `:22-25`, `:32-38` |
| Auf der Kette stehen Hash, Zeitpunkt der Einreichung (vom Dienst gesetzt) und Notiz; Eigentümer ist die Wallet des Dienstes; Name läuft nach 36 000 Blöcken ab, Historie bleibt | Abfrage `search_names` mit Präfix `poe/` beim Doichain-MCP-Dienst am 10.10.2026: Wertformat `{"v","alg","hash","ts","note"}`, `owner_address` des Dienstes, `expires_in_blocks` ≈ 35 000–36 000 bei rund 235–240 Tagen Restlaufzeit; Dienstanweisung des Doichain-MCP („The operator of this server pays for the anchored names and holds them in its wallet“, „Note and file name of a proof are public forever“, „The timestamp of an anchoring stays in the chain history permanently“) |
| Vorab-Blöcke vor der Kamera, voreingestellt an | `src/screens/CaptureScreen.tsx:52`, `:173-181`, `:328`; `src/chainAnchors.ts:20-27` (Doichain), `:29-50` (Blockstream), `:52-55` |
| Blockstream-Adresse | `src/chainAnchors.ts:4`, `core/verify.mjs:16` |
| Online-Abgleich: Hash, Transaktion und Block beim Dienst, BTC-Vorabblock bei Blockstream | `core/verify.mjs:289`, `:300`, `:305`, `:328`, `:342` |
| Online-Abgleich voreingestellt an (Prüfer und PDF aus dem Verlauf) | `src/screens/VerifyScreen.tsx:13`, `:72-73`; `src/screens/CaptureScreen.tsx:63`, `:269-271`, `:385` |
| Kacheln nur bei „Standort im Bericht“ und „Kartenausschnitt“ | `src/verifier.ts:48-59`; `src/screens/CaptureScreen.tsx:272-273`, `:387-389`; `src/screens/VerifyScreen.tsx:46-50`, `:84-86` |
| Voreinstellung: beim Aufnehmen Standort im Bericht aus, Karte an; im Prüfer beides an | `src/screens/CaptureScreen.tsx:61-62`; `src/screens/VerifyScreen.tsx:18-19` |
| Kachelserver, Zoomstufe 14, Ausschnitt 662 × 340 px (6, 8, 9 oder 12 Kacheln), Kennung mit Projektlink | `core/map.mjs:10`, `:13`, `:23`, `:64-81`, `:84-86`, `:94-96`, `:131-133`; `src/platform.ts:72-77` |
| „etwa 1 km“: verratene Fläche 0,30–1,04 km², unter Googles Grenze von 3 km² | Nachrechnung mit `mapView()` während der Play-Recherche (Berlin 0,30–0,87 km², München bis 1,04 km²); <https://developer.android.com/guide/topics/data/collect-share> |
| Kachel-Cache im App-Cache, 7 Tage, abgelaufene Dateien gelöscht | `core/map.mjs:15`; `src/platform.ts:45-69` |
| Update-Prüfung bei jedem Start (`ON_LOAD` → `ALWAYS`) und auf Knopfdruck; Update-Server | `app.json:11-15`; `node_modules/@expo/config-plugins/build/utils/Updates.js:198-199`; `src/components/AboutCard.tsx:13-19`, `:40` |
| Gesendete Header: `EAS-Client-ID`, Plattform, Laufzeitversion, Kennungen des laufenden, eingebauten und fehlgeschlagener Updates, `Expo-Fatal-Error` (≤ 1024 Zeichen) | `node_modules/expo-updates/android/src/main/java/expo/modules/updates/loader/FileDownloader.kt:938-981` (`:952`, `:954-957`, `:960-969`), `:998-1012`; Asset-Downloads `:832-836` |
| `Expo-Fatal-Error` nur, wenn das Update-System beim Start nicht geladen werden konnte (Notstart mit der eingebauten Version); die Meldung wird bis zur nächsten Anfrage im App-Speicher abgelegt | `node_modules/expo-updates/android/src/main/java/expo/modules/updates/procedures/StartupProcedure.kt:81-86`; `DisabledUpdatesController.kt:116`; `launcher/NoDatabaseLauncher.kt:32-40`, `:65`; ausgelesen und gelöscht in `FileDownloader.kt:960` |
| Kanal `production` | `eas.json:15`; EAS Build legt ihn als `updates.requestHeaders["expo-channel-name"]` ab (`node_modules/@expo/config-plugins/build/android/Updates.js:151-153`), gesendet in `FileDownloader.kt:971-975`; eas-cli 24.12.1 liest denselben Schlüssel in `build/update/android/UpdatesModule.js:41` |
| Installationskennung: zufällige UUID, gespeichert in den SharedPreferences | `node_modules/expo-eas-client/android/src/main/java/expo/modules/easclient/EASClientID.kt:26-37` |
| Kennung nicht aus Hardware abgeleitet; neu bei Neuinstallation und Datenlöschung; eine Wiederherstellung aus der Sicherung kann sie übernehmen | Expo-Doku `docs/pages/eas/observe/reference/client-id.mdx` (expo/expo, Stand 05.10.2026) |
| Keine weiteren Netzwerkziele; kein Analyse-, Werbe- oder Tracking-SDK | Suche nach `fetch(` und `https://` in `src/`, `core/`: nur die oben genannten Ziele; `package.json` (Abschnitt `dependencies`) |
| verifile.it nur als QR-Code im Bericht, kein Aufruf durch die App | `core/report-model.mjs:15`, `:391` |
| Fotos im privaten Dokumentordner, Verlauf als JSON, Berichte unter `reports/` | `src/bundle.ts:6`, `:13-18`; `src/history.ts:6-7`; `src/verifier.ts:62-66` |
| ZIP zum Teilen und importierte ZIPs im Cache | `src/bundle.ts:48-55`; `src/verifier.ts:14-18` |
| Kein Löschen einzelner Nachweise in der App | Suche nach `delete`/`remove` in `src/`: nur Cache-Aufräumen (`src/platform.ts:54-64`, `src/bundle.ts:51`) |
| Original unverändert, also auch mit EXIF-GPS der Kamera; beim Aufnehmen fordert die App kein EXIF an | `src/bundle.ts:16`; `src/screens/CaptureScreen.tsx:183` (`exif: false`) |
| Hinweis beim Profil „Privat“: Ortsangaben der Kamera bleiben im Original (ZIP), im PDF entfernt | `src/screens/CaptureScreen.tsx:319-321` |
| Foto im PDF ohne EXIF/XMP, IPTC, Kommentare und übrige APPn-Segmente (JFIF, ICC-Profil, Adobe bleiben); bei unbekannter JPEG-Struktur kein Foto; PNG wird von pdf-lib neu kodiert | `core/report-pdf.mjs:816-828`; `core/image.mjs:141-175`; Tests in `core/photo-privacy.test.mjs` |
| PDF-Anhang: EXIF-Kameraangaben (Hersteller, Modell, Aufnahmezeit u. a.), EXIF-GPS nur als „vorhanden“/„keine“; übrige Manifestangaben immer, Koordinaten bei ausgeblendetem Standort als „ausgeblendet“ | `core/image.mjs:85`; `core/report-model.mjs:485`, `:572-611`, `:615`, `:644`, `:674` |
| Manifestinhalt je Profil; Standortfelder; Gerätedaten | `src/evidenceManifest.ts:29-35`, `:67-78`; `src/evidence.ts:22-45`, `:68-89` |
| Profil „Privat“ voreingestellt | `src/screens/CaptureScreen.tsx:59` |
| Kamerafreigabe erst beim Tippen auf „Foto aufnehmen“; ohne Freigabe Abbruch | `src/screens/CaptureScreen.tsx:164-166` |
| Standortfreigabe nur bei eingeschaltetem Standort, nur Vordergrund; Verweigerung im Manifest vermerkt | `src/evidence.ts:51-59`, `:68-70`; `app.json:47` (Hintergrundstandort gesperrt) |
| Standort über Fused Location Provider der Google-Play-Dienste | `node_modules/expo-location/android/build.gradle:19`; `node_modules/expo-location/android/src/main/java/expo/modules/location/LocationModule.kt:81`, `:133` |
| Kompass braucht die Standortfreigabe | `src/sensors.ts:18`; `LocationModule.kt:591-597` |
| Sensoren ohne Berechtigung unter Android, nur bei Kameraaufnahme, alle 200 ms | `node_modules/expo-sensors/build/DeviceSensor.js:75-100`; Berechtigungsfunktionen nur in `PedometerModule.kt` und `DeviceMotionModule.kt` (nicht genutzt); `src/sensors.ts:1`, `:8-14`; `src/evidence.ts:57`; `core/sensors.mjs:74` |
| Kamera schreibt in den App-Cache; Speicherberechtigung nur vor Android 10 (API < 29) verlangt | `node_modules/expo-image-picker/android/src/main/java/expo/modules/imagepicker/ImagePickerModule.kt:73`, `:275-302`; `plugins/with-android-play.js:4-5`, `:12`, `:21-22` |
| „Foto wählen“ ohne Berechtigung | `ImagePickerModule.kt:85-88`; `app.json:51-53` (Medienberechtigungen gesperrt) |
| Gesperrte Berechtigungen, darunter Werbe-ID und Bewegungserkennung | `app.json:40-55` |
| Vibration aus der Expo-Vorlage, im Code nicht genutzt | Suche nach `Vibration` in `src/`: kein Treffer |
| `allowBackup` ist ohne Angabe `true` | `node_modules/@expo/config-plugins/build/android/AllowBackup.js:23-27` |

### Externe Quellen (Recherche 10.10.2026)

Nicht erreichbar waren aus der Arbeitsumgebung expo.dev, dataprivacyframework.gov, privacyshield.gov, blockstream.com und osmfoundation.org. Aussagen dazu stammen aus Suchmaschinen-Zusammenfassungen und sind oben als zu prüfen markiert.

- **Android-Sicherung:** <https://developer.android.com/identity/data/autobackup> (gelesen): privater Bereich im Google Drive, 25 MB je App, ohne Sicherung bei Überschreitung, Ende-zu-Ende-Verschlüsselung ab Android 9 mit Displaysperre, Cache ausgenommen, Gerät-zu-Gerät-Übertragung teils trotz `allowBackup="false"`.
- **Expo und DPF:** Expo-Doku `docs/pages/regulatory-compliance/data-and-privacy-protection.mdx` („GDPR-, CCPA-, and Data Privacy Framework-compliant“); Expo-Changelog vom 17.12.2024 „DPF replaces Privacy Shield“ (laut Suche); DPF-Eintrag 650 Industries, Inc. „Active“ (laut Suche, nicht selbst eingesehen).
- **Expo zählt Installationen:** Antwort von Expo im Expo-Forum (forums.expo.dev/t/eas-update-and-data-policy/70300, nur über Suche gelesen): Expo zählt anhand der Installationskennung die monatlich aktiven Installationen der Update-Funktion.
- **DPF-Angemessenheitsbeschluss** vom 10.07.2023: Klage Latombe vom EuG am 03.09.2025 abgewiesen (T-553/23), Rechtsmittel beim EuGH anhängig (C-703/25 P). Der Beschluss gilt bis zu einer Entscheidung weiter. Vor Veröffentlichung den Stand prüfen.
- **Vereinigtes Königreich:** Angemessenheitsbeschluss am 19.12.2025 verlängert bis 27.12.2031 (laut mehreren Fachquellen).
- **OpenStreetMap Foundation:** Sitz laut Companies House (Nr. 05912761) und OSMF.
- **Kachelauslieferung über Fastly:** OSMF-Betriebsbericht vom 24.07.2022 (operations.osmfoundation.org, „Post-Mortem - Standard Tile Layer Incident - 18 July 2022“, im Quelltext der Website gelesen): Standard-Kachelebene über das CDN der Fastly, Inc.; Render-Server in Europa, Australien und den USA; Fastly verteilt nach geografischer Lage. Live-Prüfung von `tile.openstreetmap.org` war aus der Arbeitsumgebung gesperrt. DPF-Eintrag von Fastly nicht eingesehen (Entscheidung 5).
- **Blockstream:** Sitz in öffentlichen Quellen uneinheitlich (Menlo Park, Kalifornien; Montréal, Kanada); Kontakt laut Datenschutzerklärung privacy@blockstream.com.
- **Google Play:** Datenschutzerklärung <https://policies.google.com/privacy>; Anforderungen an die Datenschutzerklärung: <https://support.google.com/googleplay/android-developer/answer/10144311>.

### Zur rechtlichen Prüfung

Diese Punkte sollte die prüfende Person besonders ansehen:

1. **Lit. b statt Einwilligung bei der Verankerung.** Eine Einwilligung wäre jederzeit widerruflich, die Veröffentlichung auf der Blockchain aber nicht umkehrbar. Voreingestellte Schalter sind ohnehin keine wirksame Einwilligung (EuGH, Planet49, C-673/17). Die Vorlage stützt die Verankerung deshalb auf den Nutzungsvertrag. Zu prüfen ist, ob das bei voreingestelltem automatischem Senden trägt oder ob vor dem ersten Senden ein deutlicher Hinweis in der App nötig ist.
2. **Blockchain und DSGVO.** Der Europäische Datenschutzausschuss hat Leitlinien 02/2025 zur Verarbeitung personenbezogener Daten mit Blockchain-Technologien veröffentlicht (Entwurf April 2025, laut einem Fachbericht im Juli 2026 endgültig angenommen; Fassung auf edpb.europa.eu prüfen). Sie empfehlen, personenbezogene Daten außerhalb der Kette zu halten und nur Werte zu verankern, die nach Löschung der Daten außerhalb der Kette nicht mehr zuzuordnen sind. DoiProof erfüllt das für den Hash weitgehend: Er hängt vom Foto ab und ist ohne das Paket nicht zuzuordnen. Die Notiz mit der millisekundengenauen Aufnahmezeit bleibt dagegen lesbar. Zu prüfen ist, ob die Notiz nötig ist oder gröber werden sollte.
3. **Art. 49 Abs. 1 lit. b DSGVO** für die weltweite Speicherung der Blockchain und gegebenenfalls für Blockstream und Fastly (bei Fastly auch für Kartenkacheln zum Standort eines Dritten, Punkt 6). Ob die Veröffentlichung auf einer öffentlichen Blockchain überhaupt eine Übermittlung nach Kapitel V ist, ist umstritten.
4. **§ 25 Abs. 2 Nr. 2 TDDDG für die Installationskennung.** Zu prüfen ist, ob das Auslesen der Kennung für die Update-Auslieferung unbedingt erforderlich ist oder ob es eine Einwilligung braucht. Laut einer Antwort von Expo im Expo-Forum (forums.expo.dev/t/eas-update-and-data-policy/70300, nur über Suche gelesen) zählt Expo damit auch die monatlich aktiven Installationen.
5. **Rolle von Expo.** Auftragsverarbeiter oder eigener Verantwortlicher; dazu den Vertrag mit Expo prüfen. Auch mit Vertrag ist zu klären, ob die Zählung der Installationen für Statistik und Abrechnung bei Expo noch Auftragsverarbeitung ist.
6. **Fremde Standorte im Prüfer.** Kartenkacheln zum Standort eines Dritten bei voreingestelltem Kartenschalter, gestützt auf lit. f.
7. **Händlerstatus und Impressumspflicht** (§ 5 DDG) klären; das betrifft auch, welche Anschrift hier als Verantwortlicher steht.
