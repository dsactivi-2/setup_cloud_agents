# Production Launch Checklist

## Before Go-Live

- [ ] Supervisor prompts committed and versioned
- [ ] Facts reviewed (pricing remains UNKNOWN)
- [ ] Policy active and enforced
- [ ] Logging enabled (structured JSON)
- [ ] STOP scoring enabled
- [ ] Basic API health endpoint works
- [ ] DB migrations in place
- [ ] Queue adapter works (in-memory fallback ok)
- [ ] All integration stubs return graceful errors
- [ ] Environment variables documented

## First Live Run

- [ ] 1–5 tasks only
- [ ] No live messaging/voice integrations
- [ ] Review logs + stop scores
- [ ] Verify evidence collection
- [ ] Check error handling paths
- [ ] Monitor memory/CPU usage

## Scaling Phase

- [ ] KPI review (completion rate, stop rate)
- [ ] Cost review (API calls, compute)
- [ ] Supervisor approval for increased load
- [ ] Enable parallel processing (max 4 agents)
- [ ] Set up alerting thresholds

## Integration Enablement

For each integration:
- [ ] Security review completed
- [ ] Credentials rotated from dev
- [ ] Rate limits configured
- [ ] Fallback behavior tested
- [ ] Monitoring in place
