import type { PulspeedApiClient } from "../client/api.js";

export const listSitesDefinition = {
  name: "list_sites",
  description:
    "List all websites being monitored by Pulspeed. Returns site names, URLs, scan frequency, and strategy.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [] as string[],
  },
};

export async function handleListSites(
  client: PulspeedApiClient,
): Promise<string> {
  const sites = await client.listSites();

  if (sites.length === 0) {
    return "No sites are being monitored yet. Use the scan_site tool to add and scan a website.";
  }

  const lines = sites.map(
    (s) => `- ${s.name} (${s.url}) [${s.frequency}, ${s.strategy}] id:${s.id}`,
  );

  return `Monitored sites (${sites.length}):\n${lines.join("\n")}`;
}
