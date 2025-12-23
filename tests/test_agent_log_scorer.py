"""
Unit Tests für den Agent Log Scorer

Testet die Kernfunktionalität:
- Input-Validierung
- Keyword-Erkennung
- Risk-Scoring
- Risk-Level-Zuordnung
- Batch-Verarbeitung
- Report-Generierung
- Dashboard-Generierung
- Alert-System
"""

import json
import os
import tempfile
from pathlib import Path

import pytest
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.agent_log_scorer import (
    AgentLogScorer,
    ScoringConfig,
    ScoreResult,
    RiskLevel,
    AgentStatistics,
    ReportGenerator,
    DashboardGenerator,
    AlertSystem,
    # Legacy functions
    score_agent_log,
    validate_log_structure,
    check_keywords,
    get_risk_level,
    load_config,
    DEFAULT_CONFIG
)


class TestScoringConfig:
    """Tests für die Konfigurationsklasse."""

    def test_default_config(self):
        """Standardkonfiguration wird korrekt erstellt."""
        config = ScoringConfig()
        assert len(config.price_keywords) > 0
        assert len(config.legal_keywords) > 0
        assert "low" in config.risk_thresholds

    def test_from_yaml_loads_keywords(self):
        """Keywords werden aus YAML geladen."""
        yaml_path = Path(__file__).parent.parent / "agents" / "flow_validator_checklist.yaml"
        if yaml_path.exists():
            config = ScoringConfig.from_yaml(yaml_path)
            assert len(config.price_keywords) > 0

    def test_from_yaml_nonexistent_file(self):
        """Fehlende YAML-Datei gibt Standardwerte zurück."""
        config = ScoringConfig.from_yaml("/nonexistent/path.yaml")
        assert len(config.price_keywords) > 0


class TestRiskLevel:
    """Tests für die RiskLevel Enumeration."""

    def test_risk_level_comparison(self):
        """Risk-Level können verglichen werden."""
        assert RiskLevel.LOW < RiskLevel.MEDIUM
        assert RiskLevel.MEDIUM < RiskLevel.HIGH
        assert RiskLevel.HIGH < RiskLevel.CRITICAL

    def test_risk_level_values(self):
        """Risk-Level haben korrekte String-Werte."""
        assert RiskLevel.LOW.value == "LOW"
        assert RiskLevel.CRITICAL.value == "CRITICAL"


class TestScoreResult:
    """Tests für die ScoreResult Dataclass."""

    def test_to_dict(self):
        """Konvertierung zu Dictionary funktioniert."""
        result = ScoreResult(
            agent_id="TEST_001",
            contact="Test User",
            timestamp="2025-01-01T00:00:00",
            price_claim=True,
            price_keywords_found=["euro"],
            legal_claim=False,
            legal_keywords_found=[],
            stop_triggered=True,
            placeholder_used=False,
            risk=0,
            risk_level=RiskLevel.LOW
        )
        data = result.to_dict()
        assert data["agent_id"] == "TEST_001"
        assert data["risk_level"] == "LOW"

    def test_is_critical(self):
        """is_critical erkennt HIGH und CRITICAL."""
        result_high = ScoreResult(
            agent_id="TEST", contact=None, timestamp=None,
            price_claim=True, price_keywords_found=[],
            legal_claim=True, legal_keywords_found=[],
            stop_triggered=False, placeholder_used=False,
            risk=2, risk_level=RiskLevel.HIGH
        )
        assert result_high.is_critical() is True


class TestAgentStatistics:
    """Tests für die AgentStatistics Dataclass."""

    def test_average_risk_calculation(self):
        """Durchschnittlicher Risikoscore wird korrekt berechnet."""
        stats = AgentStatistics(agent_id="TEST")
        stats.total_interactions = 4
        stats.total_risk_score = 6
        assert stats.average_risk == 1.5

    def test_average_risk_zero_interactions(self):
        """Bei 0 Interaktionen ist average_risk 0."""
        stats = AgentStatistics(agent_id="TEST")
        assert stats.average_risk == 0.0

    def test_stop_rate_calculation(self):
        """Stop-Rate wird korrekt berechnet."""
        stats = AgentStatistics(agent_id="TEST")
        stats.price_claims = 5
        stats.legal_claims = 5
        stats.stops_triggered = 8
        assert stats.stop_rate == 0.8


