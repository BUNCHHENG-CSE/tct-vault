/**
 * Plaid Integration Service
 * 
 * Supports both Plaid Production/Development/Sandbox and fallback mock mode.
 * To use live Plaid, add PLAID_CLIENT_ID and PLAID_SECRET to .env.local.
 */

export interface PlaidConfig {
  clientId?: string;
  secret?: string;
  env: "sandbox" | "development" | "production";
}

export function getPlaidConfig(): PlaidConfig {
  return {
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    env: (process.env.PLAID_ENV as "sandbox" | "development" | "production") || "sandbox",
  };
}

export function isPlaidConfigured(): boolean {
  const { clientId, secret } = getPlaidConfig();
  return Boolean(clientId && secret && !clientId.includes("your-"));
}
