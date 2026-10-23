# DoiProof: Programm und Beweiskette

**Dokumentationsstand:** DoiProof 1.0.0, 5. Oktober 2026 (Manifest v3 mit Sensoren). Maßgeblich für einen konkreten Nachweis sind dessen Manifestversion, ZIP-Inhalt und tatsächlicher Kettenstatus. Dieses Dokument wird zusammen mit dem Programm in GitHub versioniert.

## Zweck und Zielgruppen

DoiProof ist eine mobile Anwendung, die die Bytes einer ausgewählten Fotodatei mit einem Metadaten-Manifest kryptografisch verbindet und den daraus berechneten SHA-256-Wert auf der Doichain verankern lässt. Wer das Foto und das vollständige Beweispaket erhält, kann die Hashwerte nachrechnen und die Verankerung unabhängig untersuchen. Die App soll eine nachvollziehbare Indizienkette zur Existenz **genau dieser Dateiversion und dieses Manifests** schaffen. Sie bescheinigt weder die Wahrheit des Bildinhalts noch die Identität der aufnehmenden Person.

| Zielgruppe | Nutzen und Prüfauftrag |
|---|---|
| Aufnehmende Person | Foto und Kontext zeitnah dokumentieren, Bestätigung abwarten und vollständiges ZIP sichern. |
| Empfänger, Versicherung oder Auftraggeber | Inhalt und Kontext ansehen, Hashwerte prüfen, Blocktransaktion kontrollieren und weitere Unterlagen abgleichen. |
| Technische Prüfer | Manifestversion, Dateibytes, Hashberechnung, Vorabblöcke, Transaktion und Kettenverlauf unabhängig prüfen. |
| Gericht oder Sachverständige | Technisch überprüfbare Tatsachen von Geräteangaben und Schilderungen trennen; Beweiswert im Einzelfall und zusammen mit anderen Beweismitteln würdigen. |

## Ablauf ab Version 1.0

1. Vor dem Öffnen der **Kamera** holt die App die Standortfreigabe ein (falls gewählt) und startet die Sensoren (Beschleunigung, Gyroskop, Magnetometer/Kompass, Luftdruck, Licht). Außerdem fragt sie standardmäßig den aktuellen BTC-Block über Blockstream und den aktuellen Doichain-Block über den Doichain-MCP-Dienst ab. Sie übernimmt jeweils Höhe, Hash, Headerzeit, Quelle und eine vom Gerät gemeldete Abfragezeit. Die beiden Abfragen laufen parallel. Falls eine scheitert, öffnet die Kamera in diesem Modus nicht. Der Nutzer kann den Modus sichtbar ausschalten und erneut fotografieren. Bei „Foto wählen“ aus der Mediathek entstehen keine Vorabblöcke.
2. Nach Rückkehr aus der Kamera oder Bildauswahl berechnet die App SHA-256 über die **von der Bildauswahl gelieferten Dateibytes**. Das ist nicht zwangsläufig die unveränderte Rohdatei des Sensors oder eine früher vorhandene externe Originaldatei. Die App notiert eine Gerätezeit nach der Rückkehr; es ist keine unabhängig gemessene Auslösezeit.
3. Ein versioniertes Manifest (v3) enthält Fotohash, Herkunft „Kamera“/„Mediathek“, ausgewähltes Metadatenprofil und gegebenenfalls Vorabblöcke, Standort, Sensorwerte (Einzelwert zur Aufnahme und kurze Messreihe je Sensor), Bild- und Geräteangaben. Nicht verfügbare oder verweigerte Sensoren und Standorte sind ausdrücklich vermerkt. Ein Standort-Fix wird **nach** dem Foto gemessen; Android pausiert die Sensoren der App, solange die System-Kamera geöffnet ist. Die App-Version und ein eventuell eingebetteter Git-Commit sind ausdrücklich nicht attestierte Selbstauskünfte.
4. Die App bildet den SHA-256 des kanonischen Manifests und daraus den gemeinsamen Beweispaket-Hash. Sie übermittelt **nur diesen Hash und eine kurze öffentliche Notiz mit als Geräteangabe gekennzeichneter Zeit**, keine Bilddatei und keine rohen GPS-Koordinaten, an den Doichain-Dienst. Bei ausgeschaltetem automatischen Senden ist dafür „Nachweis anlegen“ nötig.
5. Eine angenommene Einreichung kann zunächst `pending` sein. Erst die nachweisbare Aufnahme der Transaktion in einen Doichain-Block ergibt den Kettenanker (`confirmed`; später eventuell `expired` für den PoE-Status). Ein `pending`-Eintrag ist kein bestätigter Blockbeleg.
6. Bereits vor der Einreichung bewahrt die App eine Kopie der Fotodatei und den Verlauf **lokal in ihrem privaten Bereich** auf. Der PDF-Prüfbericht prüft das Paket mit derselben Logik wie die unabhängigen Prüfprogramme und dokumentiert Ergebnis, Beweiskette und jeden Messwert. Das exportierte ZIP enthält die tatsächlichen Bildbytes, `manifest.json`, `verification.json` und eine kurze Prüfanleitung.

