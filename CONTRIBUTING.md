# Mitwirken

## Entwicklungsumgebung

Voraussetzungen: aktuelle Node.js-LTS-Version, npm und Expo Go.

```sh
npm ci
npm run check
npm start
```

## Git-Workflow

1. `main` bleibt jederzeit in einem überprüfbaren Zustand.
2. Änderungen erfolgen auf kurzen, sprechend benannten Branches wie `feat/history` oder `fix/quota-message`.
3. Commits verwenden möglichst Conventional-Commit-Präfixe: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
4. Änderungen werden per Pull Request mit Beschreibung, Testnachweis und Sicherheitsauswirkungen eingebracht.
5. Vor dem Merge müssen TypeScript-Prüfung und CI erfolgreich sein.
6. Bevorzugte Merge-Methode ist Squash Merge, damit `main` übersichtlich bleibt.

## Pull-Request-Checkliste

- [ ] Änderung ist auf den beschriebenen Zweck begrenzt.
- [ ] `npm run check` ist erfolgreich.
- [ ] Android und – sofern betroffen – iOS wurden berücksichtigt.
- [ ] Keine Schlüssel, Tokens, personenbezogenen Daten oder `.env`-Dateien eingecheckt.
- [ ] README oder Architektur-Dokumentation wurden bei Verhaltensänderungen aktualisiert.
- [ ] Neue Berechtigungen und öffentlich gespeicherte Daten sind erklärt.

## Sicherheit

Sicherheitslücken bitte nicht als öffentliches Issue mit verwertbaren Details melden. Siehe [SECURITY.md](SECURITY.md).
