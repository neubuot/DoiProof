# Sicherheitsrichtlinie

## Unterstützte Version

Das Projekt befindet sich im MVP-Stadium. Sicherheitskorrekturen werden auf dem aktuellen Stand von `main` gepflegt.

## Meldung einer Schwachstelle

Bitte veröffentliche keine Schlüssel, personenbezogenen Daten oder unmittelbar ausnutzbaren Details in einem öffentlichen Issue. Nutze stattdessen die private Sicherheitsmeldung des GitHub-Repositories, sofern sie aktiviert ist, oder kontaktiere den Repository-Eigentümer über einen bereits vereinbarten vertraulichen Kanal.

Eine Meldung sollte enthalten:

- betroffene Version oder Commit,
- reproduzierbare Schritte,
- erwartete und tatsächliche Auswirkung,
- mögliche Abhilfe, sofern bekannt.

## Geheimnisse

Admin-, PoE- und Write-Schlüssel gehören niemals in Quellcode, Commits, Screenshots, Issues oder App-Builds. Lokale Konfigurationsdateien `.env*` werden ignoriert; eine spätere Produktionsarchitektur muss sensible Schlüssel serverseitig verwalten.
