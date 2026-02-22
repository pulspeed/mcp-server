import type { Snapshot } from "../client/types.js";

export function formatMetrics(snapshot: Snapshot): string {
  const lines: string[] = [];
  const m = snapshot.metrics;

  lines.push(`Performance Score: ${snapshot.performance_score ?? "N/A"}/100`);
  lines.push("");
  lines.push("Core Web Vitals:");
  lines.push(
    `  FCP (First Contentful Paint): ${formatMs(m.fcp)}`,
  );
  lines.push(
    `  LCP (Largest Contentful Paint): ${formatMs(m.lcp)}`,
  );
  lines.push(
    `  TTI (Time to Interactive): ${formatMs(m.tti)}`,
  );
  lines.push(
    `  TBT (Total Blocking Time): ${formatMs(m.tbt)}`,
  );
  lines.push(
    `  TTFB (Time to First Byte): ${formatMs(m.ttfb)}`,
  );
  lines.push(
    `  CLS (Cumulative Layout Shift): ${m.cls?.toFixed(3) ?? "N/A"}`,
  );
  lines.push("");
  lines.push(`Scanned at: ${snapshot.taken_at}`);

  return lines.join("\n");
}

export function formatComparison(
  current: Snapshot,
  previous: Snapshot,
): string {
  const lines: string[] = [];
  const cm = current.metrics;
  const pm = previous.metrics;

  lines.push("Performance Comparison:");
  lines.push(
    `  Score: ${previous.performance_score ?? "?"} → ${current.performance_score ?? "?"} ${formatDelta(current.performance_score, previous.performance_score, false)}`,
  );
  lines.push("");
  lines.push("Metrics (lower is better except CLS):");
  lines.push(
    `  FCP: ${formatMs(pm.fcp)} → ${formatMs(cm.fcp)} ${formatDelta(cm.fcp, pm.fcp, true)}`,
  );
  lines.push(
    `  LCP: ${formatMs(pm.lcp)} → ${formatMs(cm.lcp)} ${formatDelta(cm.lcp, pm.lcp, true)}`,
  );
  lines.push(
    `  TTI: ${formatMs(pm.tti)} → ${formatMs(cm.tti)} ${formatDelta(cm.tti, pm.tti, true)}`,
  );
  lines.push(
    `  TBT: ${formatMs(pm.tbt)} → ${formatMs(cm.tbt)} ${formatDelta(cm.tbt, pm.tbt, true)}`,
  );
  lines.push(
    `  TTFB: ${formatMs(pm.ttfb)} → ${formatMs(cm.ttfb)} ${formatDelta(cm.ttfb, pm.ttfb, true)}`,
  );
  lines.push(
    `  CLS: ${pm.cls?.toFixed(3) ?? "?"} → ${cm.cls?.toFixed(3) ?? "?"} ${formatDelta(cm.cls, pm.cls, true)}`,
  );
  lines.push("");
  lines.push(`Current: ${current.taken_at}`);
  lines.push(`Previous: ${previous.taken_at}`);

  return lines.join("\n");
}

export function determineTrend(
  current: Snapshot | undefined,
  previous: Snapshot | undefined,
): "improving" | "degrading" | "stable" | "unknown" {
  if (!current?.performance_score || !previous?.performance_score) {
    return "unknown";
  }

  const diff = current.performance_score - previous.performance_score;

  if (diff > 2) return "improving";
  if (diff < -2) return "degrading";
  return "stable";
}

function formatMs(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function formatDelta(
  current: number | null,
  previous: number | null,
  lowerIsBetter: boolean,
): string {
  if (current === null || previous === null) return "";

  const diff = current - previous;
  if (Math.abs(diff) < 0.001) return "(no change)";

  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const sign = diff > 0 ? "+" : "";
  const label = improved ? "improved" : "regressed";

  return `(${sign}${diff < 1 && diff > -1 ? diff.toFixed(3) : Math.round(diff)} - ${label})`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
