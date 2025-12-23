/**
 * Database Module - SQLite persistence layer
 */

import BetterSqlite3 from "better-sqlite3";
import { randomUUID } from "crypto";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "stopped";
  assignee: string;
  created_at: string;
  updated_at?: string;
  stop_score?: number;
}

export interface AuditEntry {
  id: string;
  task_id?: string;
  decision: "APPROVED" | "STOP_REQUIRED";
  final_status: "COMPLETE" | "COMPLETE_WITH_GAPS" | "STOP_REQUIRED";
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  stop_score: number;
  verified_artefacts: string;
  missing_invalid_parts: string;
  required_next_action: string;
  created_at: string;
}

export interface Database {
  isHealthy(): boolean;
  createTask(task: Omit<Task, "id">): Task;
  getTask(id: string): Task | undefined;
  listTasks(): Task[];
  updateTask(id: string, updates: Partial<Task>): Task | undefined;
  createAuditEntry(entry: Omit<AuditEntry, "id" | "created_at">): AuditEntry;
  getAuditEntry(id: string): AuditEntry | undefined;
  listAuditEntries(limit?: number): AuditEntry[];
  getStopScoreStats(): { total: number; stopped: number; avgScore: number };
}

export function initDatabase(): Database {
  const dbPath = process.env.SQLITE_PATH ?? "./data/app.sqlite";

  let db: BetterSqlite3.Database;

  try {
    db = new BetterSqlite3(dbPath);
    db.pragma("journal_mode = WAL");

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        assignee TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        stop_score INTEGER
      );

      CREATE TABLE IF NOT EXISTS audit_entries (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        decision TEXT NOT NULL,
        final_status TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        stop_score INTEGER NOT NULL,
        verified_artefacts TEXT NOT NULL,
        missing_invalid_parts TEXT NOT NULL,
        required_next_action TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_audit_task_id ON audit_entries(task_id);
    `);
  } catch (error) {
    console.warn("SQLite unavailable, using in-memory fallback:", error);
    db = new BetterSqlite3(":memory:");
    db.exec(`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        assignee TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        stop_score INTEGER
      );

      CREATE TABLE audit_entries (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        decision TEXT NOT NULL,
        final_status TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        stop_score INTEGER NOT NULL,
        verified_artefacts TEXT NOT NULL,
        missing_invalid_parts TEXT NOT NULL,
        required_next_action TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  return {
    isHealthy(): boolean {
      try {
        db.prepare("SELECT 1").get();
        return true;
      } catch {
        return false;
      }
    },

    createTask(task: Omit<Task, "id">): Task {
      const id = randomUUID();
      const stmt = db.prepare(`
        INSERT INTO tasks (id, title, description, priority, status, assignee, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, task.title, task.description ?? null, task.priority, task.status, task.assignee, task.created_at);
      return { id, ...task };
    },

    getTask(id: string): Task | undefined {
      const stmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
      return stmt.get(id) as Task | undefined;
    },

    listTasks(): Task[] {
      const stmt = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100");
      return stmt.all() as Task[];
    },

    updateTask(id: string, updates: Partial<Task>): Task | undefined {
      const current = this.getTask(id);
      if (!current) return undefined;

      const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
      const stmt = db.prepare(`
        UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, updated_at = ?, stop_score = ?
        WHERE id = ?
      `);
      stmt.run(updated.title, updated.description ?? null, updated.priority, updated.status, updated.updated_at, updated.stop_score ?? null, id);
      return updated;
    },

    createAuditEntry(entry: Omit<AuditEntry, "id" | "created_at">): AuditEntry {
      const id = randomUUID();
      const created_at = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT INTO audit_entries (id, task_id, decision, final_status, risk_level, stop_score, verified_artefacts, missing_invalid_parts, required_next_action, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, entry.task_id ?? null, entry.decision, entry.final_status, entry.risk_level, entry.stop_score, entry.verified_artefacts, entry.missing_invalid_parts, entry.required_next_action, created_at);
      return { id, created_at, ...entry };
    },

    getAuditEntry(id: string): AuditEntry | undefined {
      const stmt = db.prepare("SELECT * FROM audit_entries WHERE id = ?");
      return stmt.get(id) as AuditEntry | undefined;
    },

    listAuditEntries(limit = 50): AuditEntry[] {
      const stmt = db.prepare("SELECT * FROM audit_entries ORDER BY created_at DESC LIMIT ?");
      return stmt.all(limit) as AuditEntry[];
    },

    getStopScoreStats(): { total: number; stopped: number; avgScore: number } {
      const totalStmt = db.prepare("SELECT COUNT(*) as count FROM audit_entries");
      const stoppedStmt = db.prepare("SELECT COUNT(*) as count FROM audit_entries WHERE decision = 'STOP_REQUIRED'");
      const avgStmt = db.prepare("SELECT AVG(stop_score) as avg FROM audit_entries");

      const total = (totalStmt.get() as { count: number }).count;
      const stopped = (stoppedStmt.get() as { count: number }).count;
      const avgScore = (avgStmt.get() as { avg: number | null }).avg ?? 0;

      return { total, stopped, avgScore: Math.round(avgScore * 100) / 100 };
    },
  };
}
