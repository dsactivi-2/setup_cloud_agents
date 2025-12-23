/**
 * Tasks Router - Create and manage supervised tasks
 */

import { Router } from "express";
import { z } from "zod";
import type { Database } from "../db/database.js";
import type { QueueAdapter } from "../queue/queue.js";

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assignee: z.enum(["cloud_assistant"]).default("cloud_assistant"),
});

export function createTaskRouter(db: Database, queue: QueueAdapter): Router {
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
        ...parsed.data,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      // Add to queue
      await queue.add("process_task", { taskId: task.id });

      res.status(201).json({
        id: task.id,
        status: "pending",
        message: "Task created and queued for processing",
      });
    } catch (error) {
      console.error("Failed to create task:", error);
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

      res.json(task);
    } catch (error) {
      console.error("Failed to get task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
