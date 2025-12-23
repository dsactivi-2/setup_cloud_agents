/**
 * Code Cloud Agents - Main Entry Point
 * Supervised AI system with Engineering Lead Supervisor and Cloud Assistant
 */

import express from "express";
import { createHealthRouter } from "./api/health.js";
import { createTaskRouter } from "./api/tasks.js";
import { createAuditRouter } from "./api/audit.js";
import { initDatabase } from "./db/database.js";
import { initQueue } from "./queue/queue.js";

const PORT = process.env.PORT ?? 3000;

async function main() {
  console.log("🚀 Starting Code Cloud Agents...");

  // Initialize database
  const db = initDatabase();
  console.log("✅ Database initialized");

  // Initialize queue
  const queue = initQueue();
  console.log("✅ Queue initialized (mode:", queue.mode, ")");

  // Create Express app
  const app = express();
  app.use(express.json());

  // Mount routers
  app.use("/health", createHealthRouter(db, queue));
  app.use("/api/tasks", createTaskRouter(db, queue));
  app.use("/api/audit", createAuditRouter(db));

  // Root endpoint
  app.get("/", (_req, res) => {
    res.json({
      name: "code-cloud-agents",
      version: "0.1.0",
      status: "running",
      supervisor: "ENGINEERING_LEAD_SUPERVISOR",
      mode: "SUPERVISED",
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log("📋 Endpoints:");
    console.log("   GET  /           - Service info");
    console.log("   GET  /health     - Health check");
    console.log("   POST /api/tasks  - Create task");
    console.log("   GET  /api/tasks  - List tasks");
    console.log("   GET  /api/audit  - Audit log");
  });
}

main().catch((error) => {
  console.error("❌ Failed to start:", error);
  process.exit(1);
});
