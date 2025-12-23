/**
 * Meta Supervisor Module
 * Routes tasks across systems and aggregates health/metrics
 */

export interface RouteDecision {
  targetSystem: string;
  reason: string;
  constraints: string[];
  monitoringNotes: string[];
}

export interface SystemHealth {
  systemId: string;
  status: "healthy" | "degraded" | "unhealthy";
  taskCompletionRate: number;
  stopRate: number;
  avgStopScore: number;
  queueDepth: number;
  lastUpdated: string;
}

export interface AggregatedMetrics {
  totalTasks: number;
  completedTasks: number;
  stoppedTasks: number;
  avgStopScore: number;
  systemHealth: Record<string, SystemHealth>;
}

/**
 * Meta Supervisor
 * Routes tasks and monitors system health
 */
export class MetaSupervisor {
  private systems: Map<string, SystemHealth> = new Map();

  constructor() {
    // Register default system
    this.registerSystem("code-cloud-agents");
  }

  /**
   * Register a system for routing
   */
  registerSystem(systemId: string): void {
    this.systems.set(systemId, {
      systemId,
      status: "healthy",
      taskCompletionRate: 1.0,
      stopRate: 0,
      avgStopScore: 0,
      queueDepth: 0,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * Route a task to the appropriate system
   */
  route(taskType: string, constraints: string[] = []): RouteDecision {
    // For now, route everything to the main system
    const targetSystem = "code-cloud-agents";
    const systemHealth = this.systems.get(targetSystem);

    const monitoringNotes: string[] = [];
    if (systemHealth) {
      if (systemHealth.status !== "healthy") {
        monitoringNotes.push(`System ${targetSystem} is ${systemHealth.status}`);
      }
      if (systemHealth.queueDepth > 10) {
        monitoringNotes.push(`High queue depth: ${systemHealth.queueDepth}`);
      }
      if (systemHealth.stopRate > 0.3) {
        monitoringNotes.push(`High stop rate: ${(systemHealth.stopRate * 100).toFixed(1)}%`);
      }
    }

    return {
      targetSystem,
      reason: `Task type "${taskType}" routed to primary system`,
      constraints,
      monitoringNotes,
    };
  }

  /**
   * Update system health metrics
   */
  updateHealth(systemId: string, updates: Partial<SystemHealth>): void {
    const current = this.systems.get(systemId);
    if (!current) {
      throw new Error(`System ${systemId} not registered`);
    }

    this.systems.set(systemId, {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * Get aggregated metrics across all systems
   */
  getAggregatedMetrics(): AggregatedMetrics {
    let totalTasks = 0;
    let completedTasks = 0;
    let stoppedTasks = 0;
    let totalStopScore = 0;
    let scoreCount = 0;

    const systemHealth: Record<string, SystemHealth> = {};

    for (const [id, health] of this.systems) {
      systemHealth[id] = health;

      // Aggregate metrics (placeholder logic)
      if (health.avgStopScore > 0) {
        totalStopScore += health.avgStopScore;
        scoreCount++;
      }
    }

    return {
      totalTasks,
      completedTasks,
      stoppedTasks,
      avgStopScore: scoreCount > 0 ? totalStopScore / scoreCount : 0,
      systemHealth,
    };
  }

  /**
   * Check if any system requires attention
   */
  checkAlerts(): string[] {
    const alerts: string[] = [];

    for (const [id, health] of this.systems) {
      if (health.status === "unhealthy") {
        alerts.push(`CRITICAL: System ${id} is unhealthy`);
      } else if (health.status === "degraded") {
        alerts.push(`WARNING: System ${id} is degraded`);
      }

      if (health.stopRate > 0.5) {
        alerts.push(`HIGH STOP RATE: System ${id} has ${(health.stopRate * 100).toFixed(1)}% stop rate`);
      }

      if (health.queueDepth > 50) {
        alerts.push(`QUEUE OVERLOAD: System ${id} has ${health.queueDepth} pending tasks`);
      }
    }

    return alerts;
  }
}

/**
 * Create a Meta Supervisor instance
 */
export function createMetaSupervisor(): MetaSupervisor {
  return new MetaSupervisor();
}