class TestAgentLogScorer:
    """Tests für die Hauptklasse AgentLogScorer."""

    @pytest.fixture
    def scorer(self):
        """Erstellt einen Scorer für Tests."""
        return AgentLogScorer()

    def test_validate_log_valid(self, scorer):
        """Gültiges Log wird akzeptiert."""
        log = {"agent_id": "AGENT_001"}
        is_valid, error = scorer.validate_log(log)
        assert is_valid is True

    def test_validate_log_not_dict(self, scorer):
        """Nicht-Dictionary wird abgelehnt."""
        is_valid, error = scorer.validate_log("not a dict")
        assert is_valid is False

    def test_score_log_no_claims(self, scorer):
        """Log ohne Claims hat Risk 0."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Guten Tag, wie kann ich helfen?"}]
        }
        result = scorer.score_log(log)
        assert result.risk == 0
        assert result.risk_level == RiskLevel.LOW

    def test_score_log_price_claim_with_stop(self, scorer):
        """Preisclaim mit STOP reduziert Risiko."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Sie fragen nach dem Preis?"}],
            "stop_triggered": True,
            "result": "STOP_REQUIRED"
        }
        result = scorer.score_log(log)
        assert result.price_claim is True
        assert result.stop_triggered is True
        assert result.risk == 0

    def test_score_directory(self, scorer):
        """Verzeichnis-Batch-Verarbeitung funktioniert."""
        test_dir = Path(__file__).parent / "test_input_logs"
        if test_dir.exists():
            results = scorer.score_directory(test_dir)
            assert len(results) > 0

    def test_get_summary(self, scorer):
        """Summary wird korrekt erstellt."""
        results = [
            ScoreResult(
                agent_id="A1", contact=None, timestamp=None,
                price_claim=False, price_keywords_found=[],
                legal_claim=False, legal_keywords_found=[],
                stop_triggered=False, placeholder_used=False,
                risk=0, risk_level=RiskLevel.LOW
            ),
            ScoreResult(
                agent_id="A2", contact=None, timestamp=None,
                price_claim=True, price_keywords_found=["euro"],
                legal_claim=True, legal_keywords_found=["gesetz"],
                stop_triggered=False, placeholder_used=False,
                risk=2, risk_level=RiskLevel.HIGH
            )
        ]
        summary = scorer.get_summary(results)
        assert summary["total"] == 2
        assert summary["average_risk"] == 1.0


class TestReportGenerator:
    """Tests für die Report-Generierung."""

    @pytest.fixture
    def sample_results(self):
        """Erstellt Beispiel-Ergebnisse."""
        return [
            ScoreResult(
                agent_id="A1", contact="User 1", timestamp="2025-01-01T00:00:00",
                price_claim=True, price_keywords_found=["euro"],
                legal_claim=False, legal_keywords_found=[],
                stop_triggered=True, placeholder_used=False,
                risk=0, risk_level=RiskLevel.LOW
            )
        ]

    def test_to_json(self, sample_results):
        """JSON-Export funktioniert."""
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            ReportGenerator.to_json(sample_results, f.name)
            with open(f.name) as rf:
                data = json.load(rf)
            assert len(data) == 1
            os.unlink(f.name)

    def test_to_csv(self, sample_results):
        """CSV-Export funktioniert."""
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
            ReportGenerator.to_csv(sample_results, f.name)
            with open(f.name) as rf:
                content = rf.read()
            assert "agent_id" in content
            os.unlink(f.name)


class TestDashboardGenerator:
    """Tests für die Dashboard-Generierung."""

    def test_generate_dashboard(self):
        """Dashboard wird korrekt generiert."""
        results = [
            ScoreResult(
                agent_id="A1", contact=None, timestamp="2025-01-01T00:00:00",
                price_claim=True, price_keywords_found=[],
                legal_claim=False, legal_keywords_found=[],
                stop_triggered=False, placeholder_used=False,
                risk=1, risk_level=RiskLevel.MEDIUM
            )
        ]
        stats = {
            "A1": AgentStatistics(agent_id="A1", total_interactions=1, total_risk_score=1)
        }
        dashboard = DashboardGenerator.generate(results, stats)
        assert "supervisor_dashboard" in dashboard


class TestAlertSystem:
    """Tests für das Alert-System."""

    def test_alert_triggered_on_high_risk(self):
        """Alert wird bei HIGH Risk ausgelöst."""
        alert_system = AlertSystem(threshold=RiskLevel.HIGH)
        result = ScoreResult(
            agent_id="A1", contact=None, timestamp=None,
            price_claim=True, price_keywords_found=[],
            legal_claim=True, legal_keywords_found=[],
            stop_triggered=False, placeholder_used=False,
            risk=2, risk_level=RiskLevel.HIGH
        )
        triggered = alert_system.check(result)
        assert triggered is True

    def test_no_alert_on_low_risk(self):
        """Kein Alert bei LOW Risk."""
        alert_system = AlertSystem(threshold=RiskLevel.HIGH)
        result = ScoreResult(
            agent_id="A1", contact=None, timestamp=None,
            price_claim=False, price_keywords_found=[],
            legal_claim=False, legal_keywords_found=[],
            stop_triggered=False, placeholder_used=False,
            risk=0, risk_level=RiskLevel.LOW
        )
        triggered = alert_system.check(result)
        assert triggered is False


