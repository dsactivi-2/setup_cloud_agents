# System Architecture Overview

## Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                       META SUPERVISOR                            │
│            (Routing + Monitoring + Aggregation)                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                ENGINEERING LEAD SUPERVISOR                       │
│              (Plan + Delegate + Verify + STOP)                   │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │   STOP     │  │  Artefact  │  │   Cross-   │  │   Risk    │  │
│  │  Scorer    │  │  Verifier  │  │   Layer    │  │  Assessor │  │
│  │            │  │            │  │   Check    │  │           │  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUD ASSISTANT                              │
│              (Execute + Report + Evidence)                       │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │   Code     │  │   Config   │  │   Test     │  │  Evidence │  │
│  │  Writer    │  │  Manager   │  │   Runner   │  │ Collector │  │
│  │            │  │            │  │            │  │           │  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Task Submission** → API receives task
2. **Routing** → Meta Supervisor routes to appropriate system
3. **Planning** → Engineering Lead plans execution
4. **Execution** → Cloud Assistant executes with evidence
5. **Verification** → Engineering Lead verifies artefacts
6. **Decision** → APPROVED or STOP_REQUIRED
7. **Audit** → Decision logged for review

## Key Principles

### 1. Evidence-Based Verification
- No claim accepted without proof
- Every artefact must be verifiable
- File paths, test outputs, configs required

### 2. STOP is Success
- When truth or safety at risk, STOP is correct
- STOP decisions are never overridden by lower layers
- Escalation path: Assistant → Lead → Meta → Human

### 3. Cross-Layer Consistency
- Frontend ↔ Backend alignment required
- Backend ↔ Database schema match
- Claims ↔ Artefacts correspondence

## Component Details

### Meta Supervisor
- Routes tasks to systems
- Monitors health metrics
- Aggregates costs and outcomes
- Does NOT make business decisions

### Engineering Lead Supervisor
- Plans implementation approach
- Delegates to Cloud Assistant
- Verifies completed work
- Makes APPROVE/STOP decisions

### Cloud Assistant
- Executes code changes
- Collects evidence
- Reports status honestly
- Never declares "done" without proof

## Integration Points

All integrations are **STUBS** until explicitly approved:

| Integration | Status | Notes |
|-------------|--------|-------|
| WhatsApp | STUB | Requires approval |
| Voice | STUB | Requires approval |
| Google | STUB | OAuth not configured |
| iCloud | STUB | Requires approval |
| Pinecone | STUB | Vector DB not connected |

## Database Schema

```sql
-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  assignee TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  stop_score INTEGER
);

-- Audit entries table
CREATE TABLE audit_entries (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  decision TEXT NOT NULL,
  final_status TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  stop_score INTEGER NOT NULL,
  verified_artefacts TEXT NOT NULL,
  missing_invalid_parts TEXT NOT NULL,
  required_next_action TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/health/ready` | GET | Readiness probe |
| `/health/live` | GET | Liveness probe |
| `/api/tasks` | GET | List tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks/:id` | GET | Get task |
| `/api/audit` | GET | List audit entries |
| `/api/audit/:id` | GET | Get audit entry |
| `/api/audit/stats/stop-scores` | GET | Stop score statistics |
