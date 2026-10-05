# Mitwirken

## Entwicklungsumgebung

Voraussetzungen: aktuelle Node.js-LTS-Version, npm und Expo Go.

```sh
npm ci
npm run check
npm test
npm start
```

Für den Windows-Prüfer zusätzlich `cd desktop && npm ci && npm test`. Der Prüf- und Berichtskern liegt in `core/` und muss ohne Node-spezifische APIs auskommen, weil die App ihn unter Hermes ausführt (Node-Adapter nur in `core/node.mjs`).

## Git-Workflow

1. `main` bleibt jederzeit in einem überprüfbaren Zustand.
2. Änderungen erfolgen auf kurzen, sprechend benannten Branches wie `feat/history` oder `fix/quota-message`.
3. Commits verwenden möglichst Conventional-Commit-Präfixe: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
4. Änderungen werden per Pull Request mit Beschreibung, Testnachweis und Sicherheitsauswirkungen eingebracht.
5. Vor dem Merge müssen TypeScript-Prüfung und CI erfolgreich sein.
6. Bevorzugte Merge-Methode ist Squash Merge, damit `main` übersichtlich bleibt.

## Pull-Request-Checkliste

- [ ] Änderung ist auf den beschriebenen Zweck begrenzt.
- [ ] `npm run check` und `npm test` sind erfolgreich (bei Desktop-Änderungen auch `desktop/npm test`).
- [ ] Android und – sofern betroffen – iOS wurden berücksichtigt.
- [ ] Keine Schlüssel, Tokens, Signaturdateien, echten Fotos, Standorte oder `.env`-Dateien eingecheckt (das Repository ist öffentlich).
- [ ] README, Benutzerhandbuch oder Architektur-Dokumentation wurden bei Verhaltensänderungen aktualisiert; Versionsnummern in `package.json`, `app.json`, `desktop/package.json` und `core/version.mjs` stimmen überein.
- [ ] Neue Berechtigungen und öffentlich gespeicherte Daten sind erklärt.

## Sicherheit

Sicherheitslücken bitte nicht als öffentliches Issue mit verwertbaren Details melden. Siehe [SECURITY.md](SECURITY.md).
