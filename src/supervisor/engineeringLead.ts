/**
 * Engineering Lead Supervisor Module
 * Controls truth, completeness, and cross-layer consistency
 */

import { computeStopScore, analyzeContent, type StopReason, type StopScoreResult } from "../audit/stopScorer.js";

export interface SupervisorDecision {
  decision: "APPROVED" | "STOP_REQUIRED";
  finalStatus: "COMPLETE" | "COMPLETE_WITH_GAPS" | "STOP_REQUIRED";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  stopScore: number;
  verifiedArtefacts: string[];
  missingInvalidParts: string[];
  requiredNextAction: string;
}

export interface WorkSubmission {
  taskId: string;
  description: string;
  artefacts: string[];
  claims: string[];
  hasTests: boolean;
  hasSchema: boolean;
  hasDeployConfig: boolean;
}

/**
 * Engineering Lead Supervisor
 * Reviews work submissions and makes approval decisions
 */
export class EngineeringLeadSupervisor {
  private readonly stopThreshold: number;

  constructor(stopThreshold = 40) {
    this.stopThreshold = stopThreshold;
  }

  /**
   * Reviews a work submission and returns a decision
   */
  review(submission: WorkSubmission): SupervisorDecision {
    const reasons: StopReason[] = [];

    // Check for missing artefacts
    if (submission.artefacts.length === 0) {
      reasons.push("UNPROVEN_CLAIM");
    }

    // Check for missing tests
    if (!submission.hasTests) {
      reasons.push("MISSING_TESTS");
    }

    // Check for missing schema
    if (!submission.hasSchema) {
      reasons.push("MISSING_SQL_OR_SCHEMA");
    }

    // Check for missing deploy config
    if (!submission.hasDeployConfig) {
      reasons.push("MISSING_DEPLOY_CONFIG");
    }

    // Analyze description for problematic content
    const contentReasons = analyzeContent(submission.description);
    reasons.push(...contentReasons);

    // Analyze claims
    for (const claim of submission.claims) {
      const claimReasons = analyzeContent(claim);
      reasons.push(...claimReasons);
    }

    // Compute stop score
    const scoreResult = computeStopScore([...new Set(reasons)]);

    // Make decision
    const decision = this.makeDecision(scoreResult, submission);

    return decision;
  }

  private makeDecision(scoreResult: StopScoreResult, submission: WorkSubmission): SupervisorDecision {
    const stopRequired = scoreResult.stopRequired;

    let finalStatus: "COMPLETE" | "COMPLETE_WITH_GAPS" | "STOP_REQUIRED";
    if (stopRequired) {
      finalStatus = "STOP_REQUIRED";
    } else if (scoreResult.reasons.length > 0) {
      finalStatus = "COMPLETE_WITH_GAPS";
    } else {
      finalStatus = "COMPLETE";
    }

    const missingParts: string[] = [];
    if (!submission.hasTests) missingParts.push("Tests");
    if (!submission.hasSchema) missingParts.push("Schema/SQL");
    if (!submission.hasDeployConfig) missingParts.push("Deploy config");
    if (submission.artefacts.length === 0) missingParts.push("Verifiable artefacts");

    let nextAction: string;
    if (stopRequired) {
      nextAction = `STOP: Address ${scoreResult.reasons.join(", ")} before proceeding`;
    } else if (missingParts.length > 0) {
      nextAction = `Add missing: ${missingParts.join(", ")}`;
    } else {
      nextAction = "Proceed to next task";
    }

    return {
      decision: stopRequired ? "STOP_REQUIRED" : "APPROVED",
      finalStatus,
      riskLevel: scoreResult.severity,
      stopScore: scoreResult.score,
      verifiedArtefacts: submission.artefacts,
      missingInvalidParts: missingParts,
      requiredNextAction: nextAction,
    };
  }

  /**
   * Quick validation for common issues
   */
  quickValidate(content: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (content.includes("$") || content.includes("€")) {
      if (!content.toLowerCase().includes("unknown")) {
        issues.push("Pricing mentioned without UNKNOWN marker");
      }
    }

    if (content.toLowerCase().includes("legal") || content.toLowerCase().includes("warranty")) {
      issues.push("Legal statement detected");
    }

    const claimWords = ["implemented", "deployed", "connected", "scraped"];
    for (const word of claimWords) {
      if (content.toLowerCase().includes(word) && !content.includes("file:")) {
        issues.push(`Claim "${word}" without file reference`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

/**
 * Create a default Engineering Lead Supervisor instance
 */
export function createEngineeringLeadSupervisor(): EngineeringLeadSupervisor {
  const threshold = parseInt(process.env.STOP_SCORE_THRESHOLD ?? "40", 10);
  return new EngineeringLeadSupervisor(threshold);
}
