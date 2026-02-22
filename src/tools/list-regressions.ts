import type { PulspeedApiClient } from "../client/api.js";
import type { Snapshot } from "../client/types.js";
import { resolveSite } from "./helpers.js";

export const listRegressionsDefinition = {
  name: "list_regressions",
  description:
    "Show recent performance regressions for a site: consecutive scans where the performance score dropped significantly. Helps identify when and by how much the site degraded.",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description: "The URL of the website",
      },
      site_id: {
        type: "number",
        description: "The Pulspeed site ID (alternative to URL)",
      },
      threshold: {
        type: "number",
        description:
          "Minimum score drop to be considered a regression (default: 3)",
      },
      limit: {
        type: "number",
        description: "Number of recent snapshots to analyse (default: 20)",
      },
    },
  },
};

export async function handleListRegressions(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<string> {
  const site = await resolveSite(client, args);
  const threshold = (args.threshold as number | undefined) ?? 3;
  const limit = Math.min((args.limit as number | undefined) ?? 20, 50);

  const allSnapshots = await client.getSiteSnapshots(site.id);

  // Take the most recent `limit` snapshots (already sorted latest first by API)
  const snapshots = allSnapshots.slice(0, limit);

  if (snapshots.length < 2) {
    return `Not enough scan data for ${site.url}. Need at least 2 snapshots to detect regressions.`;
  }

  // Snapshots are newest-first; compare each pair (newer vs older)
  const regressions: Array<{
    from: Snapshot;
    to: Snapshot;
    drop: number;
  }> = [];

  for (let i = 0; i < snapshots.length - 1; i++) {
    const newer = snapshots[i];
    const older = snapshots[i + 1];

    if (newer.performance_score === null || older.performance_score === null) {
      continue;
    }

    const drop = older.performance_score - newer.performance_score;
    if (drop >= threshold) {
      regressions.push({ from: older, to: newer, drop });
    }
  }

  if (regressions.length === 0) {
    return (
      `No regressions found for ${site.name} (${site.url}) ` +
      `in the last ${snapshots.length} scans (threshold: ${threshold} points).\n` +
      `Latest score: ${snapshots[0].performance_score ?? "N/A"}/100`
    );
  }

  const lines: string[] = [
    `Regressions for ${site.name} (${site.url}):`,
    `Found ${regressions.length} regression(s) in last ${snapshots.length} scans (threshold: ≥${threshold} pts)`,
    "",
  ];

  for (const r of regressions) {
    const severity =
      r.drop >= 15 ? "🔴 CRITICAL" : r.drop >= 8 ? "🟠 HIGH" : "🟡 MEDIUM";
    lines.push(
      `${severity} −${r.drop.toFixed(1)} pts: ` +
        `${r.from.performance_score} → ${r.to.performance_score}`,
    );
    lines.push(`  Before: ${r.from.taken_at} (snapshot #${r.from.id})`);
    lines.push(`  After:  ${r.to.taken_at} (snapshot #${r.to.id})`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
