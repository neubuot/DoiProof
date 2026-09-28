# DoiProof: Kurzanleitung

**Gilt für Version 0.5 (29. September 2026).** Die neuen BTC-/Doichain-Vorabblöcke sind noch nicht auf einem Mobilgerät getestet. Für Hintergründe und Grenzen siehe [Produktbeschreibung und Beweiskette](PRODUKT-UND-BEWEISKETTE.md).

## In wenigen Schritten zum Nachweis

1. **Vorbereiten:** App öffnen, Internetverbindung prüfen und unter „Metadatenprofil“ wählen: „Privat“ ohne angeforderten Standort, „Standortnachweis“ mit Standort und weiteren Angaben oder „Individuell“ mit einzeln einstellbaren Angaben. Die Freigabe für Kamera und bei Bedarf Standort erteilen. Das Tageskontingent bei Bedarf mit „Kontingent aktualisieren“ ansehen.
2. **Aufnehmen:** Für ein neues Foto „BTC- und Doichain-Block vor Kameraaufnahme“ eingeschaltet lassen (Standardeinstellung), dann „Foto aufnehmen“ wählen. Die App fragt beide Blockstände **vor dem Öffnen der Kamera** ab. Misslingt die Abfrage, erneut versuchen oder den Schalter bewusst ausschalten. Bei „Foto wählen“ aus der Mediathek gibt es keine Vorabblöcke.
3. **Einreichen:** „Nach Aufnahme sofort senden“ ist standardmäßig eingeschaltet und gilt auch nach Auswahl eines vorhandenen Fotos. Wenn ausgeschaltet, das angezeigte Foto und die Hashwerte ansehen und „Nachweis anlegen“ drücken. Original und Manifest werden bereits vor dem Senden lokal gesichert. Ohne bestätigten Block gibt es noch keinen Kettennachweis; ein Entwurf lässt sich im Verlauf mit „Jetzt senden“ einreichen.
4. **Bestätigung abwarten:** `pending` heißt eingereicht, aber noch nicht in einem Block bestätigt. Später im „Nachweisverlauf“ auf „Offene prüfen“ tippen; die App prüft ausstehende Einträge außerdem beim Start, bei Rückkehr und während der Nutzung. Erst `confirmed` (gegebenenfalls später `expired`) verweist auf einen bestätigten Ketteneintrag.
5. **Sichern und übergeben:** Im Verlauf „Beweispaket ZIP“ wählen und in einem eigenen, gesicherten Speicher ablegen. Das ZIP enthält die Bilddatei und alle Metadaten. „PDF-Beleg“ ist eine lesbare Übersicht und kann über den Systemdialog geteilt oder gedruckt werden; er ersetzt das ZIP nicht. Für eine Prüfung beide zusammen mit weiteren Unterlagen übergeben.

**Wichtig:** Die App speichert die ausgewählte Datei vor der Einreichung in ihrem privaten Bereich; das Foto wird dadurch nicht automatisch in der Handygalerie gesichert. Bewahre das exportierte ZIP mit einer weiteren Sicherung auf. Ein abgebrochener Systemdialog ist kein Nachweis einer erfolgreichen Weitergabe. Die Vorabblöcke, Gerätezeit, Standortmessung und App-Versionsangabe sind Indizien mit unterschiedlichen Grenzen; sie belegen weder die Wahrheit des Bildinhalts noch eine exakte Auslösezeit.

## Häufige Fälle

- **Unfall:** Übersicht und Details aus mehreren Winkeln aufnehmen; Bericht, Zeugen und sonstige Unterlagen zusätzlich bewahren. Bei mehreren Nachweisen auf das Kontingent achten.
- **Inventar:** Gegenstand, Kennzeichnung/Signatur und Umgebung fotografieren; Rechnungen, Bewertungen und Versicherungspapiere ergänzen.
- **Arbeitsergebnis:** Vorher/Nachher und sichtbares Ergebnis aufnehmen; Auftrag und Abnahme gesondert dokumentieren.
- **Kein Blockabruf:** Erneut bei funktionierender Internetverbindung versuchen. Wird der Vorabmodus ausgeschaltet, enthält dieses Paket keine Vorabblöcke.
- **Kein ZIP im Verlauf:** Neue lokale Entwürfe können bereits ein ZIP exportieren; bei älteren Einträgen kann ein vollständiges Paket fehlen. Bei fehlender lokaler Bilddatei ist kein vollständiger Export möglich.

Die ausführliche Bedienung, Statusbegriffe und Verifikation stehen im [Benutzerhandbuch](BENUTZERHANDBUCH.md).
