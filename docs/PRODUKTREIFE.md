# Produktreife: offene Punkte und Vorschläge

Stand: 20. Oktober 2026 · Grundlage ist eine vollständige Durchsicht von `App.tsx`, allen Modulen unter `src/`, `scripts/verify.mjs` und der Build-Konfiguration bei Version 0.5.0.

Die kryptografische Kernmechanik ist belastbar: kanonisches JSON mit stabiler Schlüsselsortierung, domänenspezifisch versionierte Hashbindung, Querprüfung von Transaktion und Block vor einem bestätigten Status, lokale Sicherung von Original und Manifest **vor** dem ersten Netzaufruf und eine Sicherungskopie der Verlaufsdatei. Die offenen Punkte liegen nicht in der Kryptografie, sondern in der Anwendung darum herum.

Dieses Dokument benennt sie, ordnet sie nach Tragweite und schlägt eine Reihenfolge vor. Es ist eine Arbeitsgrundlage, keine Festlegung.

## 1. Kritisch für ein Beweisprodukt

### 1.1 Keine Sicherung des gesamten Bestandes

Die gesamte Beweislage liegt in zwei Dateien im app-privaten Verzeichnis ([`history.ts`](../src/history.ts#L6-L7)) und den Fotokopien unter `evidence/`. Geht das Gerät verloren oder wird es zurückgesetzt, ist alles fort – mit Ausnahme der ZIP-Pakete, die jemand vorher von Hand exportiert hat.

Für ein Produkt, das vor Versicherungen und Gerichten bestehen soll, ist das die schwerwiegendste Lücke: Ein Beweis, der nur in einem Exemplar auf einem Gerät existiert, ist kein verlässlicher Beweis.

**Vorschlag.** Ein Export des gesamten Bestandes als ein Archiv, mit passendem Import auf einem neuen Gerät. Ergänzend nach jeder Bestätigung ein sichtbarer Hinweis, das Beweispaket außerhalb des Geräts zu sichern. Eine automatische Synchronisierung in eine Fremdwolke wäre der bequemste, aber auch der datenschutzrechtlich heikelste Weg und sollte allenfalls als ausdrücklich gewählte Option entstehen.

### 1.2 Einträge lassen sich nicht löschen

Weder die Oberfläche noch [`history.ts`](../src/history.ts) kennen eine Löschfunktion. Der Verlauf wächst ausschließlich, die Originalkopien sammeln sich dauerhaft an. Der einzige Ausweg ist das Löschen der App-Daten – und das vernichtet den gesamten Bestand auf einmal.

Beim Entwurf dieser Funktion ist eine Asymmetrie zu beachten, die leicht übersehen wird:

> Ein verankerter Hash ist **nur** ein Hash. Um ihn zu verwenden, braucht es die exakten Bytes des Originals und das Manifest; ohne sie lässt sich `evidenceSha256` nicht nachrechnen und die Zugehörigkeit des Ankers nicht zeigen. Wer die lokale Kopie löscht, vernichtet also seine eigene Beweiskraft, während die öffentliche Spur unveränderlich bestehen bleibt. Das Ergebnis wäre der ungünstigste Fall: nichts mehr zu beweisen, aber für alle sichtbar, dass zu diesem Zeitpunkt etwas festgehalten wurde.

**Vorschlag: zwei getrennte Fälle.**

| Fall | Spur auf der Kette | Umgang |
|---|---|---|
| Entwurf mit Status `local` | keine | frei löschbar, ohne Rückfrage |
| eingereicht, `pending` oder bestätigt | dauerhaft | Löschen erst nach Export des ZIP-Pakets oder nach einer Bestätigung, die ausdrücklich sagt: Die lokale Kopie wird entfernt, der Eintrag in der Doichain bleibt bestehen und kann nicht entfernt werden |

Der erste Fall ist der dringendere. [`App.tsx`](../App.tsx#L186) legt für **jedes** aufgenommene oder ausgewählte Foto sofort einen lokalen Entwurf an, noch vor jedem Netzaufruf. Wer die App bei abgeschaltetem Sofortversand ausprobiert, erzeugt mit fünf Testaufnahmen fünf dauerhafte Einträge samt fünf Fotokopien, die auf keiner Kette stehen und sich trotzdem nicht entfernen lassen.

### 1.3 Die Versionsnummer steht an fünf Stellen

`0.5.0` ist in [`evidence.ts`](../src/evidence.ts#L85), noch einmal in [`evidence.ts`](../src/evidence.ts#L99), in [`App.tsx`](../App.tsx#L261) als „0.5“, in `app.json` und in `package.json` eingetragen.

In einer gewöhnlichen App wäre das eine Unsauberkeit. Hier wandert die Angabe in das Manifest, wird mitgehasht und damit Bestandteil des Beweises. Wird `app.json` auf eine neue Version gehoben und `evidence.ts` dabei vergessen, enthalten alle folgenden Beweise eine **falsche Selbstauskunft über die erzeugende App-Version**.

**Vorschlag.** Die Version zur Laufzeit aus `expo-constants` lesen und alle fest eingetragenen Vorkommen entfernen.

## 2. Was Nutzerinnen und Nutzer sofort bemerken

### 2.1 Einstellungen überleben den Neustart nicht

Weder `AsyncStorage` noch `SecureStore` kommen im Projekt vor. Metadatenprofil, Sofortversand, der Schalter für die Vorabblöcke und der eingegebene Schlüssel liegen ausschließlich im React-Zustand und fallen bei jedem Start auf die Vorgabewerte zurück.

Am folgenreichsten ist das Profil: Wer „Standortnachweis“ wählt, die App schließt und später zurückkehrt, steht wieder auf „Privat“ – und der nächste Nachweis entsteht **stillschweigend ohne Standortdaten**. Das fällt erst auf, wenn der Nachweis gebraucht wird.

**Vorschlag.** Profil und Schalter dauerhaft sichern. Der API-Schlüssel sollte bewusst flüchtig bleiben; wird er dauerhaft gespeichert, dann ausschließlich in `expo-secure-store` und nach ausdrücklicher Zustimmung.

### 2.2 Kein Einstieg beim ersten Start

Die App beginnt unmittelbar mit „Metadatenprofil“ und drei Schaltflächen. Was ein Profil bewirkt, wozu die Vorabblöcke dienen und worin sich „Lokal gesichert“, „Ausstehend“ und „Bestätigt“ unterscheiden, erklärt nichts. Das Vertrauensmodell ist der Kern des Produkts und bleibt unsichtbar.

**Vorschlag.** Ein kurzer Einstieg beim ersten Start oder aufklappbare Erläuterungen an den drei Stellen, an denen die Entscheidung tatsächlich fällt.

### 2.3 Der Verlauf skaliert nicht

Der Verlauf wird mit `.map` in einer `ScrollView` gezeichnet; `FlatList` kommt im Projekt nicht vor. Alle Einträge samt Vorschaubildern liegen gleichzeitig im Speicher. Suche oder Filter gibt es nicht.

**Vorschlag.** Auf `FlatList` umstellen und eine Filterung nach Status ergänzen, sobald der Verlauf über einige Dutzend Einträge hinauswachsen kann.

## 3. Robustheit

### 3.1 Der MCP-Client kennt keine Zeitgrenze

[`chainAnchors.ts`](../src/chainAnchors.ts#L30-L31) begrenzt die Bitcoin-Abfrage sauber auf zwölf Sekunden mit `AbortController`. Der Hauptpfad in [`doichain.ts`](../src/doichain.ts#L39) verwendet dagegen ein `fetch` ohne `signal`.

Bleibt die Verbindung in einem schlechten Mobilfunknetz hängen, bleibt `busy` dauerhaft gesetzt, die Schaltflächen bleiben gesperrt und die Anwendung verlässt diesen Zustand nicht mehr. Das ist die kleinste und zugleich wirksamste Korrektur in diesem Dokument.

### 3.2 Keine Fehlergrenze in der Oberfläche

Eine `ErrorBoundary` existiert nicht. Eine Ausnahme beim Zeichnen führt im Release-Build zu einer leeren Anzeige ohne Erklärung – ausgerechnet in dem Moment, in dem jemand gerade eine wichtige Aufnahme gemacht hat.

**Vorschlag.** Eine Fehlergrenze um den Bildschirm, die den Fehler benennt und ausdrücklich darauf hinweist, dass Original und Manifest bereits lokal gesichert sind.

### 3.3 Keine Rückmeldung über Abstürze

Es gibt keine Absturzberichterstattung. Nach einer Veröffentlichung bleibt unbekannt, ob und wo die App ausfällt. Eine Lösung muss zum Datenschutzversprechen passen: ohne Nutzungsverfolgung, ohne personenbezogene Daten und mit einer entsprechenden Ergänzung in [DATENSCHUTZ.md](DATENSCHUTZ.md), falls Berichte an einen Dienst gehen.

## 4. Vor der Veröffentlichung

- **Datenschutzerklärung in der App.** Weder „Datenschutz“ noch „Impressum“ oder „Kontakt“ kommen in der Oberfläche vor. Die App fordert Kamera und genauen Standort an; eine erreichbare Erklärung innerhalb der App ist üblich und senkt das Risiko einer Rückfrage bei der Prüfung. Siehe [PLAY-STORE-RELEASE.md](PLAY-STORE-RELEASE.md).
- **Startbildschirm.** `app.json` enthält keinen Splash-Abschnitt, deshalb liegt in `android/app/src/main/res/drawable-*` die Platzhaltergrafik von Expo – ein graues Raster mit Kreisen. Sie erscheint bei jedem Start vor der Oberfläche.
- **Dunkles Erscheinungsbild.** [`app.json`](../app.json#L9) kündigt `userInterfaceStyle: "automatic"` an, die Gestaltung ist jedoch durchgehend hell; `prebuild` weist zusätzlich auf das fehlende `expo-system-ui` hin. Entweder umsetzen oder die Ankündigung entfernen.
- **Totes Feld.** Der Server liefert `verify_url`, [`proofRecord.ts`](../src/proofRecord.ts#L104) schreibt es in den Verlauf, angezeigt oder geöffnet wird es nirgends; `Linking` wird nicht eingebunden.
- **iOS.** `app.json` enthält einen iOS-Abschnitt, ein natives Projekt wurde nie erzeugt und nie gebaut.
- **Durchgehende Prüfung.** Die CI prüft Typen, Tests und das JavaScript-Bündel, baut aber kein Android-Artefakt. Fehler in der nativen Konfiguration fallen damit erst von Hand auf.

## 5. Vorgeschlagene Reihenfolge

**Zuerst, klein und wirksam:** Zeitgrenze im MCP-Client, Fehlergrenze um die Oberfläche, dauerhafte Einstellungen. Drei begrenzte Änderungen, die zwei Arten von Blockaden beseitigen und die folgenreichste Bedienfalle schließen.

**Danach, als eigenständige Funktionen:** Löschen nach der Trennung aus Abschnitt 1.2 und der Export des gesamten Bestandes. Ohne diese beiden lässt sich die App für den ernsthaften Einsatz nur eingeschränkt empfehlen.

**Unmittelbar vor der Veröffentlichung:** Startbildschirm, eine Seite „Über DoiProof“ mit Version aus einer einzigen Quelle, Verweis auf die Datenschutzerklärung und Lizenz sowie die Verlagerung des rechtlichen Hinweises aus der Fußzeile dorthin.

Alle Änderungen folgen dem in [CONTRIBUTING.md](../CONTRIBUTING.md) festgelegten Ablauf; Änderungen am Manifest, an der Verankerung oder am Export ziehen die betroffenen Abschnitte der Dokumentation im selben Pull Request nach.
