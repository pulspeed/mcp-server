export interface PulspeedConfig {
  apiKey: string;
  baseUrl: string;
}

export function loadConfig(): PulspeedConfig {
  const apiKey = process.env.PULSPEED_API_KEY;

  if (!apiKey) {
    throw new Error(
      "PULSPEED_API_KEY environment variable is required. " +
        "Get your API key from your Pulspeed dashboard (Settings > API Tokens).",
    );
  }

  return {
    apiKey,
    baseUrl: process.env.PULSPEED_BASE_URL ?? "https://pulspeed.ai/api/v1",
  };
}
