# Veröffentlichung im App Store (iOS)

**Stand:** DoiProof 1.0.0, 5. November 2026. Diese Seite führt von der fertigen App bis zur Veröffentlichung im App Store. Der Build und die Verteilung an Tester stehen in [IOS-RELEASE.md](IOS-RELEASE.md) und werden hier nicht wiederholt; diese Seite beginnt dort, wo der erste Build in TestFlight liegt, und ergänzt alles, was der App Store zusätzlich zu Google Play verlangt.

Die Texte folgen denselben Grundsätzen wie der [Play-Store-Eintrag](play-store/STORE-EINTRAG.md): nichts versprechen, was ein Hash nicht leisten kann, und die Grenzen nennen. Keine Wörter wie „rechtssicher“, „gerichtsfest“ oder „fälschungssicher“ ergänzen und keine Begriffe aus dem Umfeld von Kryptowährungen („Krypto“, „Coin“, „Token“, „Wallet“, „Mining“, „Investment“).

**Öffentliches Repository:** Kontaktangaben stehen hier nur als Platzhalter in eckigen Klammern, etwa `[E-MAIL]`. Echte Namen, Anschriften und Telefonnummern gehören nur in App Store Connect. Die beiden Rechts-URLs sind dagegen schon im App-Quellcode öffentlich und stehen deshalb ausgeschrieben.

Diese Unterlage ist keine Rechtsberatung.

## Überblick

