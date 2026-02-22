import type { PulspeedApiClient } from "../client/api.js";

export const getUsageDefinition = {
  name: "get_usage",
  description:
    "Get current API usage statistics: how many scans and AI analyses have been used this month, remaining quota, and plan limits.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [] as string[],
  },
};

export async function handleGetUsage(
  client: PulspeedApiClient,
): Promise<string> {
  const usage = await client.getUsage();

  const scansBar = renderBar(usage.scans.used, usage.scans.limit);
  const aiBar = renderBar(usage.ai_analyses.used, usage.ai_analyses.limit);

  const lines: string[] = [
    `Plan: ${usage.plan.toUpperCase()}`,
    `Period: ${usage.period.start} → ${usage.period.end}`,
    "",
    "Scans:",
    `  Used:      ${usage.scans.used} / ${usage.scans.limit}`,
    `  Remaining: ${usage.scans.remaining}`,
    `  ${scansBar}`,
    "",
    "AI Analyses:",
    `  Used:      ${usage.ai_analyses.used} / ${usage.ai_analyses.limit}`,
    `  Remaining: ${usage.ai_analyses.remaining}`,
    `  ${aiBar}`,
  ];

  return lines.join("\n");
}

function renderBar(used: number, limit: number): string {
  if (limit <= 0) return "[unlimited]";
  const pct = Math.min(Math.round((used / limit) * 20), 20);
  const filled = "█".repeat(pct);
  const empty = "░".repeat(20 - pct);
  const percent = Math.round((used / limit) * 100);
  return `[${filled}${empty}] ${percent}%`;
}
