---
description: Code Review mit STOP-Score durchführen
allowed-tools: Read, Grep, Glob, Bash(git:*)
---

# Code Review Auftrag

Führe ein Code Review durch für: $ARGUMENTS

## Prüfe folgende Aspekte:

### 1. TypeScript Standards
- [ ] Strikte Typisierung (keine `any`)
- [ ] Korrekte Namenskonventionen
- [ ] JSDoc Dokumentation vorhanden

### 2. Sicherheit
- [ ] Input-Validierung
- [ ] Keine hardgecodeten Secrets
- [ ] XSS/Injection Prevention

### 3. Code-Qualität
- [ ] DRY-Prinzip eingehalten
- [ ] Single Responsibility
- [ ] Aussagekräftige Namen

### 4. Integration
- [ ] API-Types geteilt
- [ ] Error-Handling vollständig
- [ ] State vor UI

## Output Format

```
## Review: [Datei/Bereich]

**STOP-Score**: X/100 ([LOW|MEDIUM|HIGH|CRITICAL])

### Findings
1. ...
2. ...

### Empfehlungen
1. ...

### Approval Status
- [ ] Approved
- [ ] Changes Required
- [ ] STOP_REQUIRED
```
