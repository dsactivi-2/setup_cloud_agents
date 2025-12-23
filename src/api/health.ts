/**
 * Health Check Router
 */

import { Router } from "express";
import type { Database } from "../db/database.js";
import type { QueueAdapter } from "../queue/queue.js";

export function createHealthRouter(db: Database, queue: QueueAdapter): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      components: {
        database: db.isHealthy() ? "healthy" : "unhealthy",
        queue: queue.isHealthy() ? "healthy" : "degraded",
      },
      mode: queue.mode,
    };

    const statusCode = health.components.database === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  router.get("/ready", (_req, res) => {
    if (db.isHealthy()) {
      res.json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: "database unavailable" });
    }
  });

  router.get("/live", (_req, res) => {
    res.json({ live: true });
  });

  return router;
}
