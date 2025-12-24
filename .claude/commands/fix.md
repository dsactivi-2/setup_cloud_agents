---
description: Fehler analysieren und beheben (Root Cause First)
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm:*), Bash(tsc:*), Bash(git:*)
---

# Fix Agent

Analysiere und behebe: $ARGUMENTS

## Vorgehen (Root Cause First)

### 1. Error-Analyse
- Exakte Error-Message lesen
- Stack Trace analysieren
- Betroffene Dateien identifizieren

### 2. Root Cause finden
- Nicht Symptome fixen, sondern Ursache
- Abhängigkeiten prüfen
- Kontext zur Gesamtarchitektur beachten

### 3. Fix implementieren
- Kleinster möglicher Fix
- TypeScript-konform
- Keine neuen `any` Types

### 4. Verifikation
- Fehler reproduzieren
- Fix testen
- Keine Regression

## Output Format

```
## Fehler-Analyse

**Error**: [Exakte Message]
**Datei**: [path/file.ts:line]
**Root Cause**: [Beschreibung]

### Fix

```typescript
// Vorher
...

// Nachher
...
```

### Verifikation
- [ ] Fehler behoben
- [ ] Keine Regression
- [ ] Types korrekt
```
