/**
 * Queue Module - In-memory queue with optional Redis/BullMQ support
 */

export interface QueueJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: Date;
  processed_at?: Date;
}

export interface QueueAdapter {
  mode: "in-memory" | "redis";
  isHealthy(): boolean;
  add(name: string, data: Record<string, unknown>): Promise<string>;
  process(name: string, handler: (job: QueueJob) => Promise<void>): void;
  getJob(id: string): QueueJob | undefined;
  getStats(): { pending: number; processing: number; completed: number; failed: number };
}

/**
 * In-memory queue implementation (fallback when Redis is not available)
 */
function createInMemoryQueue(): QueueAdapter {
  const jobs = new Map<string, QueueJob>();
  const handlers = new Map<string, (job: QueueJob) => Promise<void>>();
  let jobCounter = 0;

  return {
    mode: "in-memory",

    isHealthy(): boolean {
      return true;
    },

    async add(name: string, data: Record<string, unknown>): Promise<string> {
      const id = `job_${++jobCounter}`;
      const job: QueueJob = {
        id,
        name,
        data,
        status: "pending",
        created_at: new Date(),
      };
      jobs.set(id, job);

      // Process immediately if handler exists
      const handler = handlers.get(name);
      if (handler) {
        setImmediate(async () => {
          job.status = "processing";
          try {
            await handler(job);
            job.status = "completed";
            job.processed_at = new Date();
          } catch (error) {
            job.status = "failed";
            console.error(`Job ${id} failed:`, error);
          }
        });
      }

      return id;
    },

    process(name: string, handler: (job: QueueJob) => Promise<void>): void {
      handlers.set(name, handler);
    },

    getJob(id: string): QueueJob | undefined {
      return jobs.get(id);
    },

    getStats(): { pending: number; processing: number; completed: number; failed: number } {
      let pending = 0;
      let processing = 0;
      let completed = 0;
      let failed = 0;

      for (const job of jobs.values()) {
        switch (job.status) {
          case "pending":
            pending++;
            break;
          case "processing":
            processing++;
            break;
          case "completed":
            completed++;
            break;
          case "failed":
            failed++;
            break;
        }
      }

      return { pending, processing, completed, failed };
    },
  };
}

/**
 * Initialize queue adapter
 * Uses in-memory queue by default, can be extended to support Redis/BullMQ
 */
export function initQueue(): QueueAdapter {
  const redisUrl = process.env.REDIS_URL;
  const queueEnabled = process.env.QUEUE_ENABLED === "true";

  if (redisUrl && queueEnabled) {
    // TODO: Implement Redis/BullMQ adapter when needed
    console.log("Redis URL provided but BullMQ not implemented. Using in-memory queue.");
  }

  return createInMemoryQueue();
}
