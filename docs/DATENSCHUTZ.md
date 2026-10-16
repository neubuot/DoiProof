# Datenschutzerklärung für die DoiProof-App

Stand: 16. Oktober 2026 · gültig für DoiProof Android `org.doichain.doiproof`, Version 0.5.0

> **Vor der Veröffentlichung auszufüllen:** Google Play verlangt einen benannten Verantwortlichen mit Kontaktmöglichkeit. Die folgenden Platzhalter müssen durch die tatsächlichen Angaben ersetzt werden, bevor diese Seite als Datenschutz-URL im Play-Console-Eintrag hinterlegt wird.

**Verantwortlich:** `<Name bzw. Firma>`, `<Anschrift>`
**Kontakt:** `<E-Mail-Adresse>`

## Kurzfassung

DoiProof lädt **keine Fotos** hoch. Der Nachweis entsteht lokal auf dem Gerät. An den Doichain-MCP-Server unter `https://doi-api.sendlabs.de/mcp` werden ausschließlich übertragen:

- der SHA-256-Hash der ausgewählten Dateibytes;
- optional eine ausdrücklich als Geräteangabe gekennzeichnete Aufnahmezeit als Notiz;
- technisch unvermeidbar die IP-Adresse der Verbindung;
- optional ein selbst eingegebener API-Schlüssel, sofern die Nutzerin oder der Nutzer einen eigenen PoE- oder Write-Schlüssel verwendet.

Foto, Standort, Bilddaten und Geräteangaben verlassen das Gerät durch die App nicht. Sie werden nur lokal gespeichert und nur dann weitergegeben, wenn ein ZIP-Beweispaket oder ein PDF-Beleg bewusst über den Teilen-Dialog des Betriebssystems versendet wird.

## Welche Daten die App auf dem Gerät verarbeitet

| Daten | Zweck | Speicherort |
|---|---|---|
| Originalfoto | Grundlage des Hashes und des ZIP-Beweispakets | privates App-Verzeichnis auf dem Gerät |
| Manifest mit Aufnahmezeit und gewähltem Profil | Bindung der Angaben an den Hash | privates App-Verzeichnis |
| Optional GPS-Position, Höhe, Genauigkeit, Richtung, Geschwindigkeit | nur im Profil „Standortnachweis“ oder „Individuell“ und nur nach Systemfreigabe; wird kryptografisch an den Nachweis gebunden | privates App-Verzeichnis |
| Optional Bilddaten und Geräteangaben (Modell, Betriebssystemversion, App-Version) | Nachvollziehbarkeit des Nachweises | privates App-Verzeichnis |
| Nachweisverlauf mit Hash, Status, Transaktions- und Blockdaten | Anzeige und erneute Statusabfrage | privates App-Verzeichnis |
| Optional eingegebener API-Schlüssel | Verankerung mit eigenem Schlüssel | nur im Arbeitsspeicher der laufenden Sitzung, nicht dauerhaft gespeichert |

Im Profil „Privat“ fordert die App **keinen Standort** an.

## Welche Daten die App überträgt

**An den Doichain-MCP-Server** (`doi-api.sendlabs.de`), betrieben von `<Betreiber des MCP-Servers>`:

- `anchor_proof`: SHA-256-Hash und die oben genannte Notiz;
- `check_proof`, `get_transaction`, `get_block`, `get_chain_status`: Hash beziehungsweise Transaktions- und Blockkennungen zur Statusabfrage;
- `get_anchoring_quota`: Abfrage des kostenlosen Tageskontingents. Der Server zählt dieses Kontingent je IP-Adresse und UTC-Tag.

Die Übertragung erfolgt über HTTPS.

**Auf die öffentliche Doichain-Blockchain:** Der SHA-256-Hash und die Notiz werden Teil einer Transaktion in einer öffentlichen, dauerhaft einsehbaren Blockchain. Diese Daten sind danach **weltweit abrufbar und können nicht gelöscht oder widerrufen werden.** Ein Hash lässt für sich allein keinen Rückschluss auf den Bildinhalt zu; wer dieselbe Datei besitzt, kann die Übereinstimmung jedoch nachweisen. Die Notiz enthält im Standardfall den Text `DoiProof v2` und, sofern eine Kameraaufnahme vorlag, den vom Gerät gemeldeten Aufnahmezeitpunkt.

**Keine weiteren Übertragungen:** Die App enthält keine Werbung, kein Analyse- oder Tracking-SDK, keine Absturzberichterstattung an Dritte und kein Nutzerkonto.

## Berechtigungen

| Berechtigung | Wofür |
|---|---|
| Kamera | Aufnahme eines Fotos für einen Nachweis |
| Zugriff auf ein ausgewähltes Bild | Hashberechnung für ein bereits vorhandenes Foto |
| Standort (genau und ungefähr, nur bei aktiver Nutzung) | nur in den Profilen mit Standortnachweis; die Position wird lokal in das Manifest geschrieben und nicht an den Server gesendet |

Alle Berechtigungen können in den Android-Einstellungen jederzeit entzogen werden. Ohne Standortfreigabe bleiben Kameraaufnahme, Hashberechnung und Verankerung nutzbar.

## Löschung

Lokale Daten werden gelöscht, indem einzelne Nachweise in der App entfernt, die App-Daten in den Android-Einstellungen gelöscht oder die App deinstalliert wird. Bereits in der Blockchain verankerte Hashes **können nicht gelöscht werden**; das ist der Zweck einer Verankerung. Wer dies nicht möchte, darf einen Nachweis nicht einreichen: Ein Foto kann in DoiProof lokal gesichert werden, ohne gesendet zu werden.

## Rechtsgrundlagen (DSGVO)

Die Verarbeitung auf dem Gerät und die Übertragung des Hashes erfolgen zur Erfüllung der ausdrücklich angeforderten Funktion (Art. 6 Abs. 1 lit. b DSGVO) beziehungsweise auf Grundlage der erteilten Einwilligung bei optionalen Metadaten und Standortdaten (Art. 6 Abs. 1 lit. a DSGVO). Betroffenenrechte nach Art. 15 bis 21 DSGVO können über die oben genannte Kontaktadresse geltend gemacht werden; für bereits verankerte Hashes ist eine Löschung technisch ausgeschlossen.

## Kinder

Die App richtet sich nicht an Kinder und erhebt keine Daten in der Absicht, Kinder anzusprechen.

## Änderungen

Änderungen dieser Erklärung werden in diesem Dokument und im Git-Verlauf des Projekts nachvollziehbar festgehalten.
