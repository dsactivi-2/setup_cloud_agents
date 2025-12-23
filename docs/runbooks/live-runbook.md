# Live Runbook (Incident / Failure)

## Golden Rule

**STOP is success when safety or truth is at risk.**

## Triggers → Actions

| Trigger | Action |
|---------|--------|
| Pricing/legal mentioned | STOP_REQUIRED, escalate to human |
| Claims without proof | STOP_REQUIRED, demand artefacts |
| Queue overload / degraded health | Switch to DEGRADED mode, throttle tasks |
| Cost spike | Disable parallelization, enforce budgets |
| Integration failure | Fallback to stub, log error, continue |
| Database unavailable | Switch to in-memory mode, alert |

## Evidence Policy

**No evidence = not done.**

All completed work must have:
- File paths
- Test results
- Command outputs
- Configuration proof

## Escalation Path

1. Assistant → Engineering Lead Supervisor
2. Engineering Lead → Meta Supervisor
3. Meta Supervisor → Human Review

## Recovery Procedures

### Queue Recovery
```bash
# Check queue status
npm run queue:status

# Clear stuck jobs
npm run queue:clear-failed

# Restart workers
npm run queue:restart
```

### Database Recovery
```bash
# Check DB health
npm run db:health

# Run migrations
npm run db:migrate

# Backup before recovery
npm run db:backup
```
