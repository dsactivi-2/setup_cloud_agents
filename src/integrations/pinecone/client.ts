/**
 * Pinecone Integration - STUB
 * This is a placeholder integration. Do not use in production without explicit approval.
 */

export interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
}

export interface PineconeVector {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
}

export interface PineconeClient {
  isEnabled(): boolean;
  upsert(vectors: PineconeVector[]): Promise<{ success: boolean; upsertedCount?: number; error?: string }>;
  query(vector: number[], topK?: number): Promise<{ success: boolean; matches?: unknown[]; error?: string }>;
  deleteById(ids: string[]): Promise<{ success: boolean; error?: string }>;
  getStatus(): Promise<{ connected: boolean; error?: string }>;
}

/**
 * Creates a Pinecone client stub
 * All methods return stub responses until properly configured
 */
export function createPineconeClient(_config?: PineconeConfig): PineconeClient {
  const enabled = process.env.PINECONE_ENABLED === "true";

  return {
    isEnabled(): boolean {
      return enabled;
    },

    async upsert(_vectors: PineconeVector[]): Promise<{ success: boolean; upsertedCount?: number; error?: string }> {
      if (!enabled) {
        return {
          success: false,
          error: "STUB: Pinecone integration is disabled. Set PINECONE_ENABLED=true to enable.",
        };
      }

      console.warn("Pinecone upsert called but not implemented");
      return {
        success: false,
        error: "STUB: Pinecone upsert not implemented",
      };
    },

    async query(_vector: number[], _topK = 10): Promise<{ success: boolean; matches?: unknown[]; error?: string }> {
      if (!enabled) {
        return {
          success: false,
          error: "STUB: Pinecone integration is disabled",
        };
      }

      return {
        success: false,
        matches: [],
        error: "STUB: Pinecone query not implemented",
      };
    },

    async deleteById(_ids: string[]): Promise<{ success: boolean; error?: string }> {
      return {
        success: false,
        error: "STUB: Pinecone delete not implemented",
      };
    },

    async getStatus(): Promise<{ connected: boolean; error?: string }> {
      return {
        connected: false,
        error: "STUB: Pinecone integration not implemented",
      };
    },
  };
}
