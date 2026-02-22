import type { PulspeedApiClient } from "../client/api.js";
import type { MetricsHistoryEntry } from "../client/types.js";

export const getSiteMetricsDefinition = {
  name: "get_site_metrics",
  description:
    "Get performance metrics for a monitored website, including Core Web Vitals (FCP, LCP, TTI, TBT, TTFB, CLS), trend analysis, and historical data over a specified period.",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description: "The URL of the website to get metrics for",
      },
      site_id: {
        type: "number",
        description: "The Pulspeed site ID (alternative to URL)",
      },
      period: {
        type: "string",
        enum: ["24h", "7d", "30d", "90d"],
        description: "Time period for history (default: 7d)",
      },
    },
  },
};

export async function handleGetSiteMetrics(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<string> {
  const period = (args.period as string | undefined) ?? "7d";

  // Resolve URL: prefer explicit url arg, fall back to site_id lookup
  let resolvedUrl: string | undefined = args.url as string | undefined;

  if (!resolvedUrl && args.site_id) {
    const details = await client.getSite(args.site_id as number);
    resolvedUrl = details.site.url;
  }

  if (!resolvedUrl) {
    throw new Error("Either 'url' or 'site_id' must be provided.");
  }

  const data = await client.getMetrics(resolvedUrl, period);

  if (!data.current) {
    return `No scan data available for ${resolvedUrl}. Use the scan_site tool to trigger a scan first.`;
  }

  const trendIcon =
    data.trend === "improving"
      ? "↑ improving"
      : data.trend === "declining"
        ? "↓ declining"
        : data.trend === "stable"
          ? "→ stable"
          : "? insufficient data";

  const lines: string[] = [
    `Site: ${data.url}`,
    `Trend: ${trendIcon}  (${data.period} period, ${data.history.length} scans)`,
    "",
    formatCurrentMetrics(data.current),
  ];

  // Show a compact history table if multiple scans exist
  if (data.history.length > 1) {
    lines.push("");
    lines.push("Score history:");
    for (const entry of data.history.slice(0, 10)) {
      const bar = scoreBar(entry.performance_score);
      const score = entry.performance_score?.toString().padStart(3) ?? " N/A";
      const date = entry.taken_at.slice(0, 10);
      lines.push(`  ${date}  ${score}  ${bar}`);
    }
    if (data.history.length > 10) {
      lines.push(`  ... ${data.history.length - 10} more scans`);
    }
  }

  return lines.join("\n");
}

function formatCurrentMetrics(m: MetricsHistoryEntry): string {
  const fmt = (v: number | null) =>
    v === null ? "N/A" : v < 1000 ? `${v}ms` : `${(v / 1000).toFixed(2)}s`;

  return [
    `Performance Score: ${m.performance_score ?? "N/A"}/100`,
    "",
    "Core Web Vitals:",
    `  FCP  (First Contentful Paint):  ${fmt(m.fcp)}`,
    `  LCP  (Largest Contentful Paint): ${fmt(m.lcp)}`,
    `  TTI  (Time to Interactive):      ${fmt(m.tti)}`,
    `  TBT  (Total Blocking Time):      ${fmt(m.tbt)}`,
    `  TTFB (Time to First Byte):       ${fmt(m.ttfb)}`,
    `  CLS  (Cumulative Layout Shift):  ${m.cls?.toFixed(3) ?? "N/A"}`,
    "",
    `Scanned at: ${m.taken_at}`,
  ].join("\n");
}

function scoreBar(score: number | null): string {
  if (score === null) return "░░░░░░░░░░";
  const filled = Math.round(score / 10);
  const color =
    score >= 90 ? "█" : score >= 50 ? "▓" : "░";
  return color.repeat(filled) + "░".repeat(10 - filled);
}
