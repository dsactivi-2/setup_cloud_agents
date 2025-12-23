/**
 * Enforcement Router - Human approval endpoints for blocked tasks
 *
 * These endpoints require human intervention.
 * No automation can approve a STOP_REQUIRED task.
 */

import { Router } from "express";
import { z } from "zod";
import type { EnforcementGate } from "../audit/enforcementGate.js";
import { verifyClaims, generateVerificationReport } from "../audit/claimVerifier.js";

const ApproveSchema = z.object({
  approver: z.string().min(1, "Approver identity required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  acknowledged_risks: z.array(z.string()).min(1, "Must acknowledge at least one risk"),
});

const RejectSchema = z.object({
  rejector: z.string().min(1, "Rejector identity required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

const VerifyClaimsSchema = z.object({
  content: z.string().min(1),
  artefacts: z.array(z.string()),
});

export function createEnforcementRouter(gate: EnforcementGate): Router {
  const router = Router();

  /**
   * GET /enforcement/blocked
   * List all currently blocked tasks awaiting human approval
   */
  router.get("/blocked", (_req, res) => {
    const pending = gate.getAllPendingApprovals();
    res.json({
      blocked_count: pending.length,
      tasks: pending,
      message: pending.length > 0
        ? "⚠️ Tasks blocked. Human approval required."
        : "✅ No blocked tasks.",
    });
  });

  /**
   * GET /enforcement/blocked/:taskId
   * Get details of a specific blocked task
   */
  router.get("/blocked/:taskId", (req, res) => {
    const pending = gate.getPendingApproval(req.params.taskId);

    if (!pending) {
      return res.status(404).json({
        error: "Task not found or not blocked",
      });
    }

    res.json({
      ...pending,
      message: "⚠️ This task is BLOCKED. Human approval required to proceed.",
      required_fields: {
        approver: "Your identity (email/name)",
        reason: "Why you are approving despite STOP (min 10 chars)",
        acknowledged_risks: "List of risks you are accepting",
      },
    });
  });

  /**
   * POST /enforcement/approve/:taskId
   * Approve a blocked task - REQUIRES human action
   */
  router.post("/approve/:taskId", (req, res) => {
    try {
      const parsed = ApproveSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid approval request",
          details: parsed.error.issues,
          required_fields: {
            approver: "string (required)",
            reason: "string min 10 chars (required)",
            acknowledged_risks: "string[] min 1 item (required)",
          },
        });
      }

      const decision = gate.approve(
        req.params.taskId,
        parsed.data.approver,
        parsed.data.reason,
        parsed.data.acknowledged_risks
      );

      res.json({
        status: "APPROVED",
        decision,
        warning: "⚠️ Task approved despite STOP condition. This has been logged.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  /**
   * POST /enforcement/reject/:taskId
   * Reject a blocked task permanently
   */
  router.post("/reject/:taskId", (req, res) => {
    try {
      const parsed = RejectSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid rejection request",
          details: parsed.error.issues,
        });
      }

      gate.reject(req.params.taskId, parsed.data.rejector, parsed.data.reason);

      res.json({
        status: "REJECTED",
        message: "Task has been permanently stopped and logged.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  /**
   * POST /enforcement/verify-claims
   * Verify claims against artefacts (for testing/validation)
   */
  router.post("/verify-claims", (req, res) => {
    try {
      const parsed = VerifyClaimsSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid verification request",
          details: parsed.error.issues,
        });
      }

      const result = verifyClaims(parsed.data.content, parsed.data.artefacts);
      const report = generateVerificationReport(result);

      res.json({
        ...result,
        report,
        status: result.allVerified ? "VERIFIED" : "STOP_REQUIRED",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
