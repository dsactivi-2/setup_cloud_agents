# Step2Job Cloud Agents

Deployment-Template für Supervisor-KI, Log-Auswertung und Dashboard.

## Features

- **Risikobewertung**: Automatische Erkennung von Preis- und Rechtsbehauptungen
- **Batch-Verarbeitung**: Mehrere Log-Dateien parallel verarbeiten
- **Report-Export**: JSON, CSV und HTML Reports
- **Dashboard-Generierung**: Live Supervisor-Dashboard
- **Alert-System**: Automatische Warnungen bei kritischen Vorfällen
- **Agent-Statistiken**: Performance-Tracking pro Agent
- **CI/CD Pipeline**: Automatische Tests mit GitHub Actions

## Installation

```bash
# Repository klonen
git clone <repository-url>
cd code-cloud-agents

# Abhängigkeiten installieren
pip install -r requirements.txt

# Optional: Pre-commit Hooks aktivieren
pip install pre-commit
pre-commit install
```

## Verwendung

### Einzelne Datei analysieren

```bash
python agents/agent_log_scorer.py sample_call_log.json
```

### Batch-Verarbeitung

```bash
# Alle JSON-Dateien in einem Verzeichnis
python agents/agent_log_scorer.py --batch ./logs/

# Mit HTML-Report
python agents/agent_log_scorer.py --batch ./logs/ --html report.html

# Mit CSV-Export
python agents/agent_log_scorer.py --batch ./logs/ --csv results.csv

# Dashboard generieren
python agents/agent_log_scorer.py --batch ./logs/ --dashboard

# Agent-Statistiken anzeigen
python agents/agent_log_scorer.py --batch ./logs/ --stats

# Asynchrone Verarbeitung (schneller bei vielen Dateien)
python agents/agent_log_scorer.py --batch ./logs/ --async
```

### Als Python-Modul

```python
from agents.agent_log_scorer import (
    AgentLogScorer,
    ReportGenerator,
    DashboardGenerator,
    AlertSystem,
    RiskLevel
)

# Scorer initialisieren
scorer = AgentLogScorer()

# Einzelnes Log analysieren
log = {
    "agent_id": "AGENT_001",
    "transcript": [{"text": "Das kostet 500 Euro"}],
    "stop_triggered": False
}
result = scorer.score_log(log)
print(f"Risk: {result.risk_level.value}")  # "MEDIUM"

# Batch-Verarbeitung
results = scorer.score_directory("./logs/")
summary = scorer.get_summary(results)

# Reports exportieren
ReportGenerator.to_html(results, summary, "report.html")
ReportGenerator.to_csv(results, "results.csv")

# Dashboard generieren
stats = scorer.get_agent_statistics()
dashboard = DashboardGenerator.generate(results, stats)

# Alert-System nutzen
alerts = AlertSystem(threshold=RiskLevel.HIGH)
for r in results:
    if alerts.check(r):
        print(f"ALERT: {r.agent_id} - {r.risk_level.value}")
```

## Log-Format

```json
{
  "agent_id": "AGENT_001",
  "contact_name": "Max Mustermann",
  "timestamp": "2025-12-23T10:30:00",
  "transcript": [
    {"speaker": "customer", "text": "Was kostet das?"},
    {"speaker": "agent", "text": "Das kläre ich intern."}
  ],
  "stop_triggered": true,
  "result": "STOP_REQUIRED - Preisfrage erkannt"
}
```

## Ausgabe-Format

```json
{
  "agent_id": "AGENT_001",
  "contact": "Max Mustermann",
  "timestamp": "2025-12-23T10:30:00",
  "price_claim": true,
  "price_keywords_found": ["kostet"],
  "legal_claim": false,
  "legal_keywords_found": [],
  "stop_triggered": true,
  "placeholder_used": true,
  "risk": 0,
  "risk_level": "LOW",
  "violations": []
}
```

## Risk-Level

