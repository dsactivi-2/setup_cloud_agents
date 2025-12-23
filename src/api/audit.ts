/**
 * Audit Router - View audit logs and supervisor decisions
 */

import { Router } from "express";
import type { Database } from "../db/database.js";

export function createAuditRouter(db: Database): Router {
  const router = Router();

  // List audit entries
  router.get("/", (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const entries = db.listAuditEntries(limit);
      res.json({ entries, count: entries.length });
    } catch (error) {
      console.error("Failed to list audit entries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get audit entry by ID
  router.get("/:id", (req, res) => {
    try {
      const entry = db.getAuditEntry(req.params.id);

      if (!entry) {
        return res.status(404).json({ error: "Audit entry not found" });
      }

      res.json(entry);
    } catch (error) {
      console.error("Failed to get audit entry:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get stop score statistics
  router.get("/stats/stop-scores", (_req, res) => {
    try {
      const stats = db.getStopScoreStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get stop score stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
