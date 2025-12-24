---
description: Status aller Cloud Agents und STOP-Score anzeigen
allowed-tools: Read, Grep, Glob, Bash(git:*)
---

# Agent Status Report

Zeige Status für: $ARGUMENTS (oder alle Agents)

## Prüfungen

### 1. Agent-Konfiguration
- Supervisor-Hierarchie intakt?
- STOP-Score Berechnung aktiv?
- Evidence-Logging aktiviert?

### 2. Aktive Sessions
- Laufende Aufträge
- Pending Approvals
- STOP_REQUIRED Events

### 3. Performance
- Durchschnittlicher STOP-Score
- Erfolgsrate
- Letzte Aktivität

## Output Format

```
## Cloud Agents Status

### Supervisor-Hierarchie
✅ META_SUPERVISOR - Online
✅ ENGINEERING_LEAD - Online
✅ CLOUD_ASSISTANT - Online

### Aktive Sessions
| Agent | Auftrag | Status | STOP-Score |
|-------|---------|--------|------------|
| ... | ... | ... | X/100 |

### Alerts
⚠️ [Warnung wenn Score > 40]
🛑 [STOP wenn Score > 70]

### Statistiken
- Sessions heute: X
- Durchschn. STOP-Score: X
- STOP_REQUIRED Events: X
```
