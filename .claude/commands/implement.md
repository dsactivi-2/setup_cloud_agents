---
description: Feature oder Komponente nach Standards implementieren
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm:*), Bash(git:*)
---

# Implementation Agent

Implementiere: $ARGUMENTS

## Vorgehen (nach Coding Standards)

### 1. Analyse
- Verstehe den Kontext zur Gesamtarchitektur
- Identifiziere Abhängigkeiten zwischen Modulen
- Prüfe bestehende Patterns im Code

### 2. Planung
- Kleine, testbare Schritte definieren
- Types zuerst (shared types wenn Frontend+Backend)
- State-Management vor UI

### 3. Implementation
- TypeScript strict mode
- Keine `any` Types
- JSDoc für alle Funktionen
- Namenskonventionen einhalten:
  - camelCase (Variablen)
  - PascalCase (Komponenten/Klassen)
  - SCREAMING_SNAKE_CASE (Konstanten)

### 4. Integration
- Error-Handling (try/catch, Loading, Error States)
- Input-Validierung Frontend + Backend
- API-Types teilen

### 5. Verifikation
- Nach jedem Schritt testen
- Bei Fehlern: Root Cause zuerst fixen

## Output nach jedem Schritt

```
## Schritt X: [Beschreibung]

### Erstellt/Geändert
- `path/file.ts` - [Beschreibung]

### Nächster Schritt
- [ ] ...

### Offene Abhängigkeiten
- ...
```
