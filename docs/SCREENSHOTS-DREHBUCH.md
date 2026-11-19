# Drehbuch für die Store-Screenshots

Schritt für Schritt am iPhone. Was in welcher Reihenfolge aufgenommen wird, was im Bild stehen muss und was nie hineingehört. Die Vorgaben zu Maßen und Formaten stehen in [APP-STORE.md, Abschnitt 7](APP-STORE.md#7-screenshots); dieses Drehbuch beschreibt nur den Ablauf am Gerät.

Umrechnen auf das verlangte Maß ist nicht deine Aufgabe: Nimm alles in der Auflösung deines Geräts auf, unbeschnitten.

## 1. Vorbereitung, einmalig

| Einstellung | Wo | Warum |
|---|---|---|
| **Nicht stören** ein | Kontrollzentrum | Keine fremden Namen in der Statusleiste |
| **Ortungsdienste → Kamera: Nie** | Einstellungen → Datenschutz & Sicherheit | Sonst steht der Aufnahmeort im Originalfoto der Test-ZIPs |
| **Akku laden** | — | Der Ladestand ist auf jedem Bild zu sehen |
| Profil **„Privat"** | in der App, Bereich „Aufnehmen" | Keine Koordinaten und Sensorwerte im Bild |

Screenshot am iPhone: **Seitentaste und Lauter gleichzeitig**. Nie zuschneiden, nie drehen, nie durch eine andere App exportieren — jeder Zuschnitt macht das Bild für App Store Connect unbrauchbar.

## 2. Motiv für die Testaufnahme

Ein **gewöhnlicher Gegenstand** auf einer ruhigen Fläche: Schlüsselbund, Tasse, Buch, Werkzeug, Pflanze.

Nicht geeignet, jeweils mit Grund:

- **Bildschirme** – Fenster, Lesezeichen, Tabtitel und Dateinamen landen mitlesbar im öffentlichen Store.
- **Logos von Google Play oder Android**, auch klein und unscharf – App Review Richtlinie 2.3.10 untersagt Verweise auf andere Plattformen in den Materialien einer Version.
- **Personen, Kennzeichen, Dokumente, Briefköpfe.**
- **Aufnahmen an der eigenen Wohnadresse**, erkennbar an Haus, Straße oder Umgebung.

Zwei bis drei Testnachweise genügen. Jede Einreichung steht dauerhaft und öffentlich auf der Doichain.

## 3. Die Aufnahmen

Die Nummern sind die spätere Reihenfolge im Store. Die ersten drei erscheinen in der Suche, ohne dass jemand wischt.

### Aufnahme 1 – Einstieg

Bereich **„Aufnehmen"**, ganz nach oben scrollen.

Im Bild: Überschrift „Dein Foto. Dein Nachweis.", das Metadatenprofil mit ausgewähltem **„Privat"**, die Schaltflächen „Foto aufnehmen" und „Foto wählen".

### Aufnahme 2 – unmittelbar nach der Aufnahme

Testfoto mit der Kamera der App aufnehmen. Danach so scrollen, dass gleichzeitig sichtbar sind: **Vorschaubild**, die drei Hashwerte (Originalfoto, Manifest, Beweispaket) und die **Vorab-Blöcke** von Bitcoin und Doichain.

Das ist das inhaltlich wichtigste Bild: Es zeigt, was die App tatsächlich tut.

### Aufnahme 3 – Nachweisverlauf mit Bestätigung

**Erst möglich, wenn der Nachweis „Bestätigt" zeigt.** Nach der Einreichung dauert das in der Regel 10 bis 30 Minuten. Solange dort „Ausstehend" steht, ist dieses Bild nicht aufnehmbar, und ein nachgestelltes käme nicht infrage: Materialien einer Version müssen den tatsächlichen Zustand zeigen.

Im Bild: Eintrag mit Status **„Bestätigt"** und die Schaltflächen „Prüfbericht PDF" und „Beweispaket ZIP".

Bleibt der Status über Stunden „Ausstehend", ist das kein Screenshot-Problem, sondern eines der Einreichung — dann erst dem nachgehen.

### Aufnahme 4 – Ergebnis einer Prüfung

Vorbereitung: Beim bestätigten Nachweis **„Beweispaket ZIP"** exportieren. Dann Bereich **„Prüfen"** → „ZIP-Beweispaket importieren" → dieses ZIP wählen → **„Kettenstatus online abgleichen"** eingeschaltet lassen → **„Paket prüfen"**.

Nach dem Ergebnis **nach unten scrollen**, bis das Ergebnisbanner oben aus dem Bild gewandert ist.

Im Bild: **„Auf einen Blick"** und **„Beweiskette"**.

Warum ohne Banner: Der Begleittext des bestandenen Banners enthält „fälschungssicher". Das verspricht mehr als die Store-Beschreibung, und ein Widerspruch zwischen Bild und Text fällt bei der Prüfung auf. Solange die Formulierung in der App steht, bleibt das Banner außerhalb des Bildes — ebenso der PDF-Bericht, der dasselbe Banner oben trägt.

### Aufnahme 5 – Über diese App

Über das Menü **⋮** → „Über diese App". Vollbild, ohne Zuschnitt.

Im Bild: Version, Update-Kanal, Laufzeitversion, die Verweise auf Datenschutzerklärung und Impressum.

## 4. Was nie ins Bild darf

- Geräterahmen, Werbeaufschriften, Versprechen, die über die Beschreibung hinausgehen
- Koordinaten, Adressen, Kartenausschnitte
- das Wort „fälschungssicher" und das Ergebnisbanner einer bestandenen Prüfung
- Hinweise auf Google Play, Android oder andere Plattformen
- fremde Namen in Benachrichtigungen

## 5. Übergabe

Alle Aufnahmen bleiben auf dem Gerät, in voller Auflösung. Gerät anschließen und Bescheid geben; Umrechnen auf 1290 × 2796, Entfernen des Alphakanals und die Benennung in der Reihenfolge oben geschehen danach am Rechner.

Screenshots mit Testdaten gehören **nicht** ins Repository. Ein Test prüft das nicht; darauf ist beim Ablegen selbst zu achten.