| Level | Score | Bedeutung |
|-------|-------|-----------|
| LOW | 0 | Kein Risiko erkannt |
| MEDIUM | 1 | Geringes Risiko, Überprüfung empfohlen |
| HIGH | 2 | Hohes Risiko, Aktion erforderlich |
| CRITICAL | 3+ | Kritisch, sofortige Intervention |

## Risiko-Berechnung

```
Risk = price_claim(+1) + legal_claim(+1) - stop_triggered(-1) - placeholder_bonus(-1)
```

## Konfiguration

Die Keywords und Schwellwerte werden aus `agents/flow_validator_checklist.yaml` geladen:

```yaml
keywords:
  price:
    - "€"
    - "euro"
    - "preis"
    - "kostet"
  legal:
    - "gesetz"
    - "rechtlich"
    - "erlaubt"

risk_thresholds:
  low: 0
  medium: 1
  high: 2

scoring:
  placeholder_bonus: -1
```

## Tests

```bash
# Alle Tests ausführen
pytest tests/ -v

# Mit Coverage
pytest tests/ --cov=agents --cov-report=html

# Nur schnelle Tests
pytest tests/ -v -m "not slow"
```

## CI/CD

Das Projekt enthält eine GitHub Actions Pipeline (`.github/workflows/ci.yml`):

- **Test Matrix**: Python 3.10, 3.11, 3.12
- **Linting**: ruff
- **Type Checking**: mypy
- **Coverage**: Codecov Integration
- **Security**: bandit Scan

## Projektstruktur

```
code-cloud-agents/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD Pipeline
├── agents/
│   ├── agent_log_scorer.py           # Haupt-Scoring-Logik
│   ├── agent_training_prompts.md     # Training-Dokumentation
│   ├── flow_validator_checklist.yaml # Konfiguration
│   ├── sample_call_log.json          # Beispiel-Log
│   └── supervisor_dashboard_mock.json
├── tests/
│   ├── test_agent_log_scorer.py      # Unit Tests
│   ├── scorecards/                   # Test-Scorecards (Output)
│   └── test_input_logs/              # Test-Input-Logs
├── .pre-commit-config.yaml           # Pre-commit Hooks
├── requirements.txt
└── README.md
```

## Klassen-Übersicht

| Klasse | Beschreibung |
|--------|--------------|
| `AgentLogScorer` | Hauptklasse für Log-Bewertung |
| `ScoringConfig` | Konfiguration aus YAML laden |
| `ScoreResult` | Strukturiertes Bewertungsergebnis |
| `RiskLevel` | Enum für Risiko-Level |
| `AgentStatistics` | Performance-Statistiken pro Agent |
| `ReportGenerator` | Export in JSON/CSV/HTML |
| `DashboardGenerator` | Supervisor-Dashboard erstellen |
| `AlertSystem` | Warnungen bei kritischen Vorfällen |

## CLI-Optionen

```
usage: agent_log_scorer.py [-h] [-c CONFIG] [-b] [-o OUTPUT] [--csv CSV]
                           [--html HTML] [--dashboard] [--stats] [-v] [--async]
                           [input]

positional arguments:
  input                 Log-Datei oder Verzeichnis

optional arguments:
  -h, --help            Hilfe anzeigen
  -c, --config CONFIG   YAML-Konfigurationsdatei
  -b, --batch           Batch-Modus für Verzeichnisse
  -o, --output OUTPUT   JSON-Export Datei
  --csv CSV             CSV-Report exportieren
  --html HTML           HTML-Report exportieren
  --dashboard           Supervisor-Dashboard generieren
  --stats               Agent-Statistiken anzeigen
  -v, --verbose         Ausführliche Ausgabe
  --async               Asynchrone Verarbeitung
```

## Exit-Codes

| Code | Bedeutung |
|------|-----------|
| 0 | LOW Risk / Erfolg |
| 1 | MEDIUM Risk / Kritische Vorfälle |
| 2 | HIGH Risk |
| 3 | CRITICAL Risk |
| 4 | Datei nicht gefunden |
| 5 | Ungültiges JSON |
| 6 | Validierungsfehler |
| 99 | Unerwarteter Fehler |

## Lizenz

Proprietär - Step2Job GmbH
