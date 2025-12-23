/**
 * STOP Scorer - Computes risk scores for supervisor decisions
 */

export type StopReason =
  | "PRICING_WITHOUT_FACT"
  | "LEGAL_STATEMENT"
  | "UNPROVEN_CLAIM"
  | "CROSS_LAYER_MISMATCH"
  | "MISSING_SQL_OR_SCHEMA"
  | "MISSING_TESTS"
  | "MISSING_DEPLOY_CONFIG"
  | "COST_OR_LOAD_RISK";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface StopScoreResult {
  score: number;
  severity: Severity;
  stopRequired: boolean;
  reasons: StopReason[];
}

const REASON_WEIGHTS: Record<StopReason, number> = {
  PRICING_WITHOUT_FACT: 40,
  LEGAL_STATEMENT: 40,
  UNPROVEN_CLAIM: 30,
  CROSS_LAYER_MISMATCH: 25,
  MISSING_SQL_OR_SCHEMA: 25,
  MISSING_TESTS: 15,
  MISSING_DEPLOY_CONFIG: 15,
  COST_OR_LOAD_RISK: 20,
};

/**
 * Computes a stop score based on identified risk reasons
 * @param reasons Array of stop reasons identified
 * @returns StopScoreResult with score, severity, and stop requirement
 */
export function computeStopScore(reasons: StopReason[]): StopScoreResult {
  let score = 0;

  for (const reason of reasons) {
    score += REASON_WEIGHTS[reason] ?? 0;
  }

  // Cap at 100
  if (score > 100) {
    score = 100;
  }

  // Determine severity
  let severity: Severity;
  if (score >= 70) {
    severity = "CRITICAL";
  } else if (score >= 45) {
    severity = "HIGH";
  } else if (score >= 20) {
    severity = "MEDIUM";
  } else {
    severity = "LOW";
  }

  // STOP required if score >= 40
  const stopRequired = score >= 40;

  return {
    score,
    severity,
    stopRequired,
    reasons,
  };
}

/**
 * Analyzes text content for potential stop reasons
 * @param content Text content to analyze
 * @returns Array of identified stop reasons
 */
export function analyzeContent(content: string): StopReason[] {
  const reasons: StopReason[] = [];
  const lowerContent = content.toLowerCase();

  // Check for pricing claims
  if (
    lowerContent.includes("price") ||
    lowerContent.includes("cost") ||
    lowerContent.includes("€") ||
    lowerContent.includes("$")
  ) {
    if (!lowerContent.includes("unknown")) {
      reasons.push("PRICING_WITHOUT_FACT");
    }
  }

  // Check for legal statements
  if (
    lowerContent.includes("legal") ||
    lowerContent.includes("liability") ||
    lowerContent.includes("warranty") ||
    lowerContent.includes("guarantee")
  ) {
    reasons.push("LEGAL_STATEMENT");
  }

  // Check for unproven claims
  const claimPatterns = [
    "implemented",
    "deployed",
    "connected",
    "integrated",
    "scraped",
    "completed",
  ];

  for (const pattern of claimPatterns) {
    if (lowerContent.includes(pattern) && !lowerContent.includes("file:")) {
      reasons.push("UNPROVEN_CLAIM");
      break;
    }
  }

  return reasons;
}
