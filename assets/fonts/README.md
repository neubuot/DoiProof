# Schriften für den PDF-Prüfbericht

Der Prüfbericht bettet diese Schriften ein. Sie werden beim Erzeugen lokal geladen; es gibt keinen Netzwerkzugriff. Alle Schriften stehen unter der [SIL Open Font License 1.1](https://openfontlicense.org/).

| Datei | Herkunft | Bearbeitung |
|---|---|---|
| `Fraunces-SemiBold.ttf` | Fraunces (The Fraunces Project Authors), npm `@fontsource-variable/fraunces` 5.3.0 | Statische Instanz der variablen Schrift (opsz 24, wght 600, SOFT 0, WONK 0), auf lateinische Zeichen reduziert, Namen auf „Fraunces SemiBold“ gesetzt |
| `Fraunces-Italic.ttf` | wie oben, kursiv | Statische Instanz (opsz 24, wght 450, SOFT 0, WONK 1), auf lateinische Zeichen reduziert, Namen auf „Fraunces Italic“ gesetzt |
| `IBMPlexSans-Regular.ttf`, `IBMPlexSans-SemiBold.ttf` | IBM Plex Sans 3.005 (IBM Corp.), npm `@ibm/plex-sans` 1.1.0 | unverändert, nur vom WOFF- in den TTF-Container umgepackt |
| `IBMPlexMono-Regular.ttf`, `IBMPlexMono-Medium.ttf` | IBM Plex Mono 2.005 (IBM Corp.), npm `@ibm/plex-mono` 2.5.0 | unverändert, nur vom WOFF- in den TTF-Container umgepackt |

Lizenztexte: [LICENSE-Fraunces.txt](LICENSE-Fraunces.txt) und [LICENSE-IBM-Plex.txt](LICENSE-IBM-Plex.txt). IBM Plex trägt den reservierten Schriftnamen „Plex“; deshalb werden diese Dateien nicht verändert. Im PDF wird jeweils nur die benötigte Zeichenteilmenge eingebettet.
