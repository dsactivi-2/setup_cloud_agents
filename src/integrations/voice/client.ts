/**
 * Voice Integration - STUB
 * This is a placeholder integration. Do not use in production without explicit approval.
 */

export interface VoiceConfig {
  provider: string;
  apiKey: string;
}

export interface VoiceCall {
  to: string;
  message: string;
  language?: string;
}

export interface VoiceClient {
  isEnabled(): boolean;
  makeCall(call: VoiceCall): Promise<{ success: boolean; callId?: string; error?: string }>;
  transcribe(audioUrl: string): Promise<{ success: boolean; text?: string; error?: string }>;
  getStatus(): Promise<{ connected: boolean; error?: string }>;
}

/**
 * Creates a Voice client stub
 * All methods return stub responses until properly configured
 */
export function createVoiceClient(_config?: VoiceConfig): VoiceClient {
  const enabled = process.env.VOICE_ENABLED === "true";

  return {
    isEnabled(): boolean {
      return enabled;
    },

    async makeCall(_call: VoiceCall): Promise<{ success: boolean; callId?: string; error?: string }> {
      if (!enabled) {
        return {
          success: false,
          error: "STUB: Voice integration is disabled. Set VOICE_ENABLED=true to enable.",
        };
      }

      console.warn("Voice makeCall called but not implemented");
      return {
        success: false,
        error: "STUB: Voice integration not implemented",
      };
    },

    async transcribe(_audioUrl: string): Promise<{ success: boolean; text?: string; error?: string }> {
      if (!enabled) {
        return {
          success: false,
          error: "STUB: Voice integration is disabled",
        };
      }

      return {
        success: false,
        error: "STUB: Voice transcription not implemented",
      };
    },

    async getStatus(): Promise<{ connected: boolean; error?: string }> {
      return {
        connected: false,
        error: "STUB: Voice integration not implemented",
      };
    },
  };
}
