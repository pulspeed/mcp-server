import type { PulspeedApiClient } from "../client/api.js";
import type { ScanJob, Snapshot } from "../client/types.js";
import { formatMetrics } from "../utils/formatting.js";
import { pollScanJobUntilComplete } from "../utils/polling.js";

export const bulkScanDefinition = {
  name: "bulk_scan",
  description:
    "Scan multiple URLs at once. By default runs scans asynchronously and returns job IDs for polling. Set wait=true to run sequentially and return all results (slower, may take several minutes).",
  inputSchema: {
    type: "object" as const,
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        description: "List of URLs to scan (max 10)",
      },
      strategy: {
        type: "string",
        enum: ["mobile", "desktop"],
        description: "Scan strategy: mobile or desktop (default: mobile)",
      },
      wait: {
        type: "boolean",
        description:
          "If true, wait for all scans to complete and return results. If false (default), dispatch all jobs and return job IDs immediately.",
      },
    },
    required: ["urls"],
  },
};

export async function handleBulkScan(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<string> {
  const urls = args.urls as string[];
  const strategy = (args.strategy as "mobile" | "desktop" | undefined) ?? "mobile";
  const wait = (args.wait as boolean | undefined) ?? false;

  if (!urls || urls.length === 0) {
    throw new Error("At least one URL is required.");
  }

  if (urls.length > 10) {
    throw new Error("Maximum 10 URLs per bulk scan request.");
  }

  if (wait) {
    return runSequential(client, urls, strategy);
  }

  return runAsync(client, urls, strategy);
}

async function runAsync(
  client: PulspeedApiClient,
  urls: string[],
  strategy: "mobile" | "desktop",
): Promise<string> {
  const results: Array<{ url: string; jobId?: number; error?: string }> = [];

  await Promise.all(
    urls.map(async (url) => {
      try {
        const job = (await client.scanV2(url, strategy, false)) as ScanJob;
        results.push({ url, jobId: job.id });
      } catch (err) {
        results.push({
          url,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  const lines: string[] = [
    `Bulk scan dispatched for ${urls.length} URL(s):`,
    "",
  ];

  for (const r of results) {
    if (r.jobId) {
      lines.push(`  ✓ ${r.url} — job_id: ${r.jobId}`);
    } else {
      lines.push(`  ✗ ${r.url} — error: ${r.error}`);
    }
  }

  lines.push("");
  lines.push("Use get_site_metrics or compare_snapshots to view results once jobs complete.");

  return lines.join("\n");
}

async function runSequential(
  client: PulspeedApiClient,
  urls: string[],
  strategy: "mobile" | "desktop",
): Promise<string> {
  const lines: string[] = [
    `Running sequential scans for ${urls.length} URL(s)...`,
    "",
  ];

  for (const url of urls) {
    lines.push(`── ${url}`);
    try {
      const result = (await client.scanV2(url, strategy, false)) as ScanJob;
      if (!result.id) {
        lines.push("   Scan dispatched but no job ID returned.");
        continue;
      }
      const snapshot = await pollScanJobUntilComplete(
        client,
        result.id,
        result.site_id!,
      );
      lines.push(formatMetrics(snapshot as Snapshot));
    } catch (err) {
      lines.push(
        `   Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
