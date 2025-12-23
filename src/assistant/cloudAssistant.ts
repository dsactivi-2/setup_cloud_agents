/**
 * Cloud Assistant Module
 * Executes work under supervision with evidence collection
 */

export interface TaskExecution {
  taskId: string;
  description: string;
  steps: ExecutionStep[];
  artefacts: Artefact[];
  status: "in_progress" | "completed" | "blocked";
  risks: string[];
  gaps: string[];
}

export interface ExecutionStep {
  description: string;
  completed: boolean;
  evidence?: string;
}

export interface Artefact {
  type: "file" | "config" | "test" | "command_output" | "schema";
  path: string;
  description: string;
}

export interface StatusProposal {
  status: "COMPLETE" | "COMPLETE_WITH_GAPS" | "STOP_REQUIRED";
  evidence: Artefact[];
  risks: string[];
  gaps: string[];
  nextSteps: string[];
}

/**
 * Cloud Assistant
 * Executes engineering tasks and collects evidence
 */
export class CloudAssistant {
  private currentExecution: TaskExecution | null = null;

  /**
   * Start executing a task
   */
  startTask(taskId: string, description: string): TaskExecution {
    this.currentExecution = {
      taskId,
      description,
      steps: [],
      artefacts: [],
      status: "in_progress",
      risks: [],
      gaps: [],
    };

    return this.currentExecution;
  }

  /**
   * Add an execution step
   */
  addStep(description: string, evidence?: string): void {
    if (!this.currentExecution) {
      throw new Error("No task in progress");
    }

    this.currentExecution.steps.push({
      description,
      completed: !!evidence,
      evidence,
    });
  }

  /**
   * Record an artefact
   */
  recordArtefact(artefact: Artefact): void {
    if (!this.currentExecution) {
      throw new Error("No task in progress");
    }

    this.currentExecution.artefacts.push(artefact);
  }

  /**
   * Record a risk
   */
  recordRisk(risk: string): void {
    if (!this.currentExecution) {
      throw new Error("No task in progress");
    }

    this.currentExecution.risks.push(risk);
  }

  /**
   * Record a gap
   */
  recordGap(gap: string): void {
    if (!this.currentExecution) {
      throw new Error("No task in progress");
    }

    this.currentExecution.gaps.push(gap);
  }

  /**
   * Complete the current task and generate status proposal
   */
  complete(): StatusProposal {
    if (!this.currentExecution) {
      throw new Error("No task in progress");
    }

    const execution = this.currentExecution;
    execution.status = "completed";

    // Determine proposed status
    let status: "COMPLETE" | "COMPLETE_WITH_GAPS" | "STOP_REQUIRED";
    if (execution.risks.length > 0) {
      status = "STOP_REQUIRED";
    } else if (execution.gaps.length > 0) {
      status = "COMPLETE_WITH_GAPS";
    } else {
      status = "COMPLETE";
    }

    // Generate next steps
    const nextSteps: string[] = [];
    if (execution.gaps.length > 0) {
      nextSteps.push(`Address gaps: ${execution.gaps.join(", ")}`);
    }
    if (execution.risks.length > 0) {
      nextSteps.push(`Mitigate risks: ${execution.risks.join(", ")}`);
    }
    if (nextSteps.length === 0) {
      nextSteps.push("Submit for supervisor review");
    }

    const proposal: StatusProposal = {
      status,
      evidence: execution.artefacts,
      risks: execution.risks,
      gaps: execution.gaps,
      nextSteps,
    };

    this.currentExecution = null;

    return proposal;
  }

  /**
   * Mark task as blocked
   */
  block(reason: string): StatusProposal {
    if (!this.currentExecution) {
      throw new Error("No task in progress");
    }

    this.currentExecution.status = "blocked";
    this.currentExecution.risks.push(reason);

    return this.complete();
  }

  /**
   * Get current execution state
   */
  getCurrentExecution(): TaskExecution | null {
    return this.currentExecution;
  }
}

/**
 * Create a Cloud Assistant instance
 */
export function createCloudAssistant(): CloudAssistant {
  return new CloudAssistant();
}
