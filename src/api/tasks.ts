/**
 * Tasks Router - Create and manage supervised tasks
 *
 * ENFORCEMENT: All tasks are evaluated by the EnforcementGate.
 * If STOP_REQUIRED → task is BLOCKED until human approval.
 */

import { Router } from "express";
import { z } from "zod";
import type { Database } from "../db/database.js";
import type { QueueAdapter } from "../queue/queue.js";
import type { EnforcementGate } from "../audit/enforcementGate.js";

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assignee: z.enum(["cloud_assistant"]).default("cloud_assistant"),
  artefacts: z.array(z.string()).optional().default([]),
});

const SubmitWorkSchema = z.object({
  content: z.string().min(1),
  artefacts: z.array(z.string()).default([]),
  claims: z.array(z.string()).optional().default([]),
});

export function createTaskRouter(db: Database, queue: QueueAdapter, gate: EnforcementGate): Router {
  const router = Router();

  // Create task
  router.post("/", async (req, res) => {
    try {
      const parsed = CreateTaskSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const task = db.createTask({
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        assignee: parsed.data.assignee,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      // ENFORCEMENT GATE: Evaluate task content before queuing
      const content = `${parsed.data.title} ${parsed.data.description ?? ""}`;
      const gateDecision = gate.evaluate(task.id, content, parsed.data.artefacts);

      if (gateDecision.status === "BLOCKED") {
        // Task is BLOCKED - do NOT queue, require human approval
        db.updateTask(task.id, { status: "stopped", stop_score: gateDecision.stopScore });

        return res.status(202).json({
          id: task.id,
          status: "BLOCKED",
          stop_score: gateDecision.stopScore,
          reasons: gateDecision.reasons,
          message: "⚠️ STOP_REQUIRED: Task blocked. Human approval needed at /api/enforcement/approve/" + task.id,
          approval_url: `/api/enforcement/approve/${task.id}`,
        });
      }

      // Task passed gate - queue for processing
      await queue.add("process_task", { taskId: task.id });

      res.status(201).json({
        id: task.id,
        status: "pending",
        gate_status: "OPEN",
        message: "Task created and queued for processing",
      });
    } catch (error) {
      console.error("Failed to create task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Submit work for a task (triggers enforcement gate)
  router.post("/:id/submit", async (req, res) => {
    try {
      const task = db.getTask(req.params.id);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const parsed = SubmitWorkSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid submission",
          details: parsed.error.issues,
        });
      }

      // ENFORCEMENT GATE: Evaluate submitted work
      const gateDecision = gate.evaluate(task.id, parsed.data.content, parsed.data.artefacts);

      if (gateDecision.status === "BLOCKED") {
        // Work is BLOCKED - cannot complete task
        db.updateTask(task.id, { status: "stopped", stop_score: gateDecision.stopScore });

        return res.status(202).json({
          id: task.id,
          status: "BLOCKED",
          stop_score: gateDecision.stopScore,
          reasons: gateDecision.reasons,
          message: "⚠️ STOP_REQUIRED: Submission blocked. Human approval needed.",
          approval_url: `/api/enforcement/approve/${task.id}`,
        });
      }

      // Work passed gate - mark as completed
      db.updateTask(task.id, { status: "completed", stop_score: gateDecision.stopScore });

      res.json({
        id: task.id,
        status: "completed",
        gate_status: "OPEN",
        stop_score: gateDecision.stopScore,
        message: "✅ Work submitted and approved",
      });
    } catch (error) {
      console.error("Failed to submit work:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // List tasks
  router.get("/", (_req, res) => {
    try {
      const tasks = db.listTasks();
      res.json({ tasks, count: tasks.length });
    } catch (error) {
      console.error("Failed to list tasks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get task by ID
  router.get("/:id", (req, res) => {
    try {
      const task = db.getTask(req.params.id);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Check if task is blocked
      const isBlocked = gate.isBlocked(req.params.id);
      const pending = gate.getPendingApproval(req.params.id);

      res.json({
        ...task,
        enforcement: {
          blocked: isBlocked,
          pending_approval: pending ?? null,
          approval_url: isBlocked ? `/api/enforcement/approve/${task.id}` : null,
        },
      });
    } catch (error) {
      console.error("Failed to get task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