class TestValidateLogStructure:
    """Tests für die Input-Validierung (Legacy)."""

    def test_valid_minimal_log(self):
        """Minimales gültiges Log mit nur agent_id."""
        log = {"agent_id": "AGENT_001"}
        is_valid, error = validate_log_structure(log)
        assert is_valid is True
        assert error == ""

    def test_invalid_not_dict(self):
        """Log ist kein Dictionary."""
        is_valid, error = validate_log_structure("not a dict")
        assert is_valid is False

    def test_invalid_missing_agent_id(self):
        """Fehlendes Pflichtfeld agent_id."""
        log = {"contact_name": "Test"}
        is_valid, error = validate_log_structure(log)
        assert is_valid is False


class TestCheckKeywords:
    """Tests für die Keyword-Erkennung."""

    def test_price_keyword_euro_symbol(self):
        """Erkennung des Euro-Symbols."""
        found, keywords = check_keywords("Das kostet 100€", ["€", "euro"])
        assert found is True
        assert "€" in keywords

    def test_legal_keyword(self):
        """Erkennung von rechtlichen Keywords."""
        found, keywords = check_keywords("Das ist gesetzlich geregelt", ["gesetz", "rechtlich"])
        assert found is True

    def test_no_match(self):
        """Keine Keywords gefunden."""
        found, keywords = check_keywords("Guten Tag", ["€", "gesetz"])
        assert found is False


class TestGetRiskLevel:
    """Tests für die Risk-Level-Zuordnung."""

    def test_risk_level_low(self):
        """Risk Score 0 = LOW."""
        level = get_risk_level(0, DEFAULT_CONFIG["risk_thresholds"])
        assert level == "LOW"

    def test_risk_level_high(self):
        """Risk Score 2 = HIGH."""
        level = get_risk_level(2, DEFAULT_CONFIG["risk_thresholds"])
        assert level == "HIGH"


class TestScoreAgentLog:
    """Tests für die Hauptfunktion score_agent_log."""

    def test_no_claims_no_risk(self):
        """Keine Claims = Risiko 0."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Guten Tag"}]
        }
        result = score_agent_log(log)
        assert result["risk"] == 0

    def test_price_claim_without_stop(self):
        """Preisclaim ohne STOP = erhöhtes Risiko."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Das kostet 500 Euro"}],
            "stop_triggered": False
        }
        result = score_agent_log(log)
        assert result["price_claim"] is True
        assert result["risk"] == 1

    def test_both_claims_highest_risk(self):
        """Preis- und Rechtsclaim ohne STOP = höchstes Risiko."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Das kostet 100€ und ist gesetzlich geregelt"}],
            "stop_triggered": False
        }
        result = score_agent_log(log)
        assert result["price_claim"] is True
        assert result["legal_claim"] is True
        assert result["risk"] == 2

    def test_invalid_log_raises_error(self):
        """Ungültiges Log wirft ValueError."""
        with pytest.raises(ValueError):
            score_agent_log("not a dict")


class TestLoadConfig:
    """Tests für das Laden der Konfiguration."""

    def test_load_default_config(self):
        """Standardkonfiguration wird geladen."""
        config = load_config()
        assert "price_keywords" in config
        assert "legal_keywords" in config


class TestIntegrationWithScorecards:
    """Integrationstests mit den vorhandenen Scorecards."""

    @pytest.fixture
    def scorecards_dir(self):
        return Path(__file__).parent / "scorecards"

    def test_scorecard_files_exist(self, scorecards_dir):
        """Scorecard-Dateien existieren."""
        assert scorecards_dir.exists()
        scorecard_files = list(scorecards_dir.glob("scorecard_*.json"))
        assert len(scorecard_files) == 10


class TestIntegrationWithInputLogs:
    """Integrationstests mit echten Input-Logs."""

    @pytest.fixture
    def input_logs_dir(self):
        return Path(__file__).parent / "test_input_logs"

    def test_process_all_input_logs(self, input_logs_dir):
        """Alle Input-Logs werden verarbeitet."""
        if input_logs_dir.exists():
            scorer = AgentLogScorer()
            results = scorer.score_directory(input_logs_dir)
            assert len(results) >= 1


class TestEdgeCases:
    """Tests für Randfälle."""

    def test_empty_transcript(self):
        """Leeres Transcript wird korrekt behandelt."""
        log = {"agent_id": "AGENT_001", "transcript": []}
        result = score_agent_log(log)
        assert result["risk"] == 0

    def test_transcript_as_string_list(self):
        """Transcript als Liste von Strings."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": ["Guten Tag", "Das kostet 50€"]
        }
        result = score_agent_log(log)
        assert result["price_claim"] is True

    def test_none_values_handled(self):
        """None-Werte werden korrekt behandelt."""
        log = {
            "agent_id": "AGENT_001",
            "contact_name": None,
            "timestamp": None,
            "result": None
        }
        result = score_agent_log(log)
        assert result["contact"] is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
