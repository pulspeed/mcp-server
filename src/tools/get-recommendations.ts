import type { PulspeedApiClient } from "../client/api.js";
import { stripHtml } from "../utils/formatting.js";
import { resolveSite } from "./helpers.js";

export const getRecommendationsDefinition = {
  name: "get_recommendations",
  description:
    "Get AI-powered performance recommendations for a monitored website. Requires Pro or Team plan.",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description: "The URL of the website to get recommendations for",
      },
      site_id: {
        type: "number",
        description: "The Pulspeed site ID (alternative to URL)",
      },
    },
  },
};

export async function handleGetRecommendations(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<string> {
  const site = await resolveSite(client, args);
  const details = await client.getSite(site.id);

  const analysis = details.analysis;

  if (!analysis) {
    // Check if there are any snapshots at all
    if (details.snapshots.length === 0) {
      return `No scan data available for ${site.url}. Use the scan_site tool to trigger a scan first.`;
    }

    return (
      `No AI recommendations available for ${site.url}. ` +
      "This feature requires a Pro or Team plan with at least one completed scan."
    );
  }

  const cleanText = stripHtml(analysis);

  return `AI Recommendations for ${site.name} (${site.url}):\n\n${cleanText}`;
}
