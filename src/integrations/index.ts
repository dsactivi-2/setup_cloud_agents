/**
 * Integrations Index - Export all integration clients
 *
 * IMPORTANT: All integrations are STUBS until explicitly enabled.
 * Do not use in production without explicit approval.
 */

export { createWhatsAppClient, type WhatsAppClient, type WhatsAppMessage } from "./whatsapp/client.js";
export { createVoiceClient, type VoiceClient, type VoiceCall } from "./voice/client.js";
export { createGoogleClient, type GoogleClient } from "./google/client.js";
export { createICloudClient, type ICloudClient } from "./icloud/client.js";
export { createPineconeClient, type PineconeClient, type PineconeVector } from "./pinecone/client.js";

/**
 * Get status of all integrations
 */
export async function getAllIntegrationStatus(): Promise<Record<string, { enabled: boolean; connected: boolean }>> {
  return {
    whatsapp: {
      enabled: process.env.WHATSAPP_ENABLED === "true",
      connected: false,
    },
    voice: {
      enabled: process.env.VOICE_ENABLED === "true",
      connected: false,
    },
    google: {
      enabled: process.env.GOOGLE_ENABLED === "true",
      connected: false,
    },
    icloud: {
      enabled: process.env.ICLOUD_ENABLED === "true",
      connected: false,
    },
    pinecone: {
      enabled: process.env.PINECONE_ENABLED === "true",
      connected: false,
    },
  };
}
