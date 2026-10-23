# Sicherheitsrichtlinie

## Unterstützte Version

Unterstützt wird Version 1.0.x (App, Kommandozeilen-Prüfer, Windows-Prüfer). Sicherheitskorrekturen werden auf dem aktuellen Stand von `main` gepflegt und als Patch-Version bzw. EAS Update verteilt.

## Meldung einer Schwachstelle

Bitte veröffentliche keine Schlüssel, personenbezogenen Daten oder unmittelbar ausnutzbaren Details in einem öffentlichen Issue. Nutze stattdessen die private Sicherheitsmeldung des GitHub-Repositories, sofern sie aktiviert ist, oder kontaktiere den Repository-Eigentümer über einen bereits vereinbarten vertraulichen Kanal.

Eine Meldung sollte enthalten:

- betroffene Version oder Commit,
- reproduzierbare Schritte,
- erwartete und tatsächliche Auswirkung,
- mögliche Abhilfe, sofern bekannt.

## Geheimnisse

Admin-, PoE- und Write-Schlüssel, Expo-Tokens, Android-Keystores, Apple-Zertifikate und App-Store-Connect-Schlüssel gehören niemals in Quellcode, Commits, Screenshots, Issues oder App-Builds. Das Repository ist öffentlich. Signaturdaten verwaltet EAS; das Token für GitHub Actions liegt als Secret `EXPO_TOKEN`. Lokale Konfigurationsdateien `.env*` sowie gängige Schlüssel- und Signaturdateien werden ignoriert; ein automatischer Test prüft das zusätzlich. Echte Fotos, Beweispakete oder Standorte nicht in Issues hochladen.

## Prüfen fremder Pakete

Die Prüfprogramme begrenzen die tatsächlich entpackte Datenmenge (ZIP 200 MiB, Foto 150 MiB, JSON je 1 MiB) und weisen unerwartete ZIP-Einträge ab. Meldungen zu Umgehungen dieser Grenzen bitte vertraulich.
