/**
 * Google Integration - STUB
 * This is a placeholder integration. Do not use in production without explicit approval.
 */

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export interface GoogleClient {
  isEnabled(): boolean;
  getAuthUrl(): string;
  handleCallback(code: string): Promise<{ success: boolean; tokens?: unknown; error?: string }>;
  getCalendarEvents(calendarId: string): Promise<{ success: boolean; events?: unknown[]; error?: string }>;
  getContacts(): Promise<{ success: boolean; contacts?: unknown[]; error?: string }>;
  getStatus(): Promise<{ connected: boolean; error?: string }>;
}

/**
 * Creates a Google client stub
 * All methods return stub responses until properly configured
 */
export function createGoogleClient(_config?: GoogleConfig): GoogleClient {
  const enabled = process.env.GOOGLE_ENABLED === "true";

  return {
    isEnabled(): boolean {
      return enabled;
    },

    getAuthUrl(): string {
      return "STUB: Google OAuth not configured";
    },

    async handleCallback(_code: string): Promise<{ success: boolean; tokens?: unknown; error?: string }> {
      if (!enabled) {
        return {
          success: false,
          error: "STUB: Google integration is disabled. Set GOOGLE_ENABLED=true to enable.",
        };
      }

      return {
        success: false,
        error: "STUB: Google OAuth not implemented",
      };
    },

    async getCalendarEvents(_calendarId: string): Promise<{ success: boolean; events?: unknown[]; error?: string }> {
      if (!enabled) {
        return {
          success: false,
          error: "STUB: Google integration is disabled",
        };
      }

      return {
        success: false,
        events: [],
        error: "STUB: Google Calendar not implemented",
      };
    },

    async getContacts(): Promise<{ success: boolean; contacts?: unknown[]; error?: string }> {
      if (!enabled) {
        return {
          success: false,
          error: "STUB: Google integration is disabled",
        };
      }

      return {
        success: false,
        contacts: [],
        error: "STUB: Google Contacts not implemented",
      };
    },

    async getStatus(): Promise<{ connected: boolean; error?: string }> {
      return {
        connected: false,
        error: "STUB: Google integration not implemented",
      };
    },
  };
}
