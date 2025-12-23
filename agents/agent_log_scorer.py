"""
Agent Log Scorer - Risikobewertung für KI-Agenten-Interaktionen

Dieses Modul analysiert Agent-Logs auf potenzielle Risiken wie:
- Unerlaubte Preisaussagen
- Rechtliche Behauptungen ohne Faktengrundlage
- Fehlende STOP-Mechanismen bei kritischen Fragen

Features:
- Batch-Verarbeitung mehrerer Log-Dateien
- Konfigurierbare Keywords via YAML
- Export in JSON/CSV/HTML
- Agent-Performance-Statistiken
- Dashboard-Generierung
"""

from __future__ import annotations

import asyncio
import csv
import json
import logging
import os
import sys
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Iterator

import yaml

# Logging konfigurieren
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    """Risk-Level Enumeration für typsichere Verwendung."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

    def _get_order(self) -> int:
        order = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
        return order.index(self)

    def __lt__(self, other: "RiskLevel") -> bool:
        return self._get_order() < other._get_order()

    def __le__(self, other: "RiskLevel") -> bool:
        return self._get_order() <= other._get_order()

    def __gt__(self, other: "RiskLevel") -> bool:
        return self._get_order() > other._get_order()

    def __ge__(self, other: "RiskLevel") -> bool:
        return self._get_order() >= other._get_order()


@dataclass
class ScoringConfig:
    """Konfiguration für das Scoring-System."""
    price_keywords: list[str] = field(default_factory=lambda: [
        "€", "euro", "preis", "kostet", "kosten", "gebühr", "tarif", "$", "usd", "chf"
    ])
    legal_keywords: list[str] = field(default_factory=lambda: [
        "gesetz", "rechtlich", "erlaubt", "illegal", "legal", "vorschrift", "verordnung", "recht"
    ])
    risk_thresholds: dict[str, int] = field(default_factory=lambda: {
        "low": 0, "medium": 1, "high": 2, "critical": 3
    })
    placeholder_bonus: int = -1
    yaml_rules: dict | None = None

    @classmethod
    def from_yaml(cls, yaml_path: str | Path) -> "ScoringConfig":
        """Lädt Konfiguration aus YAML-Datei."""
        config = cls()
        try:
            with open(yaml_path, 'r', encoding='utf-8') as f:
                yaml_config = yaml.safe_load(f)

            if yaml_config:
                # Keywords aus YAML laden
                if 'keywords' in yaml_config:
                    if 'price' in yaml_config['keywords']:
                        config.price_keywords = yaml_config['keywords']['price']
                    if 'legal' in yaml_config['keywords']:
                        config.legal_keywords = yaml_config['keywords']['legal']

                # Risk-Thresholds aus YAML laden
                if 'risk_thresholds' in yaml_config:
                    config.risk_thresholds = yaml_config['risk_thresholds']

                # Scoring-Parameter aus YAML laden
                if 'scoring' in yaml_config:
                    if 'placeholder_bonus' in yaml_config['scoring']:
                        config.placeholder_bonus = yaml_config['scoring']['placeholder_bonus']

                # Flow-Validator Regeln speichern
                if 'flow_validator' in yaml_config:
                    config.yaml_rules = yaml_config['flow_validator']

                logger.info(f"Konfiguration geladen aus: {yaml_path}")

        except FileNotFoundError:
            logger.warning(f"Konfigurationsdatei nicht gefunden: {yaml_path}. Verwende Standardwerte.")
        except yaml.YAMLError as e:
            logger.error(f"Fehler beim Parsen der YAML-Datei: {e}")

        return config


@dataclass
class ScoreResult:
    """Strukturiertes Ergebnis einer Log-Bewertung."""
    agent_id: str
    contact: str | None
    timestamp: str | None
    price_claim: bool
    price_keywords_found: list[str]
    legal_claim: bool
    legal_keywords_found: list[str]
    stop_triggered: bool
    placeholder_used: bool
    risk: int
    risk_level: RiskLevel
    violations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Konvertiert zu Dictionary für JSON-Export."""
        result = asdict(self)
        result['risk_level'] = self.risk_level.value
        return result

    def is_critical(self) -> bool:
        """Prüft ob das Ergebnis kritisch ist."""
        return self.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)