### Was die Glieder der Kette aussagen

| Glied | Nachprüfbar | Aussagegrenze |
|---|---|---|
| SHA-256 der Fotodatei | Eine vorgelegte Datei hat dieselben Bytes wie der im Manifest gebundene Hash. | Kein Beweis für Motiv, Aufnahmeort, Autor oder unverfälschte Entstehung vor dem Hashen. |
| Manifest und Paket-Hash | Foto und genau dieses Manifest wurden gemeinsam gebunden; Änderungen werden erkennbar. | Angaben im Manifest können vom Gerät oder Nutzer stammen und falsch sein. |
| Sensorwerte (v3) | Beschleunigung, Drehrate, Magnetfeld, Kompass, Luftdruck und Licht samt Zeitstempeln sind unverändert seit der Versiegelung. | Messwerte eines nicht attestierten Geräts; sie können auf manipulierten Geräten gefälscht sein. Plausibilität (z. B. Luftdruck zur Höhe des Orts) lässt sich nur mit externen Daten einschätzen. |
| BTC- und DOI-Vorabblock | Die angegebenen Block-Hashes lassen sich auf den jeweiligen Ketten prüfen. | Der Abruf vor der Kameranutzung und die Geräte-Abfragezeit sind nicht unabhängig attestiert. Ein älteres Bild kann später erneut aufgenommen oder ausgewählt werden. Es gibt **keine harte Untergrenze** für die Entstehung des Motivs. |
| Doichain-Transaktion im Block | Der Paket-Hash war spätestens bei Aufnahme der Transaktion in die bestätigte Kette vorhanden, unter Annahme einer intakten Kette und korrekter Hashprüfung. | Die Block-Headerzeit ist kein sekundengenauer amtlicher Zeitstempel. Sie datiert nicht die physische Szene oder zwingend den Moment der Fotoaufnahme. |
| App- und Commit-Angabe | Eine Versions- oder Commit-Zeichenfolge steht im Manifest und kann mit einem bekannten Repositorystand verglichen werden. | Derzeit kein Fingerprint der ausführbaren App-Datei, kein Nachweis, dass dieser Code tatsächlich lief, keine Play Integrity oder vergleichbare Attestierung. |
| PDF-Prüfbericht | Dokumentiert Prüfergebnis, Beweiskette und alle gebundenen Angaben in lesbarer Form. | Keine Signatur und kein Ersatz für Bildbytes, Manifest, ZIP und eigene Kettenprüfung. |

Die BTC-Referenz kann eine zufällige Lücke zwischen Doichain-Blöcken als **zusätzliches zeitliches Indiz** einordnen. Ihre Headerzeit ist nicht der Zeitpunkt des Abrufs. DoiProof nimmt keine eigene BTC-Verankerung vor. Doichain verwendet Merged Mining mit Bitcoin; die beiden Ketten sind daher keine vollständig unabhängigen Zeitquellen. Wie stark ein zeitliches Indiz im Einzelfall ist, hängt unter anderem von der Nachprüfung der Ketten, dem Umgang mit dem Gerät und zusätzlichen Zeugen ab.

## Anwendungsfälle und sinnvolle Ergänzungen

| Einsatz | Beitrag von DoiProof | Weitere Unterlagen |
|---|---|---|
| Unfall oder Schaden | Zustand einzelner sichtbarer Schäden und unveränderte Dateiversion zeitnah festhalten. | Übersichts- und Detailfotos, Unfallbericht, Zeugen, Polizei-/Werkstattunterlagen; Personen und Kennzeichen rechtmäßig behandeln. |
| Journalismus / Nachrichtenherkunft | Herkunftsweg einer übergebenen Fotodatei und einen spätestens nachweisbaren Paketbestand dokumentieren. | Redaktionsprotokoll, Quellenprüfung, unabhängige Zeugen, Geolokalisierung; Quellenschutz beachten. Das Motiv wird nicht allein dadurch wahr. |
| Hausinventar und Gemälde für Versicherungen | Foto eines Gegenstands und dessen im Bild erkennbaren Zustand als zeitlich einordenbares Indiz sichern. | Mehrere Perspektiven, Seriennummern/Signaturen, Kaufbelege, Gutachten, Police und Nachweise zu Eigentum und Aufbewahrungsort. |
| Auftragnehmer und Auftraggeber | Arbeitsfortschritt oder sichtbares Ergebnis als Version mit dokumentiertem Kontext übergeben. | Auftrag, Leistungsbericht, Abnahmeprotokoll, gemeinsame Begehung und Empfangsbestätigung. Der Hash beweist keine vertragsgemäße Leistung. |
| Mietübergabe, Baufortschritt, Logistik | Sichtbaren Zustand vor oder nach einer Übergabe festhalten. | Übergabeprotokoll, Beteiligte, Ort, Bestandsliste und gegebenenfalls Gegenzeichnung. |

