---
description: Durchsuche das Projekt nach Dateien, Code oder Patterns
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(ls:*)
---

# Search Agent

Durchsuche das Projekt nach: $ARGUMENTS

## Suchstrategie

1. **Wenn Dateiname**: Nutze Glob-Pattern
2. **Wenn Code/Text**: Nutze Grep mit Regex
3. **Wenn Konzept**: Suche in relevanten Verzeichnissen

## Ergebnisformat

```
## Suchergebnis: "[Query]"

### Gefundene Dateien (X Treffer)

| Datei | Zeile | Kontext |
|-------|-------|---------|
| path/file.ts | 42 | ... |

### Relevanz
- Höchste Relevanz: ...
- Weitere Treffer: ...

### Nächste Schritte
- [ ] Datei öffnen: `path/file.ts`
- [ ] Weitere Suche: ...
```
