import type { PulspeedApiClient } from "../client/api.js";
import type { PerformanceBudgets } from "../client/types.js";
import { resolveSite } from "./helpers.js";

export const setPerformanceBudgetDefinition = {
  name: "set_performance_budget",
  description:
    "Set performance budget thresholds for a site. When a scan violates these thresholds, webhook events (threshold.exceeded, performance.regression) will fire. Pass null to remove all budgets.",
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
      performance_score: {
        type: "object",
        description: "Minimum acceptable performance score (0-100)",
        properties: {
          min: { type: "number", description: "Minimum score (e.g. 70)" },
        },
      },
      lcp: {
        type: "object",
        description: "Largest Contentful Paint budget in milliseconds",
        properties: {
          max: { type: "number", description: "Max LCP in ms (e.g. 2500)" },
        },
      },
      fcp: {
        type: "object",
        description: "First Contentful Paint budget in milliseconds",
        properties: {
          max: { type: "number", description: "Max FCP in ms (e.g. 1800)" },
        },
      },
      tbt: {
        type: "object",
        description: "Total Blocking Time budget in milliseconds",
        properties: {
          max: { type: "number", description: "Max TBT in ms (e.g. 200)" },
        },
      },
      ttfb: {
        type: "object",
        description: "Time to First Byte budget in milliseconds",
        properties: {
          max: { type: "number", description: "Max TTFB in ms (e.g. 800)" },
        },
      },
      cls: {
        type: "object",
        description: "Cumulative Layout Shift budget",
        properties: {
          max: { type: "number", description: "Max CLS (e.g. 0.1)" },
        },
      },
    },
  },
};

export async function handleSetPerformanceBudget(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<string> {
  const site = await resolveSite(client, args);

  const budgets: PerformanceBudgets = {};

  if (args.performance_score) {
    budgets.performance_score = args.performance_score as { min?: number };
  }
  if (args.lcp) budgets.lcp = args.lcp as { max?: number };
  if (args.fcp) budgets.fcp = args.fcp as { max?: number };
  if (args.tbt) budgets.tbt = args.tbt as { max?: number };
  if (args.ttfb) budgets.ttfb = args.ttfb as { max?: number };
  if (args.cls) budgets.cls = args.cls as { max?: number };

  const result = await client.setPerformanceBudget(site.id, budgets);

  if (!result.performance_budgets || Object.keys(result.performance_budgets).length === 0) {
    return `Performance budgets cleared for ${site.name} (${site.url}).`;
  }

  const lines: string[] = [
    `Performance budgets set for ${site.name} (${site.url}):`,
    "",
  ];

  const b = result.performance_budgets;
  if (b.performance_score?.min !== undefined) {
    lines.push(`  Score:  min ${b.performance_score.min}/100`);
  }
  if (b.lcp?.max !== undefined) lines.push(`  LCP:    max ${b.lcp.max}ms`);
  if (b.fcp?.max !== undefined) lines.push(`  FCP:    max ${b.fcp.max}ms`);
  if (b.tbt?.max !== undefined) lines.push(`  TBT:    max ${b.tbt.max}ms`);
  if (b.ttfb?.max !== undefined) lines.push(`  TTFB:   max ${b.ttfb.max}ms`);
  if (b.cls?.max !== undefined) lines.push(`  CLS:    max ${b.cls.max}`);

  lines.push("");
  lines.push(
    "Webhook events will fire when these thresholds are violated on the next scan.",
  );

  return lines.join("\n");
}
