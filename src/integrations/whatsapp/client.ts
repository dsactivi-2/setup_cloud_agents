/**
 * WhatsApp Integration - STUB
 * This is a placeholder integration. Do not use in production without explicit approval.
 */

export interface WhatsAppConfig {
  apiUrl: string;
  apiToken: string;
}

export interface WhatsAppMessage {
  to: string;
  body: string;
  type: "text" | "template";
}

export interface WhatsAppClient {
  isEnabled(): boolean;
  sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getStatus(): Promise<{ connected: boolean; error?: string }>;
}

/**
 * Creates a WhatsApp client stub
 * All methods return stub responses until properly configured
 */
export function createWhatsAppClient(_config?: WhatsAppConfig): WhatsAppClient {
  const enabled = process.env.WHATSAPP_ENABLED === "true";

  return {
    isEnabled(): boolean {
      return enabled;
    },

    async sendMessage(_message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
      if (!enabled) {
        return {
          success: false,
          error: "STUB: WhatsApp integration is disabled. Set WHATSAPP_ENABLED=true to enable.",
        };
      }

      // TODO: Implement actual WhatsApp API call
      console.warn("WhatsApp sendMessage called but not implemented");
      return {
        success: false,
        error: "STUB: WhatsApp integration not implemented",
      };
    },

    async getStatus(): Promise<{ connected: boolean; error?: string }> {
      if (!enabled) {
        return {
          connected: false,
          error: "STUB: WhatsApp integration is disabled",
        };
      }

      return {
        connected: false,
        error: "STUB: WhatsApp integration not implemented",
      };
    },
  };
}