Eine Reihe aus Übersicht, Detail und Kontext ist häufig aussagekräftiger als ein einzelnes Foto. Jede Einreichung verbraucht gegebenenfalls Kontingent und erzeugt einen eigenen Nachweis.

## Prüfung durch Dritte

Das [eigenständige ZIP-Prüfprogramm](PRUEFPROGRAMM.md), der [Windows-Prüfer](DESKTOP-PRUEFER.md) und der Tab „Prüfen“ der App automatisieren die lokale Hashprüfung, bieten eine optionale Netzabfrage und erzeugen einen PDF-Prüfbericht. Es verwendet bei DOI denselben MCP-Dienst wie die App; für eine vom Dienst unabhängige Kettenprüfung ist ein eigener oder anders ausgewählter Node erforderlich.

1. Das vollständige ZIP vom Übergebenden erhalten, sicher kopieren und seinen eigenen Empfang und etwaige Änderungen dokumentieren. Das ZIP selbst enthält private Inhalte; eine PDF-Zusammenfassung allein reicht zur Neuberechnung nicht.
2. SHA-256 über die Bytes von `original.<endung>` berechnen und mit `manifest.photo.sha256` und `verification.photoSha256` vergleichen.
3. Das Manifest kanonisieren – v3 nach RFC 8785 (Schlüssel nach UTF-16-Code-Units), v1/v2 mit rekursiver JavaScript-`localeCompare`-Sortierung; jeweils `undefined`-Felder auslassen und JSON ohne Leerraum serialisieren (Referenz: `core/canonical.mjs`). Das ZIP-`manifest.json` enthält anschließend **einen zusätzlichen Zeilenumbruch**, der bei der Manifest-Hashberechnung nicht dazugehört. Den SHA-256 über die UTF-8-Bytes der kanonischen JSON-Zeichenfolge mit `verification.manifestSha256` vergleichen.
4. Den SHA-256 der UTF-8-Zeichenfolge `DoiProof:<version>\nphoto:<fotohash>\nmanifest:<manifesthash>` berechnen (`<version>` aus dem Manifest, `\n` als echte Zeilenumbrüche, kein abschließender Zeilenumbruch). Er muss `verification.evidenceSha256` entsprechen.
5. Unabhängig vom ZIP den Doichain-Status für den **Paket-Hash** abfragen. Transaktion, Blockhöhe und Block-Hash in einem eigenen Kettenzugang prüfen. `verification.json` enthält nur den zuletzt lokal bekannten Status und kann veraltet sein.
6. Vorabblöcke, falls vorhanden, anhand von Höhe und Hash auf BTC und Doichain prüfen. Headerzeiten, Gerätezeiten und tatsächliche Einreichungszeiten getrennt auflisten. Ein Vorabblock belegt für sich keinen Kamerastart. Auch eine Kettenreorganisation und die gewünschte Zahl von Bestätigungen sind bei hoher Tragweite zu berücksichtigen.
7. Bei Streit über Herkunft oder Wahrheitsgehalt zusätzliche Beweise und die Verwahrung der Dateien einbeziehen. Die DoiProof-App kann keinen lückenlosen Gewahrsam nach der Übergabe garantieren.

## Datenschutz, rechtliche Einordnung und Entwicklungsstand

Das Profil „Privat“ fordert keinen Standort an. Andere Profile können präzise Koordinaten und weitere Angaben in das **lokale vollständige ZIP** aufnehmen; die Schalter „Foto im Bericht“ und „Standort im Bericht“ ändern nur den PDF-Bericht, nicht das Manifest oder ZIP. Ein Kartenausschnitt im Bericht veranschaulicht nur die gebundenen Koordinaten; er wird auf Wunsch bei OpenStreetMap geladen, ist nicht Teil des Beweispakets und belegt keinen Aufnahmeort. Fotos können selbst sensible Daten enthalten. Vor einer Weitergabe Empfänger und notwendige Einwilligungen prüfen.

DoiProof stellt **keinen qualifizierten elektronischen Zeitstempel** aus und beansprucht keine gesetzliche Vermutung wie ein solcher. Nach [Art. 41 eIDAS-Verordnung](https://eur-lex.europa.eu/eli/reg/2014/910/oj?locale=de) sind die Wirkungen eines elektronischen Zeitstempels und die besondere Vermutung für qualifizierte Zeitstempel zu unterscheiden. Die rechtliche Würdigung bleibt eine Frage des konkreten Verfahrens, der überprüften Tatsachen und aller weiteren Beweismittel. Diese Dokumentation ist keine Rechtsberatung.

Geräte- und Software-Authentizität sind künftige Arbeiten: [Issue #6: App-/Geräteattestierung](https://github.com/neubuot/DoiProof/issues/6), [Issue #7: signierte Server-Challenge](https://github.com/neubuot/DoiProof/issues/7). Sie sind **nicht** Teil von Version 1.0. Für die Bedienung siehe [Kurzanleitung](KURZANLEITUNG.md) und [Benutzerhandbuch](BENUTZERHANDBUCH.md); das technische Modell steht in [ARCHITECTURE.md](ARCHITECTURE.md).
