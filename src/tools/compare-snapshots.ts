import type { PulspeedApiClient } from "../client/api.js";
import type { Snapshot } from "../client/types.js";
import { resolveSite } from "./helpers.js";

export const compareSnapshotsDefinition = {
  name: "compare_snapshots",
  description:
    "Compare two performance snapshots for a website. Shows metric deltas with percentage changes and a human-readable assessment. By default compares the latest two snapshots, or specify snapshot IDs.",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description: "The URL of the website to compare snapshots for",
      },
      site_id: {
        type: "number",
        description: "The Pulspeed site ID (alternative to URL)",
      },
      snapshot_id_a: {
        type: "number",
        description: "ID of the first (newer) snapshot to compare",
      },
      snapshot_id_b: {
        type: "number",
        description: "ID of the second (older) snapshot to compare",
      },
    },
  },
};

export async function handleCompareSnapshots(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<string> {
  const snapshotIdA = args.snapshot_id_a as number | undefined;
  const snapshotIdB = args.snapshot_id_b as number | undefined;

  let current: Snapshot;
  let previous: Snapshot;
  let header = "Snapshot Comparison:";

  if (snapshotIdA && snapshotIdB) {
    [current, previous] = await Promise.all([
      client.getSnapshot(snapshotIdA),
      client.getSnapshot(snapshotIdB),
    ]);
  } else {
    const site = await resolveSite(client, args);
    const details = await client.getSite(site.id);

    if (details.snapshots.length < 2) {
      return `Need at least 2 snapshots to compare for ${site.url}. Currently have ${details.snapshots.length}. Run more scans first.`;
    }

    current = details.snapshots[0];
    previous = details.snapshots[1];
    header = `Comparison for ${site.name} (${site.url}):`;
  }

  return formatEnrichedComparison(header, current, previous);
}

function formatEnrichedComparison(
  header: string,
  current: Snapshot,
  previous: Snapshot,
): string {
  const cm = current.metrics;
  const pm = previous.metrics;

  const scoreChange = delta(
    current.performance_score,
    previous.performance_score,
    false,
  );
  const assessment = assessChange(
    current.performance_score,
    previous.performance_score,
  );

  const lines: string[] = [
    header,
    "",
    `Score: ${previous.performance_score ?? "?"} → ${current.performance_score ?? "?"}  ${scoreChange}`,
    `Assessment: ${assessment}`,
    "",
    "Core Web Vitals (lower is better except score):",
    `  FCP:  ${fmt(pm.fcp)} → ${fmt(cm.fcp)}  ${delta(cm.fcp, pm.fcp, true)}`,
    `  LCP:  ${fmt(pm.lcp)} → ${fmt(cm.lcp)}  ${delta(cm.lcp, pm.lcp, true)}`,
    `  TTI:  ${fmt(pm.tti)} → ${fmt(cm.tti)}  ${delta(cm.tti, pm.tti, true)}`,
    `  TBT:  ${fmt(pm.tbt)} → ${fmt(cm.tbt)}  ${delta(cm.tbt, pm.tbt, true)}`,
    `  TTFB: ${fmt(pm.ttfb)} → ${fmt(cm.ttfb)}  ${delta(cm.ttfb, pm.ttfb, true)}`,
    `  CLS:  ${pm.cls?.toFixed(3) ?? "?"} → ${cm.cls?.toFixed(3) ?? "?"}  ${deltaCls(cm.cls, pm.cls)}`,
    "",
    `Newer:   ${current.taken_at}  (snapshot #${current.id})`,
    `Older:   ${previous.taken_at}  (snapshot #${previous.id})`,
  ];

  return lines.join("\n");
}

function fmt(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`;
}

function delta(
  current: number | null,
  previous: number | null,
  lowerIsBetter: boolean,
): string {
  if (current === null || previous === null) return "";
  if (previous === 0) return "";

  const abs = current - previous;
  const pct = ((abs / previous) * 100).toFixed(1);
  if (Math.abs(abs) < 0.5) return "(no change)";

  const improved = lowerIsBetter ? abs < 0 : abs > 0;
  const sign = abs > 0 ? "+" : "";
  const label = improved ? "✓" : "✗";
  return `${label} ${sign}${Math.round(abs)} (${sign}${pct}%)`;
}

function deltaCls(current: number | null, previous: number | null): string {
  if (current === null || previous === null) return "";
  if (previous === 0) return "";

  const abs = current - previous;
  const pct = ((abs / previous) * 100).toFixed(1);
  if (Math.abs(abs) < 0.001) return "(no change)";

  const improved = abs < 0;
  const sign = abs > 0 ? "+" : "";
  const label = improved ? "✓" : "✗";
  return `${label} ${sign}${abs.toFixed(3)} (${sign}${pct}%)`;
}

function assessChange(
  current: number | null,
  previous: number | null,
): string {
  if (current === null || previous === null) return "insufficient data";

  const diff = current - previous;

  if (diff > 10) return "🟢 Significant improvement";
  if (diff > 3) return "🟡 Slight improvement";
  if (Math.abs(diff) <= 3) return "⚪ Stable — no meaningful change";
  if (diff > -8) return "🟠 Slight regression";
  return "🔴 Significant regression";
}