@dataclass
class AgentStatistics:
    """Statistiken für einen einzelnen Agenten."""
    agent_id: str
    total_interactions: int = 0
    total_risk_score: int = 0
    price_claims: int = 0
    legal_claims: int = 0
    stops_triggered: int = 0
    placeholders_used: int = 0
    critical_incidents: int = 0
    risk_levels: dict[str, int] = field(default_factory=lambda: {
        "LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0
    })

    @property
    def average_risk(self) -> float:
        """Durchschnittlicher Risikoscore."""
        if self.total_interactions == 0:
            return 0.0
        return self.total_risk_score / self.total_interactions

    @property
    def stop_rate(self) -> float:
        """Rate der korrekten STOP-Auslösungen."""
        claims = self.price_claims + self.legal_claims
        if claims == 0:
            return 1.0
        return self.stops_triggered / claims

    def to_dict(self) -> dict:
        """Konvertiert zu Dictionary."""
        return {
            "agent_id": self.agent_id,
            "total_interactions": self.total_interactions,
            "average_risk": round(self.average_risk, 2),
            "price_claims": self.price_claims,
            "legal_claims": self.legal_claims,
            "stops_triggered": self.stops_triggered,
            "stop_rate": f"{self.stop_rate:.1%}",
            "critical_incidents": self.critical_incidents,
            "risk_distribution": self.risk_levels
        }