| Teil | Inhalt | Wer |
|---|---|---|
| [0](#0-reihenfolge-von-null-bis-zur-freigabe) | **Reihenfolge von null bis zur Freigabe**, App in App Store Connect anlegen | du |
| [1](#1-voraussetzungen) | Voraussetzungen | – |
| [2](#2-entscheidungen-vor-dem-ersten-upload) | Entscheidungen vor dem ersten Upload | du |
| [3](#3-nur-iphone-keine-ipad-fassung) | Nur iPhone, keine iPad-Fassung | erledigt |
| [4](#4-build-und-testflight) | Build und TestFlight | du, mit Apple-Login |
| [5](#5-store-eintrag-texte) | Store-Eintrag: Texte | kopierfertig unten |
| [6](#6-app-datenschutz) | App-Datenschutz (Nutrition Labels) | du, Vorlage unten |
| [7](#7-screenshots) | Screenshots | du, mit dem iPhone |
| [8](#8-prüfhinweise-für-app-review) | Prüfhinweise für App Review | kopierfertig unten |
| [9](#9-einreichen-und-die-häufigsten-ablehnungsgründe) | Einreichen, häufige Ablehnungsgründe | du |
| [10](#10-nach-der-freigabe) | Nach der Freigabe | – |
| [11](#11-checkliste-vor-dem-einreichen) | Checkliste | du |

**Zeitbedarf:** etwa einen halben Tag für Teile 5 bis 8, dazu die Wartezeit bei Apple. Die Prüfung dauert meist einen bis zwei Tage; bei Rückfragen länger.

## 0. Reihenfolge von null bis zur Freigabe

Die Teile dieser Seite stehen nach Thema, nicht nach Zeit. Diese Tabelle ist die Reihenfolge, wenn in App Store Connect noch nichts angelegt ist. „ASC“ ist App Store Connect, [appstoreconnect.apple.com](https://appstoreconnect.apple.com).

| Schritt | Was | Wo | Dauer | Hier nachlesen |
|---|---|---|---|---|
| 1 | Vereinbarungen im Konto annehmen | ASC → *Verträge, Steuern und Bankverbindung* | 10 min | [0.1](#01-vereinbarungen-annehmen) |
| 2 | Bundle-ID endgültig entscheiden | – | – | [Teil 2](#2-entscheidungen-vor-dem-ersten-upload) |
| 3 | Ersten Build starten. EAS fragt dabei nach dem Apple-Login, registriert die Bundle-ID bei Apple und legt Zertifikat und Profil an | Terminal | 5 min Eingaben, 15–30 min Bauzeit | [Teil 4](#4-build-und-testflight) |
| 4 | **App in ASC anlegen** – das fehlende „Projekt“ | ASC → *Apps* → **+** | 10 min | [0.2](#02-app-in-app-store-connect-anlegen) |
| 5 | Build nach TestFlight hochladen | Terminal | 5–30 min Verarbeitung bei Apple | [Teil 4](#4-build-und-testflight) |
| 6 | TestFlight-Fassung auf dem eigenen iPhone prüfen | iPhone | 30 min | [Teil 4](#4-build-und-testflight) |
| 7 | Screenshots aufnehmen und auf die akzeptierte Größe bringen | iPhone, dann PC | 1 h | [Teil 7](#7-screenshots) |
| 8 | Store-Eintrag, App-Datenschutz, Altersfreigabe, Händlerangaben, Prüfhinweise | ASC | 1–2 h | [Teile 5–8](#5-store-eintrag-texte) |
| 9 | Zur Prüfung einreichen | ASC | 1–2 Tage Wartezeit | [Teil 9](#9-einreichen-und-die-häufigsten-ablehnungsgründe) |

**Warum Schritt 3 vor Schritt 4:** Beim Anlegen der App verlangt ASC die Bundle-ID aus einer Auswahlliste. Dort stehen nur Kennungen, die im Developer-Portal registriert sind. Das übernimmt EAS beim ersten Build, sodass du es nicht selbst tun musst.

Wer die App lieber **zuerst** in ASC sehen will, registriert die Kennung von Hand und tauscht die Schritte 3 und 4: [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list) → *Identifiers* → **+** → *App IDs* → *App* → Beschreibung „DoiProof“, *Explicit* mit `org.doichain.doiproof`, keine Capabilities auswählen. Die App braucht keine (keine Push-Benachrichtigungen, kein iCloud, kein Sign in with Apple).

### 0.1 Vereinbarungen annehmen

Ohne angenommene Vereinbarung lässt sich keine App ausliefern, und das fällt erst beim Einreichen auf.

In ASC → *Verträge, Steuern und Bankverbindung* (englisch *Agreements, Tax, and Banking*) muss die Vereinbarung für **kostenlose Apps** den Status „aktiv“ haben. Annehmen darf sie nur die Rolle **Account Holder**. Steuer- und Bankangaben sind für eine kostenlose App nicht nötig; sie werden erst für bezahlte Apps und In-App-Käufe verlangt.

Gleich mit erledigen: **Händlerstatus für die EU**. Apple verlangt Name, Anschrift, Telefon und E-Mail des Händlers und zeigt sie Nutzern in der EU öffentlich an. Fehlen sie, wird die App in der EU nicht ausgeliefert – unabhängig davon, ob Apple sie freigibt. Dieselben geschäftlichen Angaben verwenden wie bei Google Play.

### 0.2 App in App Store Connect anlegen

ASC → *Apps* → **+** → *Neue App*:

| Feld | Wert | Hinweis |
|---|---|---|
| Plattformen | **iOS** | Nur iOS ankreuzen. |
| Name | `DoiProof – Foto-Nachweis` | Muss im App Store **weltweit** frei sein; ASC prüft das sofort. Ist er belegt, Variante aus [Teil 5.1](#51-app-name). Der Name lässt sich später ändern. |
| Primärsprache | **Deutsch (Deutschland)** | |
| Bundle-ID | `org.doichain.doiproof` | Aus der Auswahlliste. Steht sie nicht darin, fehlt Schritt 3. **Danach nie mehr änderbar.** |
| SKU | `doiproof` | Interne Kennung, nur für dich sichtbar, frei wählbar, nicht änderbar. |
| Benutzerzugriff | **Vollzugriff** | Bei einem Konto mit mehreren Personen hier einschränken. |

Danach steht die App als Entwurf in ASC. Notiere die numerische **Apple-ID der App** unter *Allgemein → App-Informationen*. Sie ist kein Geheimnis und kann in `eas.json` eingetragen werden, damit `eas submit` nicht jedes Mal fragt:

```json
"submit": { "production": { "ios": { "ascAppId": "1234567890" } } }
```

Der Preis gehört nicht in dieses Fenster: *Preise und Verfügbarkeit* → **Kostenlos**, und dort auch die Länder festlegen.

## 1. Voraussetzungen

- **Apple Developer Program, Organisationskonto.** Liegt vor. Als Verkäufer erscheint die Organisation.
- **Expo-Konto mit Rolle Owner oder Admin** in `neubuots-team`. Der Robot-Nutzer mit Rolle *Developer* genügt für die einmalige Einrichtung der Apple-Zugangsdaten nicht.
- **Kein Mac nötig.** EAS baut in der Cloud.
- **Ein iPhone.** Es wird für die Screenshots und für den Test der TestFlight-Fassung gebraucht. Mindestens iOS 16.4 – das ist das Deployment-Ziel der Expo-Vorgabe.

## 2. Entscheidungen vor dem ersten Upload

| Punkt | Warum vorher |
|---|---|
| **Bundle-ID** `org.doichain.doiproof` | Mit dem ersten Upload ist sie fest an den Eintrag gebunden und lässt sich **nie mehr ändern**, genau wie der Paketname bei Google Play. Dort ist dieselbe Kennung schon veröffentlicht; für beide Stores dieselbe zu verwenden ist üblich und erleichtert später die Zuordnung. Der Vorbehalt aus dem Play-Eintrag gilt aber auch hier: `org.doichain.…` legt eine Verbindung zum Doichain-Projekt nahe, und Apple kann das nach Richtlinie 5.2.1 als Anmaßung einer fremden Identität werten. Wenn der Bezug nicht abgestimmt ist, jetzt entscheiden. |
| **App-Name im Store** | „DoiProof“ muss im App Store weltweit noch frei sein; Apple prüft das beim Anlegen. Ist er belegt, brauchst du eine Variante (siehe Teil 5.1). Der Name lässt sich später ändern, die Bundle-ID nicht. |
| **Preis** | „Kostenlos“. Prüfe im Konto, welche Änderungen später noch möglich sind, und verlasse dich nicht darauf. |
| **Händlerangaben für die EU** | Apple verlangt für den Vertrieb in der EU Angaben zum Händler (Name, Anschrift, Telefon, E-Mail) und zeigt sie Nutzern in der EU **öffentlich** an. Geschäftliche Angaben verwenden, dieselben wie bei Google Play. Ohne diese Angaben wird die App in der EU nicht ausgeliefert. |
| **Datenschutzerklärung und Impressum online** | Beide URLs müssen beim Ausfüllen erreichbar sein: `https://doiproof.doilabs.org/datenschutz` und `https://doiproof.doilabs.org/impressum`. Sie sind schon in der App unter „Über diese App“ verlinkt. |

## 3. Nur iPhone, keine iPad-Fassung

In `app.json` steht `ios.supportsTablet: false`, der Build zielt damit nur auf das iPhone (`TARGETED_DEVICE_FAMILY = 1`). Das hat zwei Gründe:

1. Unterstützt das Binärpaket das iPad, verlangt App Store Connect einen **eigenen Satz iPad-Screenshots** (13 Zoll). Ohne iPad lässt sich der nicht herstellen.
2. Die Oberfläche ist auf Hochformat ausgelegt. Auf dem iPad käme Querformat hinzu, und das ist nicht geprüft.

Ein Test in `scripts/config.test.mjs` hält die Einstellung fest, damit sie nicht versehentlich zurückgedreht wird. Auf einem iPad läuft die App weiterhin – im iPhone-Kompatibilitätsmodus.

## 4. Build und TestFlight

Der Ablauf steht in [IOS-RELEASE.md](IOS-RELEASE.md). Kurz:

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production --latest
```

Beim ersten Mal fragt EAS nach deiner Apple-ID mit Zwei-Faktor-Bestätigung und legt Distribution-Zertifikat, Provisioning-Profil und den App-Store-Connect-API-Schlüssel an. Alles landet in Expo, nichts im Repository. Push-Benachrichtigungen braucht die App nicht.

**Exportkonformität** ist vorab beantwortet: `ITSAppUsesNonExemptEncryption = False` steht im erzeugten `Info.plist`, weil `app.json` es setzt. Beim Upload fragt Apple deshalb nicht nach.

**Die Build-Nummer** steht in `app.json` (`ios.buildNumber`, derzeit `5`) und ist dieselbe wie Androids `versionCode`; sie wird vor jedem Store-Build von Hand erhöht (`appVersionSource: local`). Apple verlangt sie innerhalb einer Version streng steigend, also auch für einen zweiten TestFlight-Build von 1.0.0. Siehe [ANDROID-RELEASE.md, „Versionen und Build-Nummern“](ANDROID-RELEASE.md#versionen-und-build-nummern).

**Vor dem Store-Eintrag die TestFlight-Fassung auf dem eigenen iPhone prüfen.** Apple lehnt nach Richtlinie 2.1 ab, was abstürzt oder offensichtlich unfertig ist. Besonders ansehen:

- Berechtigungsdialoge für Kamera, Fotos, Standort und Bewegung erscheinen mit den deutschen Texten.
- Eine Aufnahme im Profil „Privat“ und eine im Profil „Standort & Sensoren“ laufen durch.
- Der Lichtsensor fehlt auf dem iPhone. Im Manifest muss dafür die Begründung „iOS stellt Apps keinen Umgebungslichtsensor zur Verfügung.“ stehen, kein Fehler.
- Das Barometer liefert auf iOS die relative Höhe, nicht den absoluten Luftdruck.
- ZIP-Export, Import im Tab „Prüfen“ und der PDF-Bericht funktionieren über das iOS-Teilen-Menü.

## 5. Store-Eintrag: Texte

Die Felder liegen in App Store Connect unter *Apps → DoiProof → App Store → Version*. Standardsprache **Deutsch (Deutschland)**. Alle Längen unten wurden per Skript gezählt, Zeilenumbrüche als ein Zeichen; maßgeblich ist der Zähler in App Store Connect.

### 5.1 App-Name

Höchstens 30 Zeichen. Zusätze wie „kostenlos“, „Nr. 1“ oder Emojis sind nicht erlaubt.

Vorschlag (24 Zeichen):

```text
DoiProof – Foto-Nachweis
```

Falls „DoiProof“ im Namen schon belegt ist:

```text
DoiProof Beweispaket
```

### 5.2 Untertitel

Höchstens 30 Zeichen. Erscheint unter dem Namen und wird von Apple durchsucht, zählt also auch für die Suche. Google Play hat dieses Feld nicht.

Vorschlag (26 Zeichen):

```text
Foto und Daten nachweisbar
```

Variante (24 Zeichen):

```text
Hash des Fotos verankern
```

### 5.3 Werbetext

Höchstens 170 Zeichen. Steht über der Beschreibung und lässt sich **ohne neue Version ändern** – der richtige Platz für Hinweise, die sich ändern können, etwa zum Tageskontingent.

Vorschlag (163 Zeichen):

```text
Aus Foto und Aufnahmedaten entsteht auf dem Gerät ein Beweispaket. Nur dessen Hash wird auf der Doichain verankert. Foto, Standort und Sensorwerte bleiben bei dir.
```

### 5.4 Beschreibung

Höchstens 4000 Zeichen. Der Text entspricht der Play-Beschreibung, mit drei Änderungen:

- **Kein Hinweis auf andere Plattformen.** Apple beanstandet nach Richtlinie 2.3.10 Verweise auf andere Betriebssysteme. In der Play-Fassung stand „Prüfer für Kommandozeile und Windows“; hier heißt es nur „Prüfprogramm des Projekts“.
- **Lichtsensor.** Auf dem iPhone gibt es keinen; die Aufzählung nennt ihn deshalb nicht.
- **Die Rechts-URLs** sind eingesetzt statt der Platzhalter.

Länge: **3782 Zeichen**.

```text
DoiProof verbindet ein Foto mit den bei der Aufnahme gemessenen Angaben zu einem Beweispaket und verankert dessen digitalen Fingerabdruck (SHA-256-Hash) auf der öffentlichen Blockchain Doichain. Wer das Beweispaket erhält, kann später nachrechnen, dass genau dieses Foto mit genau diesen Angaben spätestens zur Zeit des bestätigenden Blocks vorlag und seitdem unverändert ist.

SO FUNKTIONIERT ES
• Foto aufnehmen oder auswählen. Die App berechnet den Hash der Bilddatei auf dem Gerät.
• Profil wählen: „Privat“ (Manifest ohne Standort und Sensoren), „Standort & Sensoren“ oder „Individuell“. Zur Gerätezeit kommen je nach Profil Standort und, bei Kameraaufnahmen, Messwerte von Bewegung, Kompass und Luftdruck hinzu, soweit das Gerät sie liefert.
• Vor einer Kameraaufnahme ruft die App die aktuellen Blöcke von Bitcoin und Doichain ab (abschaltbar). Sie zeigen, dass das Manifest nicht vor diesen Blöcken erstellt wurde; das Foto selbst könnte älter sein.
• Nur der Hash des Pakets und eine kurze Notiz (bei Kameraaufnahmen mit der Aufnahmezeit laut Gerät) gehen an den Doichain-Dienst. Voreingestellt sendet die App sofort nach der Aufnahme; abschaltbar, die Wahl bleibt gespeichert.
• Sobald die Einreichung in einem Doichain-Block steht, meist nach 10 bis 30 Minuten, ist der Nachweis bestätigt.

PRÜFEN UND WEITERGEBEN
• Beweispaket als ZIP teilen: Originalfoto, Manifest mit allen Angaben, Status und Prüfanleitung.
• PDF-Prüfbericht mit Ergebnis, Beweiskette, allen Messwerten und auf Wunsch einem Kartenausschnitt.
• Prüfer in der App: eigene oder fremde ZIP-Pakete importieren, auf dem Gerät prüfen und optional online abgleichen.
• Unabhängig nachprüfbar mit dem quelloffenen Prüfprogramm des Projekts (github.com/neubuot/DoiProof).

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

Datenschutzerklärung: https://doiproof.doilabs.org/datenschutz
Impressum: https://doiproof.doilabs.org/impressum
```

### 5.5 Schlüsselwörter

Höchstens 100 Zeichen, mit Komma getrennt, **ohne Leerzeichen nach dem Komma** – Leerzeichen zählen mit. Wörter aus App-Name und Untertitel sind schon indexiert und gehören nicht noch einmal hierher. Fremde Markennamen sind nicht erlaubt.

Länge: **94 Zeichen**.

```text
Beweis,Zeitstempel,SHA-256,Manifest,Doichain,Blockchain,Prüfbericht,Schaden,Übergabe,Gutachten
```

### 5.6 Kategorie

| Feld | Wert | Begründung |
|---|---|---|
| Primäre Kategorie | **Dienstprogramme** (Utilities) | Entspricht „Tools“ bei Google Play. |
| Sekundäre Kategorie | **Produktivität** oder leer | Optional. |

**Nicht** „Finanzen“ wählen. Die App hat keine Geldfunktion, und die Kategorie zieht eine strengere Prüfung nach sich.

### 5.7 URLs, Copyright, Kontakt

| Feld | Eintrag | Hinweis |
|---|---|---|
| Support-URL (Pflicht) | `[WEBSITE]` | Muss erreichbar sein und einen Weg zur Kontaktaufnahme zeigen. Apple lehnt eine URL ab, die nur auf eine leere Seite führt. |
| Marketing-URL (optional) | `[WEBSITE]` | Kann leer bleiben. |
| URL der Datenschutzerklärung (Pflicht) | `https://doiproof.doilabs.org/datenschutz` | HTML-Seite, öffentlich, ohne Anmeldung. |
| Copyright | `2026 [VERANTWORTLICHER]` | Jahr der Erstveröffentlichung und der Rechteinhaber. |
| Kontaktdaten für die Prüfung | `[NAME]`, `[E-MAIL]`, `[TELEFON]` | Sieht nur Apple, nicht die Öffentlichkeit. |
| Händlerangaben EU | siehe Teil 2 | Werden Nutzern in der EU öffentlich angezeigt. |

### 5.8 Altersfreigabe

Fragebogen unter *App-Informationen → Altersfreigabe*. Alle Fragen zu Gewalt, Sexualität, Glücksspiel, Drogen und nutzergenerierten Inhalten mit **Nein** beantworten. Die App zeigt keine fremden Inhalte, hat keinen Chat und keinen eingebauten Browser; die Links zu Datenschutz und Impressum öffnen Safari.

Ergebnis ist voraussichtlich **4+**. „Unbeschränkter Webzugriff“ mit Nein beantworten.

## 6. App-Datenschutz

Formular *App-Datenschutz* in App Store Connect. Es muss ausgefüllt sein, sonst nimmt Apple die Version nicht an.

Die Datenflüsse sind in [play-store/APP-INHALTE.md](play-store/APP-INHALTE.md) unter „Grundlage: Was die App überträgt“ (D1 bis D5) einmal belegt und begründet. Apple fragt dieselben Dinge mit anderen Begriffen ab. Diese Zuordnung folgt daraus:

| Apple-Kategorie | Angabe | Woraus | Mit Identität verknüpft | Tracking |
|---|---|---|---|---|
| Standort → **Ungefährer Standort** | ja | D3: Für den Kartenausschnitt im PDF lädt die App Kacheln rund um den Standort; daraus ergibt sich die Umgebung auf etwa 1 km. | nein | nein |
| Standort → Genauer Standort | nein | D5: Die genauen Koordinaten verlassen das Gerät nur, wenn der Nutzer selbst ein ZIP oder PDF teilt. | – | – |
| Benutzerinhalte → **Fotos oder Videos** | nein | D5: Das Foto verlässt das Gerät nicht. Übertragen wird nur sein Hash. | – | – |
| Benutzerinhalte → **Sonstige Benutzerinhalte** | ja | D1: Hash des Beweispakets und die Notiz mit der Aufnahmezeit laut Gerät. Beides steht danach dauerhaft und öffentlich auf der Blockchain. | nein | nein |
| Identifikatoren → **Geräte-ID** | ja | D4: Expo erhält bei der Update-Prüfung eine zufällige, dauerhaft gespeicherte Installationskennung. | nein | nein |
| Identifikatoren → Benutzer-ID | nein | Kein Konto, keine Anmeldung. | – | – |
| Diagnose → **Sonstige Diagnosedaten** | ja | D4: Konnte das Update-System bei einem früheren Start nicht laden, geht dessen Fehlermeldung mit. | nein | nein |
| Nutzungsdaten, Kontaktdaten, Gesundheit, Finanzen, Kontakte, Suchverlauf, Käufe | nein | Keine Analyse-, Werbe- oder Absturzbibliothek, kein Konto, keine Käufe. | – | – |

**Zweck** überall nur **App-Funktionalität**. Nicht „Analyse“ und nicht „Produktpersonalisierung“ – das widerspräche der Datenschutzerklärung.

**„Werden diese Daten zum Tracking verwendet?“** überall **nein**. Die App nutzt den Werbe-Identifikator (IDFA) nicht und verknüpft keine Daten mit Daten anderer Anbieter. Deshalb braucht sie auch kein Tracking-Einverständnis (App Tracking Transparency).

Zwei Punkte nach Ermessen, bei denen das Formular Spielraum lässt:

- **Ungefährer Standort:** Streng gelesen verarbeitet der Kartendienst die Anfrage nur vorübergehend, und Apple nimmt rein vorübergehende Verarbeitung aus. Der Kartendienst führt aber Protokolle. Wie bei Google Play gilt: im Zweifel angeben. Das Formular erlaubt den Zusatz, dass die Angabe nur für eine optionale Funktion gilt.
- **Sonstige Benutzerinhalte:** Ein SHA-256-Hash ist für sich kein personenbezogenes Datum. Er wird aber aus dem Foto des Nutzers gebildet und dauerhaft veröffentlicht. Deshalb angeben.

Formular und Datenschutzerklärung müssen dasselbe sagen. Beide nennen die Empfänger: Doichain-Dienst, Blockstream, OpenStreetMap über Fastly, Expo.

## 7. Screenshots

Feld *Vorschau und Screenshots* je Bildschirmgröße.

### Vorgaben

- Verlangt ist mindestens ein Satz für die **größte iPhone-Klasse (6,9 Zoll)**. Daraus leitet Apple die Darstellung für kleinere iPhones ab. Akzeptiert werden im Hochformat **1320 × 2868** oder **1290 × 2796** Pixel.
- Die Angaben zu den Pflichtgrößen hat Apple in den letzten Jahren mehrfach geändert, und die Quellen im Netz widersprechen sich. **Maßgeblich ist der Upload-Dialog in App Store Connect:** Er nennt die akzeptierten Maße und lehnt alles andere mit einer Fehlermeldung ab. Dort nachsehen, bevor du zuschneidest.
- **2 bis 10 Bilder** je Größe. Vier bis sechs sind ein guter Wert.
- **Format:** PNG oder JPEG, **ohne Alphakanal**, RGB-Farbraum.
- Kein Rahmen in Form eines Geräts, keine Werbeaufschriften, die mehr versprechen als die Beschreibung.

### Wenn dein iPhone eine andere Auflösung hat

Nur die großen Modelle (Pro Max bzw. Plus) nehmen Screenshots in 1290 × 2796 auf. Ein kleineres iPhone liefert zum Beispiel 1179 × 2556 – diese Größe nimmt App Store Connect nicht an.

Das Seitenverhältnis ist praktisch gleich (0,4612 gegenüber 0,4614), deshalb genügt ein Skalieren ohne Beschnitt. Lege die Bilder in einen Ordner und sag Bescheid; das Umrechnen auf die akzeptierte Größe als PNG ohne Alphakanal ist eine Sache von Minuten und lässt sich hier erledigen.

### Datenschutz bei den Aufnahmen

Es gelten dieselben Regeln wie beim Play-Eintrag, ausführlich in [play-store/STORE-EINTRAG.md, Abschnitt 8](play-store/STORE-EINTRAG.md#8-screenshots). Kurz:

- Nur Testmotive, keine Personen, Kennzeichen, Dokumente oder Bildschirme, und nicht an deiner Wohnadresse.
- Profil „Privat“ verwenden, damit keine Koordinaten im Bild stehen. Für den Sensor-Screenshot „Individuell“ ohne „GPS, Höhe und Genauigkeit“.
- In der iOS-Kamera unter *Einstellungen → Datenschutz & Sicherheit → Ortungsdienste → Kamera* auf „Nie“ stellen, sonst steht der Aufnahmeort im Originalfoto der Test-ZIPs.
- Beim PDF-Bericht „Standort im Bericht“ aus lassen, dann entsteht auch kein Kartenausschnitt.
- Vorher „Nicht stören“ einschalten, damit in der Statusleiste nichts Privates erscheint.
- Jede Einreichung steht dauerhaft öffentlich auf der Doichain. Zwei oder drei Test-Nachweise reichen.
- Screenshots mit Testdaten nur nach App Store Connect hochladen, nicht ins Repository.

### Reihenfolge

Die ersten zwei bis drei Bilder erscheinen in der Suche, ohne dass gewischt wird. Sie zeigen deshalb den Ablauf.

| Nr. | Bildschirm | So einstellen |
|---|---|---|
| 1 | **Aufnehmen**, oberer Bereich | Ganz nach oben scrollen. Sichtbar: „Dein Foto. Dein Nachweis.“, Profil „Privat“, „Foto aufnehmen“ und „Foto wählen“. |
| 2 | **Nach der Aufnahme** | Testfoto erstellen. So scrollen, dass Vorschau, die drei Hashwerte und die Vorabblöcke zu sehen sind. |
| 3 | **Nachweisverlauf** | Warten, bis der Eintrag „Bestätigt“ zeigt. Sichtbar: Status sowie „Prüfbericht PDF“ und „Beweispaket ZIP“. |
| 4 | **Prüfen**, Ergebnis | ZIP des Testnachweises importieren, „Kettenstatus online abgleichen“ an, „Paket prüfen“. Sichtbar: „Auf einen Blick“ und „Beweiskette“. |
| 5 | **PDF-Prüfbericht** | Mit „Foto im Bericht“ an und „Standort im Bericht“ aus erstellen und in einer PDF-Ansicht öffnen. |
| 6 | *optional:* **Über diese App** | Zeigt Version, Update-Kanal und die Links zu Datenschutz und Impressum. |

**Offener Punkt wie bei Google Play:** Das Ergebnisbanner einer bestandenen Prüfung lautet „Echt versiegelt und unverändert.“, und sein Begleittext enthält das Wort „fälschungssicher“. Das geht weiter als die Beschreibung. Entweder den Bannertext anpassen oder Nr. 4 so scrollen, dass das Banner nicht im Bild ist, und Nr. 5 weglassen.

## 8. Prüfhinweise für App Review

Feld *Informationen zur App-Prüfung → Anmerkungen*. Englisch, weil die Prüfung nicht zwingend auf Deutsch stattfindet.

Zwei Dinge können für die Prüfer wie ein Fehler aussehen: Ohne Internet öffnet sich die Kamera nicht, solange der Schalter für die Vorab-Blöcke an ist, und das kostenlose Tageskontingent ist je IP-Adresse begrenzt – Apples Prüfgeräte teilen sich vermutlich IP-Adressen. Beides steht deshalb ausdrücklich im Text.

```text
No login or account is required; all features work without credentials. There are no in-app purchases and no subscriptions.

Core flow: tap "Foto aufnehmen" (take photo) or "Foto wählen" (choose photo). The app hashes the evidence package on the device and sends only this SHA-256 hash plus a short note with the device capture time to a Doichain service, which anchors it as a timestamp on the public Doichain blockchain. The photo, exact GPS coordinates and sensor values stay on the device. Only the optional map excerpt in the PDF report loads OpenStreetMap tiles around the recorded location (about 1 km).

This app is not a cryptocurrency app: no wallet, no private keys, no transfer of funds, no mining, no exchange and no trading. It writes a hash into a public blockchain as a timestamp, nothing else.

Internet is required for anchoring and online verification. Without a network connection, switch off "BTC- und Doichain-Block vor Kameraaufnahme" on the "Aufnehmen" tab, otherwise the camera does not open.

Free quota: without an own key the service grants a limited daily quota per IP address (currently 10 per IP and UTC day; see the card "Tageskontingent"). If it is used up, the capture stays saved on the device (status "Einreichung unklar", after the next status check "Nicht verankert") and can be sent later with "Jetzt senden". Confirmation in a block usually takes 10 to 30 minutes ("Offene prüfen").

Location is optional: the default profile "Privat" never asks for it. Only the profiles "Standort & Sensoren" and "Individuell" (with "GPS, Höhe und Genauigkeit") request foreground location, and denying it is fine - the manifest then records the refusal.

To test the verifier without anchoring: in the history ("Nachweisverlauf") tap "Beweispaket ZIP" and save the file. Then open the tab "Prüfen", tap "ZIP-Beweispaket importieren", choose the file and tap "Paket prüfen". Optionally tap "PDF-Prüfbericht erstellen und teilen".

Every anchoring is public and permanent on the blockchain and cannot be deleted.
```

Ein Demokonto ist nicht nötig; das Feld dafür bleibt leer.

## 9. Einreichen und die häufigsten Ablehnungsgründe

Einreichen über *Zur Prüfung einreichen*. Danach meist ein bis zwei Tage Wartezeit. Diese Punkte sind für DoiProof die wahrscheinlichen Stolpersteine:

| Richtlinie | Worum es geht | Vorsorge |
|---|---|---|
| **2.1** Vollständigkeit | Die Prüfer müssen die Kernfunktion ausführen können. Scheitert die Verankerung am Kontingent, wirkt die App kaputt. | Prüfhinweise aus Teil 8 eintragen. Die App bleibt auch bei erschöpftem Kontingent benutzbar: Der Nachweis wird lokal gesichert, der Prüfer funktioniert weiter. |
| **2.3.10** Verweise auf andere Plattformen | Nennt die Beschreibung Android, Windows oder Google Play, wird abgelehnt. | Die Beschreibung in Teil 5.4 ist entsprechend angepasst. Beim späteren Ergänzen von Text darauf achten. |
| **3.1.5(b)** Kryptowährungen | Apple prüft Blockchain-Apps genau. Verboten sind Wallets ohne Zulassung, Mining auf dem Gerät, Handel und Token-Verkauf. | DoiProof hat keine davon. Der Prüfhinweis sagt es ausdrücklich. In Texten und Schlüsselwörtern keine Begriffe aus dem Umfeld von Kryptowährungen verwenden. |
| **4.2** Mindestfunktionalität | Eine App, die nur eine Website anzeigt, wird abgelehnt. | Trifft nicht zu: Hashen, Manifest, Sensoren, Prüfer und PDF-Bericht laufen auf dem Gerät. |
| **5.1.1** Datenschutz | Die Zwecktexte müssen erklären, warum die App Kamera, Fotos, Standort und Bewegung braucht. Pauschale Texte werden beanstandet. | Die vier Texte stehen in `app.json` und sind konkret. Sie landen über `expo prebuild` im `Info.plist`. |
| **5.1.1(v)** Kontolöschung | Gilt nur für Apps mit Konto. | Trifft nicht zu, die App hat keins. Im Formular entsprechend angeben. |
| **5.1.2** Datenweitergabe | Formular, Datenschutzerklärung und tatsächliches Verhalten müssen übereinstimmen. | Teil 6 ist aus den geprüften Datenflüssen abgeleitet. |

Wird abgelehnt, steht der Grund im *Resolution Center* mit Verweis auf die Richtlinie. Antworten lässt sich dort direkt; für eine Textänderung genügt meist eine neue Einreichung ohne neuen Build.

## 10. Nach der Freigabe

| Änderung | Weg |
|---|---|
| Nur Texte, Screenshots, Werbetext | In App Store Connect ändern. Der Werbetext geht sofort, die übrigen Texte mit der nächsten Version. |
| Nur JavaScript oder Assets | **EAS Update** auf Kanal `production`: GitHub → *Actions* → „EAS Update“ → *Run workflow*. Erreicht installierte Apps beim nächsten Start. |
| Native Änderung (Expo-Modul, Berechtigung, SDK) | Die Laufzeitversion ändert sich; alte Builds laden das Update **nicht**. Neuer Build: `npx eas-cli@latest build -p ios --profile production --auto-submit`. |
| Neue Versionsnummer | `core/version.mjs`, `package.json`, `app.json`, `desktop/package.json` und `RELEASE_NOTES.md`; `scripts/config.test.mjs` hält sie zusammen. Die Build-Nummer im selben Commit erhöhen, `android.versionCode` und `ios.buildNumber` auf denselben Wert ([ANDROID-RELEASE.md](ANDROID-RELEASE.md#versionen-und-build-nummern)). |

TestFlight-Builds laufen nach 90 Tagen ab. Solange die App nicht im Store ist, erreicht ein Update auf dem Kanal `production` ausschließlich die TestFlight-Tester; danach alle Installationen. Für Tester sollte dann ein eigenes Profil mit eigenem Kanal angelegt werden.

## 11. Checkliste vor dem Einreichen

- [ ] Bundle-ID entschieden, bevor der erste Build hochgeladen wird.
- [ ] TestFlight-Fassung auf einem echten iPhone geprüft: keine Abstürze, alle Berechtigungsdialoge mit deutschem Text, eine Aufnahme je Profil, ZIP-Export, Import, PDF-Bericht.
- [ ] Beide Rechts-URLs im Browser erreichbar, Datenschutzerklärung als HTML ohne Anmeldung.
- [ ] Beschreibung nennt keine andere Plattform und kein Wort aus dem Umfeld von Kryptowährungen.
- [ ] Kein Text und kein Screenshot verspricht mehr als die Beschreibung, also nichts wie „rechtssicher“, „gerichtsfest“ oder „fälschungssicher“.
- [ ] Auf keinem Screenshot sind Koordinaten, Karten, Personen, Namen oder private Mitteilungen zu sehen.
- [ ] Screenshots haben eine von App Store Connect akzeptierte Größe und keinen Alphakanal.
- [ ] Formular „App-Datenschutz“ ausgefüllt und deckungsgleich mit der Datenschutzerklärung.
- [ ] Altersfreigabe-Fragebogen abgeschlossen.
- [ ] Händlerangaben für die EU eingetragen.
- [ ] Prüfhinweise aus Teil 8 im Feld „Anmerkungen“.
