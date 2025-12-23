/**
 * Enforcement Gate - Hard STOP enforcement
 *
 * This module ensures that STOP_REQUIRED decisions are BLOCKING.
 * No task proceeds without explicit human approval after STOP.
 */

import type { Database } from "../db/database.js";
import { computeStopScore, analyzeContent, type StopReason } from "../audit/stopScorer.js";

export type GateStatus = "OPEN" | "BLOCKED" | "AWAITING_APPROVAL";

export interface GateDecision {
  status: GateStatus;
  taskId: string;
  stopScore: number;
  reasons: StopReason[];
  blockedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PendingApproval {
  taskId: string;
  stopScore: number;
  reasons: StopReason[];
  blockedAt: string;
  requiredAction: string;
}

/**
 * Enforcement Gate
 *
 * HARD RULES:
 * 1. If STOP_REQUIRED → task is BLOCKED, period.
 * 2. No continuation without human approval.
 * 3. Approval requires explicit action + reason.
 * 4. All decisions are audited.
 */
export class EnforcementGate {
  private blockedTasks: Map<string, PendingApproval> = new Map();
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Evaluate content and determine if it can proceed
   * Returns BLOCKED if any STOP condition is met
   */
  evaluate(taskId: string, content: string, artefacts: string[]): GateDecision {
    const reasons: StopReason[] = [];

    // Analyze content for violations
    const contentReasons = analyzeContent(content);
    reasons.push(...contentReasons);

    // Check for unproven claims (claims without artefacts)
    if (this.hasUnprovenClaims(content, artefacts)) {
      reasons.push("UNPROVEN_CLAIM");
    }

    // Compute score
    const scoreResult = computeStopScore([...new Set(reasons)]);

    // HARD GATE: If stop required, BLOCK immediately
    if (scoreResult.stopRequired) {
      const pending: PendingApproval = {
        taskId,
        stopScore: scoreResult.score,
        reasons: scoreResult.reasons,
        blockedAt: new Date().toISOString(),
        requiredAction: `Address: ${scoreResult.reasons.join(", ")}`,
      };

      this.blockedTasks.set(taskId, pending);

      // Log to audit
      this.db.createAuditEntry({
        task_id: taskId,
        decision: "STOP_REQUIRED",
        final_status: "STOP_REQUIRED",
        risk_level: scoreResult.severity,
        stop_score: scoreResult.score,
        verified_artefacts: JSON.stringify(artefacts),
        missing_invalid_parts: JSON.stringify(scoreResult.reasons),
        required_next_action: "BLOCKED - Awaiting human approval",
      });

      return {
        status: "BLOCKED",
        taskId,
        stopScore: scoreResult.score,
        reasons: scoreResult.reasons,
        blockedAt: pending.blockedAt,
      };
    }

    // OPEN - can proceed
    return {
      status: "OPEN",
      taskId,
      stopScore: scoreResult.score,
      reasons: scoreResult.reasons,
    };
  }

  /**
   * Check if task is blocked
   */
  isBlocked(taskId: string): boolean {
    return this.blockedTasks.has(taskId);
  }

  /**
   * Get pending approval for a task
   */
  getPendingApproval(taskId: string): PendingApproval | undefined {
    return this.blockedTasks.get(taskId);
  }

  /**
   * Get all pending approvals
   */
  getAllPendingApprovals(): PendingApproval[] {
    return Array.from(this.blockedTasks.values());
  }

  /**
   * Approve a blocked task - REQUIRES explicit human action
   *
   * @param taskId - The blocked task
   * @param approver - Human identifier (email, name, etc.)
   * @param reason - Why this is being approved despite STOP
   * @param acknowledgedRisks - Must explicitly list acknowledged risks
   */
  approve(
    taskId: string,
    approver: string,
    reason: string,
    acknowledgedRisks: string[]
  ): GateDecision {
    const pending = this.blockedTasks.get(taskId);

    if (!pending) {
      throw new Error(`Task ${taskId} is not blocked or does not exist`);
    }

    if (!approver || approver.trim().length === 0) {
      throw new Error("Approver identity is required");
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error("Approval reason must be at least 10 characters");
    }

    if (acknowledgedRisks.length === 0) {
      throw new Error("Must explicitly acknowledge at least one risk");
    }

    // Log the override to audit
    this.db.createAuditEntry({
      task_id: taskId,
      decision: "APPROVED",
      final_status: "COMPLETE_WITH_GAPS",
      risk_level: pending.stopScore >= 70 ? "CRITICAL" : "HIGH",
      stop_score: pending.stopScore,
      verified_artefacts: JSON.stringify([]),
      missing_invalid_parts: JSON.stringify({
        original_reasons: pending.reasons,
        override_reason: reason,
        acknowledged_risks: acknowledgedRisks,
      }),
      required_next_action: `OVERRIDE by ${approver}: ${reason}`,
    });

    // Remove from blocked
    this.blockedTasks.delete(taskId);

    return {
      status: "OPEN",
      taskId,
      stopScore: pending.stopScore,
      reasons: pending.reasons,
      approvedBy: approver,
      approvedAt: new Date().toISOString(),
    };
  }

  /**
   * Reject and keep blocked - explicit denial
   */
  reject(taskId: string, rejector: string, reason: string): void {
    const pending = this.blockedTasks.get(taskId);

    if (!pending) {
      throw new Error(`Task ${taskId} is not blocked`);
    }

    // Update the task status to permanently stopped
    this.db.updateTask(taskId, {
      status: "stopped",
      stop_score: pending.stopScore,
    });

    // Log rejection
    this.db.createAuditEntry({
      task_id: taskId,
      decision: "STOP_REQUIRED",
      final_status: "STOP_REQUIRED",
      risk_level: "CRITICAL",
      stop_score: pending.stopScore,
      verified_artefacts: JSON.stringify([]),
      missing_invalid_parts: JSON.stringify(pending.reasons),
      required_next_action: `REJECTED by ${rejector}: ${reason}`,
    });

    this.blockedTasks.delete(taskId);
  }

  /**
   * Check for unproven claims
   */
  private hasUnprovenClaims(content: string, artefacts: string[]): boolean {
    const claimPatterns = [
      /implemented\s+(\d+)/i,
      /created\s+(\d+)/i,
      /scraped\s+(\d+)/i,
      /deployed\s+(\d+)/i,
      /connected\s+(\d+)/i,
    ];

    for (const pattern of claimPatterns) {
      const match = content.match(pattern);
      if (match) {
        const claimedCount = parseInt(match[1], 10);
        // If claiming N things but not providing N artefacts, it's unproven
        if (artefacts.length < claimedCount) {
          return true;
        }
      }
    }

    return false;
  }
}

/**
 * Create enforcement gate instance
 */
export function createEnforcementGate(db: Database): EnforcementGate {
  return new EnforcementGate(db);
}