class AgentLogScorer:
    """Hauptklasse für die Log-Bewertung."""

    def __init__(self, config: ScoringConfig | None = None, config_path: str | Path | None = None):
        """
        Initialisiert den Scorer.

        Args:
            config: Optionale Konfiguration
            config_path: Optionaler Pfad zur YAML-Config
        """
        if config:
            self.config = config
        elif config_path:
            self.config = ScoringConfig.from_yaml(config_path)
        else:
            # Standard-Config-Pfad
            default_path = Path(__file__).parent / "flow_validator_checklist.yaml"
            self.config = ScoringConfig.from_yaml(default_path)

        self._agent_stats: dict[str, AgentStatistics] = defaultdict(
            lambda: AgentStatistics(agent_id="unknown")
        )

    def validate_log(self, log: Any) -> tuple[bool, str]:
        """
        Validiert die Struktur des Input-Logs.

        Args:
            log: Das zu validierende Log-Objekt

        Returns:
            Tuple aus (ist_valide, fehlermeldung)
        """
        if not isinstance(log, dict):
            return False, f"Log muss ein Dictionary sein, erhalten: {type(log).__name__}"

        if "agent_id" not in log:
            return False, "Pflichtfeld 'agent_id' fehlt"

        if "transcript" in log and not isinstance(log["transcript"], list):
            return False, "Feld 'transcript' muss eine Liste sein"

        return True, ""

    def _extract_transcript(self, log: dict) -> str:
        """Extrahiert den Transcript-Text aus dem Log."""
        parts = []
        for line in log.get("transcript", []):
            if isinstance(line, dict):
                parts.append(line.get("text", ""))
            elif isinstance(line, str):
                parts.append(line)
        return " ".join(parts)

    def _check_keywords(self, text: str, keywords: list[str]) -> tuple[bool, list[str]]:
        """Prüft ob Keywords im Text vorkommen."""
        text_lower = text.lower()
        found = [kw for kw in keywords if kw.lower() in text_lower]
        return len(found) > 0, found

    def _get_risk_level(self, risk_score: int) -> RiskLevel:
        """Konvertiert numerischen Score zu Risk-Level."""
        thresholds = self.config.risk_thresholds
        if risk_score <= thresholds.get("low", 0):
            return RiskLevel.LOW
        elif risk_score <= thresholds.get("medium", 1):
            return RiskLevel.MEDIUM
        elif risk_score <= thresholds.get("high", 2):
            return RiskLevel.HIGH
        return RiskLevel.CRITICAL

    def _check_violations(self, log: dict, transcript: str, result: ScoreResult) -> list[str]:
        """Prüft auf Regelverstöße basierend auf YAML-Regeln."""
        violations = []
        rules = self.config.yaml_rules

        if not rules:
            return violations

        # Prüfe "forbidden" Regeln
        forbidden = rules.get("forbidden", [])
        for rule in forbidden:
            if "price estimates without fact" in rule.lower() and result.price_claim and not result.stop_triggered:
                violations.append(f"Verstoß: {rule}")
            if "legal promises without fact" in rule.lower() and result.legal_claim and not result.stop_triggered:
                violations.append(f"Verstoß: {rule}")

        # Prüfe "must_include" Regeln
        must_include = rules.get("must_include", [])
        for rule in must_include:
            if "stop_required on price" in rule.lower() and result.price_claim and not result.stop_triggered:
                violations.append(f"Fehlend: {rule}")
            if "stop_required on legal" in rule.lower() and result.legal_claim and not result.stop_triggered:
                violations.append(f"Fehlend: {rule}")

        return violations

    def score_log(self, log: Any) -> ScoreResult:
        """
        Bewertet ein einzelnes Agent-Log.

        Args:
            log: Das Agent-Log als Dictionary

        Returns:
            ScoreResult mit der Bewertung

        Raises:
            ValueError: Bei ungültiger Log-Struktur
        """
        # Validierung
        is_valid, error_msg = self.validate_log(log)
        if not is_valid:
            logger.error(f"Validierungsfehler: {error_msg}")
            raise ValueError(error_msg)

        # Transcript extrahieren
        transcript = self._extract_transcript(log)

        # Keywords prüfen
        price_found, price_keywords = self._check_keywords(transcript, self.config.price_keywords)
        legal_found, legal_keywords = self._check_keywords(transcript, self.config.legal_keywords)

        # Flags extrahieren
        stop_triggered = bool(log.get("stop_triggered", False))
        result_text = str(log.get("result", ""))
        placeholder_used = "PLACEHOLDER" in result_text or "STOP_REQUIRED" in result_text

        # Risikoscore berechnen
        risk_score = 0
        if price_found:
            risk_score += 1
        if legal_found:
            risk_score += 1
        if stop_triggered:
            risk_score -= 1
        if placeholder_used and (price_found or legal_found):
            risk_score += self.config.placeholder_bonus

        risk_score = max(0, risk_score)
        risk_level = self._get_risk_level(risk_score)

        # Ergebnis erstellen
        result = ScoreResult(
            agent_id=log.get("agent_id"),
            contact=log.get("contact_name"),
            timestamp=log.get("timestamp"),
            price_claim=price_found,
            price_keywords_found=price_keywords,
            legal_claim=legal_found,
            legal_keywords_found=legal_keywords,
            stop_triggered=stop_triggered,
            placeholder_used=placeholder_used,
            risk=risk_score,
            risk_level=risk_level
        )

        # Verstöße prüfen
        result.violations = self._check_violations(log, transcript, result)

        # Statistiken aktualisieren
        self._update_statistics(result)

        logger.debug(f"Score für Agent {result.agent_id}: Risk={risk_score} ({risk_level.value})")
        return result

    def _update_statistics(self, result: ScoreResult) -> None:
        """Aktualisiert die Agent-Statistiken."""
        stats = self._agent_stats[result.agent_id]
        stats.agent_id = result.agent_id
        stats.total_interactions += 1
        stats.total_risk_score += result.risk
        stats.risk_levels[result.risk_level.value] += 1

        if result.price_claim:
            stats.price_claims += 1
        if result.legal_claim:
            stats.legal_claims += 1
        if result.stop_triggered:
            stats.stops_triggered += 1
        if result.placeholder_used:
            stats.placeholders_used += 1
        if result.is_critical():
            stats.critical_incidents += 1

    def score_file(self, file_path: str | Path) -> ScoreResult:
        """Verarbeitet eine einzelne Log-Datei."""
        logger.info(f"Verarbeite: {file_path}")

        with open(file_path, 'r', encoding='utf-8') as f:
            log_data = json.load(f)

        return self.score_log(log_data)

    def score_directory(self, dir_path: str | Path, pattern: str = "*.json") -> list[ScoreResult]:
        """
        Verarbeitet alle Log-Dateien in einem Verzeichnis.

        Args:
            dir_path: Pfad zum Verzeichnis
            pattern: Glob-Pattern für Dateien (Standard: *.json)

        Returns:
            Liste der Scoring-Ergebnisse
        """
        dir_path = Path(dir_path)
        results = []

        for file_path in sorted(dir_path.glob(pattern)):
            try:
                result = self.score_file(file_path)
                results.append(result)
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Fehler bei {file_path}: {e}")

        logger.info(f"Verarbeitet: {len(results)} Dateien")
        return results

    async def score_file_async(self, file_path: str | Path) -> ScoreResult:
        """Asynchrone Verarbeitung einer Log-Datei."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.score_file, file_path)

    async def score_directory_async(self, dir_path: str | Path, pattern: str = "*.json") -> list[ScoreResult]:
        """Asynchrone Batch-Verarbeitung eines Verzeichnisses."""
        dir_path = Path(dir_path)
        files = list(dir_path.glob(pattern))

        tasks = [self.score_file_async(f) for f in files]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Fehler filtern
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Fehler bei {files[i]}: {result}")
            else:
                valid_results.append(result)

        return valid_results

    def get_agent_statistics(self) -> dict[str, AgentStatistics]:
        """Gibt die gesammelten Agent-Statistiken zurück."""
        return dict(self._agent_stats)

    def get_summary(self, results: list[ScoreResult]) -> dict:
        """
        Erstellt eine Zusammenfassung der Ergebnisse.

        Args:
            results: Liste der Scoring-Ergebnisse

        Returns:
            Dictionary mit Zusammenfassung
        """
        if not results:
            return {"total": 0, "message": "Keine Ergebnisse"}

        risk_counts = defaultdict(int)
        total_risk = 0
        critical_results = []

        for r in results:
            risk_counts[r.risk_level.value] += 1
            total_risk += r.risk
            if r.is_critical():
                critical_results.append({
                    "agent_id": r.agent_id,
                    "risk_level": r.risk_level.value,
                    "violations": r.violations
                })

        return {
            "total": len(results),
            "average_risk": round(total_risk / len(results), 2),
            "risk_distribution": dict(risk_counts),
            "critical_count": len(critical_results),
            "critical_incidents": critical_results,
            "agents_analyzed": len(set(r.agent_id for r in results))
        }

    def reset_statistics(self) -> None:
        """Setzt die Statistiken zurück."""
        self._agent_stats.clear()


class ReportGenerator:
    """Generiert Reports in verschiedenen Formaten."""

    @staticmethod
    def to_json(results: list[ScoreResult], output_path: str | Path) -> None:
        """Exportiert Ergebnisse als JSON."""
        data = [r.to_dict() for r in results]
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, indent=2, ensure_ascii=False, fp=f)
        logger.info(f"JSON-Report gespeichert: {output_path}")

    @staticmethod
    def to_csv(results: list[ScoreResult], output_path: str | Path) -> None:
        """Exportiert Ergebnisse als CSV."""
        if not results:
            return

        fieldnames = [
            'agent_id', 'contact', 'timestamp', 'price_claim', 'legal_claim',
            'stop_triggered', 'placeholder_used', 'risk', 'risk_level', 'violations'
        ]

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in results:
                row = r.to_dict()
                row['violations'] = "; ".join(row['violations'])
                row['risk_level'] = row['risk_level']
                # Nur relevante Felder
                writer.writerow({k: row.get(k, '') for k in fieldnames})

        logger.info(f"CSV-Report gespeichert: {output_path}")

    @staticmethod
    def to_html(results: list[ScoreResult], summary: dict, output_path: str | Path) -> None:
        """Generiert einen HTML-Report."""
        risk_colors = {
            "LOW": "#28a745",
            "MEDIUM": "#ffc107",
            "HIGH": "#fd7e14",
            "CRITICAL": "#dc3545"
        }

        rows_html = ""
        for r in results:
            color = risk_colors.get(r.risk_level.value, "#6c757d")
            violations_html = "<br>".join(r.violations) if r.violations else "-"
            rows_html += f"""
            <tr>
                <td>{r.agent_id}</td>
                <td>{r.contact or '-'}</td>
                <td>{r.timestamp or '-'}</td>
                <td>{'Ja' if r.price_claim else 'Nein'}</td>
                <td>{'Ja' if r.legal_claim else 'Nein'}</td>
                <td>{'Ja' if r.stop_triggered else 'Nein'}</td>
                <td>{r.risk}</td>
                <td style="background-color: {color}; color: white; font-weight: bold;">{r.risk_level.value}</td>
                <td>{violations_html}</td>
            </tr>
            """

        html = f"""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Log Scorer Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        h1 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
        .summary {{ background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }}
        .stat-box {{ text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }}
        .stat-value {{ font-size: 2em; font-weight: bold; color: #007bff; }}
        .stat-label {{ color: #666; font-size: 0.9em; }}
        table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        th {{ background: #007bff; color: white; padding: 12px; text-align: left; }}
        td {{ padding: 10px; border-bottom: 1px solid #eee; }}
        tr:hover {{ background: #f8f9fa; }}
        .critical-section {{ background: #fff5f5; border: 1px solid #dc3545; border-radius: 8px; padding: 15px; margin-top: 20px; }}
        .timestamp {{ color: #666; font-size: 0.8em; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Agent Log Scorer Report</h1>

        <div class="summary">
            <h2>Zusammenfassung</h2>
            <div class="summary-grid">
                <div class="stat-box">
                    <div class="stat-value">{summary.get('total', 0)}</div>
                    <div class="stat-label">Logs analysiert</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{summary.get('average_risk', 0)}</div>
                    <div class="stat-label">Durchschn. Risiko</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{summary.get('agents_analyzed', 0)}</div>
                    <div class="stat-label">Agenten</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" style="color: #dc3545;">{summary.get('critical_count', 0)}</div>
                    <div class="stat-label">Kritische Vorfälle</div>
                </div>
            </div>
        </div>

        <h2>Detaillierte Ergebnisse</h2>
        <table>
            <thead>
                <tr>
                    <th>Agent ID</th>
                    <th>Kontakt</th>
                    <th>Zeitstempel</th>
                    <th>Preis-Claim</th>
                    <th>Rechts-Claim</th>
                    <th>STOP</th>
                    <th>Risk Score</th>
                    <th>Risk Level</th>
                    <th>Verstöße</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>

        <p class="timestamp">Report erstellt: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
</body>
</html>"""

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        logger.info(f"HTML-Report gespeichert: {output_path}")


class DashboardGenerator:
    """Generiert Supervisor-Dashboard-Daten."""

    @staticmethod
    def generate(results: list[ScoreResult], agent_stats: dict[str, AgentStatistics]) -> dict:
        """
        Generiert Dashboard-Daten im Format des supervisor_dashboard_mock.

        Args:
            results: Liste der Scoring-Ergebnisse
            agent_stats: Agent-Statistiken

        Returns:
            Dashboard-Dictionary
        """
        # Kritische Issues sammeln
        potential_issues = []
        for r in results:
            if r.is_critical():
                issue_type = []
                if r.price_claim and not r.stop_triggered:
                    issue_type.append("Price mentioned without fact")
                if r.legal_claim and not r.stop_triggered:
                    issue_type.append("No STOP on legal question")

                for issue in issue_type:
                    potential_issues.append({
                        "agent_id": r.agent_id,
                        "issue": issue,
                        "risk": r.risk_level.value,
                        "timestamp": r.timestamp
                    })

        # Agenten mit schlechter Performance identifizieren
        agents_to_review = []
        for agent_id, stats in agent_stats.items():
            if stats.average_risk > 1.0 or stats.critical_incidents > 0:
                agents_to_review.append({
                    "agent_id": agent_id,
                    "average_risk": stats.average_risk,
                    "critical_incidents": stats.critical_incidents,
                    "recommendation": "Review and retrain" if stats.critical_incidents > 1 else "Monitor closely"
                })

        # Dashboard erstellen
        dashboard = {
            "supervisor_dashboard": {
                "date": datetime.now().isoformat(),
                "agents_active": len(agent_stats),
                "total_interactions": sum(s.total_interactions for s in agent_stats.values()),
                "stopped_calls_today": sum(s.stops_triggered for s in agent_stats.values()),
                "potential_issues": potential_issues[:10],  # Top 10
                "agents_requiring_review": agents_to_review,
                "action_required": len(potential_issues) > 0,
                "summary": {
                    "average_risk": round(
                        sum(s.average_risk for s in agent_stats.values()) / max(len(agent_stats), 1), 2
                    ),
                    "total_violations": sum(
                        len(r.violations) for r in results
                    ),
                    "stop_compliance_rate": f"{sum(s.stop_rate for s in agent_stats.values()) / max(len(agent_stats), 1):.1%}"
                }
            }
        }

        # Empfehlungen generieren
        if potential_issues:
            critical_agents = [i["agent_id"] for i in potential_issues if i["risk"] == "CRITICAL"]
            if critical_agents:
                dashboard["supervisor_dashboard"]["supervisor_recommendation"] = (
                    f"Pause {', '.join(set(critical_agents))} and rebrief immediately"
                )
            else:
                dashboard["supervisor_dashboard"]["supervisor_recommendation"] = (
                    "Review flagged interactions and provide feedback to agents"
                )
        else:
            dashboard["supervisor_dashboard"]["supervisor_recommendation"] = (
                "All agents performing within acceptable parameters"
            )

        return dashboard

    @staticmethod
    def save(dashboard: dict, output_path: str | Path) -> None:
        """Speichert das Dashboard als JSON."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(dashboard, indent=2, ensure_ascii=False, fp=f)
        logger.info(f"Dashboard gespeichert: {output_path}")


class AlertSystem:
    """Einfaches Alert-System für kritische Vorfälle."""

    def __init__(self, threshold: RiskLevel = RiskLevel.HIGH):
        self.threshold = threshold
        self.alerts: list[dict] = []

    def check(self, result: ScoreResult) -> bool:
        """Prüft ob ein Alert ausgelöst werden soll."""
        if result.risk_level >= self.threshold:
            alert = {
                "timestamp": datetime.now().isoformat(),
                "agent_id": result.agent_id,
                "risk_level": result.risk_level.value,
                "risk_score": result.risk,
                "violations": result.violations,
                "message": f"ALERT: Agent {result.agent_id} hat Risk-Level {result.risk_level.value}"
            }
            self.alerts.append(alert)
            logger.warning(alert["message"])
            return True
        return False

    def get_alerts(self) -> list[dict]:
        """Gibt alle Alerts zurück."""
        return self.alerts

    def clear(self) -> None:
        """Löscht alle Alerts."""
        self.alerts.clear()


def process_log_file(file_path: str, config_path: str | None = None) -> dict:
    """Legacy-Funktion für Rückwärtskompatibilität."""
    scorer = AgentLogScorer(config_path=config_path)
    result = scorer.score_file(file_path)
    return result.to_dict()


def score_agent_log(log: Any, config: dict | None = None) -> dict:
    """Legacy-Funktion für Rückwärtskompatibilität."""
    scorer = AgentLogScorer()
    result = scorer.score_log(log)
    return result.to_dict()


def load_config(config_path: str | None = None) -> dict:
    """Legacy-Funktion für Rückwärtskompatibilität."""
    if config_path:
        cfg = ScoringConfig.from_yaml(config_path)
    else:
        cfg = ScoringConfig.from_yaml(Path(__file__).parent / "flow_validator_checklist.yaml")

    return {
        "price_keywords": cfg.price_keywords,
        "legal_keywords": cfg.legal_keywords,
        "risk_thresholds": cfg.risk_thresholds,
        "placeholder_bonus": cfg.placeholder_bonus,
        "yaml_rules": cfg.yaml_rules
    }


# Legacy exports für Rückwärtskompatibilität
DEFAULT_CONFIG = {
    "price_keywords": ["€", "euro", "preis", "kostet", "kosten", "gebühr", "tarif", "$", "usd", "chf"],
    "legal_keywords": ["gesetz", "rechtlich", "erlaubt", "illegal", "legal", "vorschrift", "verordnung", "recht"],
    "risk_thresholds": {"low": 0, "medium": 1, "high": 2, "critical": 3},
    "placeholder_bonus": -1
}


def validate_log_structure(log: Any) -> tuple[bool, str]:
    """Legacy-Funktion für Rückwärtskompatibilität."""
    scorer = AgentLogScorer()
    return scorer.validate_log(log)


def check_keywords(text: str, keywords: list[str]) -> tuple[bool, list[str]]:
    """Legacy-Funktion für Rückwärtskompatibilität."""
    scorer = AgentLogScorer()
    return scorer._check_keywords(text, keywords)


def get_risk_level(risk_score: int, thresholds: dict) -> str:
    """Legacy-Funktion für Rückwärtskompatibilität."""
    scorer = AgentLogScorer()
    scorer.config.risk_thresholds = thresholds
    return scorer._get_risk_level(risk_score).value


def main():
    """Haupteinstiegspunkt für die Kommandozeile."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Agent Log Scorer - Risikobewertung für KI-Agenten-Logs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  %(prog)s sample.json                    # Einzelne Datei analysieren
  %(prog)s --batch ./logs/                # Verzeichnis batch-verarbeiten
  %(prog)s --batch ./logs/ --html report.html  # Mit HTML-Report
  %(prog)s --batch ./logs/ --dashboard    # Dashboard generieren
        """
    )
    parser.add_argument(
        "input",
        nargs="?",
        default="sample_call_log.json",
        help="Log-Datei oder Verzeichnis (Standard: sample_call_log.json)"
    )
    parser.add_argument(
        "-c", "--config",
        help="Pfad zur Konfigurationsdatei (YAML)"
    )
    parser.add_argument(
        "-b", "--batch",
        action="store_true",
        help="Batch-Modus: Verarbeite alle JSON-Dateien im Verzeichnis"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output-Datei für JSON-Export"
    )
    parser.add_argument(
        "--csv",
        help="CSV-Report exportieren"
    )
    parser.add_argument(
        "--html",
        help="HTML-Report exportieren"
    )
    parser.add_argument(
        "--dashboard",
        action="store_true",
        help="Supervisor-Dashboard generieren"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Agent-Statistiken anzeigen"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Ausführliche Ausgabe"
    )
    parser.add_argument(
        "--async",
        dest="use_async",
        action="store_true",
        help="Asynchrone Verarbeitung (schneller bei vielen Dateien)"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        # Pfad auflösen
        input_path = args.input
        if not os.path.isabs(input_path):
            input_path = os.path.join(os.path.dirname(__file__), input_path)

        # Scorer initialisieren
        config_path = args.config if args.config else None
        scorer = AgentLogScorer(config_path=config_path)
        alert_system = AlertSystem()

        # Verarbeitung
        if args.batch or os.path.isdir(input_path):
            # Batch-Modus
            if args.use_async:
                results = asyncio.run(scorer.score_directory_async(input_path))
            else:
                results = scorer.score_directory(input_path)

            # Alerts prüfen
            for r in results:
                alert_system.check(r)

            # Summary erstellen
            summary = scorer.get_summary(results)

            # Output
            print(json.dumps(summary, indent=2, ensure_ascii=False))

            # Reports exportieren
            if args.output:
                ReportGenerator.to_json(results, args.output)
            if args.csv:
                ReportGenerator.to_csv(results, args.csv)
            if args.html:
                ReportGenerator.to_html(results, summary, args.html)

            # Dashboard
            if args.dashboard:
                dashboard = DashboardGenerator.generate(results, scorer.get_agent_statistics())
                dashboard_path = os.path.join(os.path.dirname(input_path), "supervisor_dashboard_live.json")
                DashboardGenerator.save(dashboard, dashboard_path)

            # Statistiken
            if args.stats:
                print("\n--- Agent-Statistiken ---")
                for agent_id, stats in scorer.get_agent_statistics().items():
                    print(json.dumps(stats.to_dict(), indent=2, ensure_ascii=False))

            # Alerts anzeigen
            if alert_system.alerts:
                print(f"\n⚠️  {len(alert_system.alerts)} Alerts ausgelöst!")

            # Exit-Code basierend auf kritischen Vorfällen
            return 1 if summary.get("critical_count", 0) > 0 else 0

        else:
            # Einzeldatei-Modus
            result = scorer.score_file(input_path)
            alert_system.check(result)

            print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))

            if args.stats:
                print("\n--- Agent-Statistik ---")
                stats = scorer.get_agent_statistics()
                if result.agent_id in stats:
                    print(json.dumps(stats[result.agent_id].to_dict(), indent=2, ensure_ascii=False))

            # Exit-Code
            if result.risk_level == RiskLevel.CRITICAL:
                return 3
            elif result.risk_level == RiskLevel.HIGH:
                return 2
            elif result.risk_level == RiskLevel.MEDIUM:
                return 1
            return 0

    except FileNotFoundError as e:
        logger.error(f"Datei nicht gefunden: {e}")
        return 4
    except json.JSONDecodeError as e:
        logger.error(f"Ungültiges JSON: {e}")
        return 5
    except ValueError as e:
        logger.error(f"Validierungsfehler: {e}")
        return 6
    except Exception as e:
        logger.error(f"Unerwarteter Fehler: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 99


if __name__ == "__main__":
    sys.exit(main())
