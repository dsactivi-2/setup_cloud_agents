# Code Cloud Agents - Rules

## Sprache
- Antworte immer auf **Deutsch**
- Code-Kommentare auf **Englisch**

---

## Coding Standards

### TypeScript
- TypeScript verwenden, strikte Typisierung (`strict: true`)
- **Keine `any` Types** – immer explizite Typen definieren
- Modulare Architektur mit klaren Schnittstellen

### Namenskonventionen
| Element | Convention | Beispiel |
|---------|------------|----------|
| Variablen | camelCase | `userName`, `isLoading` |
| Komponenten/Klassen | PascalCase | `AgentCard`, `FileSearchService` |
| Konstanten | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |

### Dokumentation
- Jede Funktion/Komponente mit **JSDoc** dokumentieren
```typescript
/**
 * Searches files on disk based on query
 * @param query - Natural language search query
 * @param options - Search configuration options
 * @returns Array of matching file paths
 */
```

---

## Frontend-Backend-Integration

1. **API-Endpunkte** immer explizit mit Frontend-Komponenten verknüpfen
2. **Login/Auth**: Backend-Route UND Frontend-Handler gemeinsam implementieren
3. **State-Management** vor UI-Komponenten entwickeln
4. **Error-Handling** für ALLE API-Aufrufe:
   - try/catch
   - Loading-States
   - Error-States
5. **API-Response-Types** zwischen Frontend und Backend teilen (`/src/shared/types/`)

---

## Entwicklungsprozess

1. Code in **kleinen, testbaren Schritten** generieren
2. Nach jedem Schritt: **Funktionalität verifizieren** bevor weiter
3. Bei Fehlern: **Exakte Error-Message analysieren**, Root Cause zuerst fixen
4. **Keine isolierten Snippets** – immer Kontext zur Gesamtarchitektur beachten
5. **Abhängigkeiten** zwischen Modulen explizit benennen

---

## Sicherheit

- [ ] Input-Validierung auf Frontend **UND** Backend
- [ ] XSS/SQL-Injection Prevention beachten
- [ ] Secrets **niemals** im Code hardcoden – Environment Variables nutzen
- [ ] Authentication/Authorization bei **jedem** Endpoint prüfen

### Verbotene Dateien
```
.env
.env.local
secrets/
credentials/
*.pem
*.key
```

---

## Code-Qualität

### DRY-Prinzip
Wiederholungen vermeiden, in Funktionen auslagern

### Single Responsibility
Eine Funktion = eine Aufgabe

### Früh returnen
```typescript
// Gut ✅
function process(data: Data | null): Result {
  if (!data) return null;
  if (!data.isValid) return { error: 'Invalid' };

  return processData(data);
}

// Schlecht ❌
function process(data: Data | null): Result {
  if (data) {
    if (data.isValid) {
      return processData(data);
    } else {
      return { error: 'Invalid' };
    }
  }
  return null;
}
```

### Aussagekräftige Namen
```typescript
// Gut ✅
const isUserAuthenticated = checkAuth(user);
const fetchUserProfile = async (userId: string) => { ... };

// Schlecht ❌
const x = check(u);
const getData = async (id) => { ... };
```

---

## Supervisor-System (Cloud Agents)

### Hierarchie
```
META_SUPERVISOR (Routing + Monitoring)
    ↓
ENGINEERING_LEAD_SUPERVISOR (Plan + Delegate + Verify + STOP)
    ↓
CLOUD_ASSISTANT (Execute + Report + Evidence)
```

### Kernprinzipien
1. **Evidence-Based Verification**: Keine Behauptung ohne Beweis
2. **STOP is Success**: Bei Risiko ist STOP die richtige Entscheidung
3. **Cross-Layer Consistency**: Frontend ↔ Backend ↔ Database Alignment

### STOP-Score (0-100)
| Score | Risk Level | Aktion |
|-------|------------|--------|
| 0-19 | LOW | Weiter |
| 20-44 | MEDIUM | Review |
| 45-69 | HIGH | Approval nötig |
| 70-100 | CRITICAL | **STOP_REQUIRED** |

---

## AI-Provider Integration

### Priorität
1. **Cloud AI** (wenn Internet verfügbar):
   - Claude (Anthropic)
   - GPT-4 (OpenAI)
   - Grok (xAI)

2. **Lokale AI** (offline Fallback):
   - Ollama (Llama, Mistral)
   - LM Studio

### API-Key Konfiguration
```bash
# .env.local (niemals committen!)
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...
```
