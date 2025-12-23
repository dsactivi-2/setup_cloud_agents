# Decision Flow

## STOP Score Calculation

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT: Work Submission                    │
│  - Description                                               │
│  - Claims                                                    │
│  - Artefacts                                                 │
│  - Test status                                               │
│  - Schema status                                             │
│  - Deploy config status                                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    REASON DETECTION                          │
│                                                              │
│  PRICING_WITHOUT_FACT      → +40 points                      │
│  LEGAL_STATEMENT           → +40 points                      │
│  UNPROVEN_CLAIM            → +30 points                      │
│  CROSS_LAYER_MISMATCH      → +25 points                      │
│  MISSING_SQL_OR_SCHEMA     → +25 points                      │
│  COST_OR_LOAD_RISK         → +20 points                      │
│  MISSING_TESTS             → +15 points                      │
│  MISSING_DEPLOY_CONFIG     → +15 points                      │
│                                                              │
│  Maximum Score: 100                                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SEVERITY MAPPING                          │
│                                                              │
│  0-19:   LOW                                                 │
│  20-44:  MEDIUM                                              │
│  45-69:  HIGH                                                │
│  70-100: CRITICAL                                            │
│                                                              │
│  STOP Required: score >= 40                                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FINAL DECISION                            │
│                                                              │
│  score < 40  →  APPROVED                                     │
│  score >= 40 →  STOP_REQUIRED                                │
│                                                              │
│  Final Status:                                               │
│  - COMPLETE:           No issues                             │
│  - COMPLETE_WITH_GAPS: Issues but not blocking               │
│  - STOP_REQUIRED:      Must address before proceeding        │
└─────────────────────────────────────────────────────────────┘
```

## Decision Examples

### Example 1: Clean Submission
```
Input:
  - Description: "Added user login endpoint"
  - Artefacts: [src/api/auth.ts, tests/auth.test.ts]
  - hasTests: true
  - hasSchema: true
  - hasDeployConfig: true

Detected Reasons: []
Score: 0
Severity: LOW

Decision: APPROVED
Final Status: COMPLETE
```

### Example 2: Missing Tests
```
Input:
  - Description: "Added payment processing"
  - Artefacts: [src/api/payments.ts]
  - hasTests: false
  - hasSchema: true
  - hasDeployConfig: false

Detected Reasons: [MISSING_TESTS, MISSING_DEPLOY_CONFIG]
Score: 30
Severity: MEDIUM

Decision: APPROVED
Final Status: COMPLETE_WITH_GAPS
Required Action: Add missing: Tests, Deploy config
```

### Example 3: Pricing Claim
```
Input:
  - Description: "Set price to $99/month for premium tier"
  - Artefacts: [src/pricing.ts]
  - hasTests: true
  - hasSchema: true
  - hasDeployConfig: true

Detected Reasons: [PRICING_WITHOUT_FACT]
Score: 40
Severity: HIGH

Decision: STOP_REQUIRED
Final Status: STOP_REQUIRED
Required Action: STOP: Address PRICING_WITHOUT_FACT before proceeding
```

### Example 4: Multiple Issues
```
Input:
  - Description: "Deployed the API with legal disclaimer"
  - Artefacts: []
  - hasTests: false
  - hasSchema: false
  - hasDeployConfig: false

Detected Reasons: [
  UNPROVEN_CLAIM (deployed),
  LEGAL_STATEMENT,
  MISSING_TESTS,
  MISSING_SQL_OR_SCHEMA,
  MISSING_DEPLOY_CONFIG
]
Score: 100 (capped)
Severity: CRITICAL

Decision: STOP_REQUIRED
Final Status: STOP_REQUIRED
Required Action: STOP: Address all issues before proceeding
```

## Escalation Path

```
Cloud Assistant
     │
     │ submits work
     ▼
Engineering Lead Supervisor
     │
     │ STOP_REQUIRED?
     ├──────────────────┐
     │ Yes              │ No
     ▼                  ▼
Meta Supervisor     Continue
     │
     │ Cross-system?
     ├──────────────────┐
     │ Yes              │ No
     ▼                  ▼
Human Review        Log & Monitor
```
