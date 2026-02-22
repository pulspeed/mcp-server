import type { PulspeedApiClient } from "../client/api.js";
import type { ScanJob, Snapshot } from "../client/types.js";
import { formatMetrics } from "../utils/formatting.js";
import { pollScanJobUntilComplete } from "../utils/polling.js";

export const scanSiteDefinition = {
  name: "scan_site",
  description:
    "Trigger a PageSpeed Insights scan for a website URL. Creates the site if not already tracked. By default waits for the scan to complete and returns performance metrics (30-60 seconds). Set wait=false to dispatch asynchronously and get a job_id for polling.",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description: "The full URL to scan (e.g., https://example.com)",
      },
      strategy: {
        type: "string",
        enum: ["mobile", "desktop"],
        description: "Scan strategy: mobile or desktop (default: mobile)",
      },
      wait: {
        type: "boolean",
        description:
          "If true (default), wait for scan to complete and return results. If false, dispatch asynchronously and return job_id immediately.",
      },
    },
    required: ["url"],
  },
};

export async function handleScanSite(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<string> {
  const url = args.url as string;

  if (!url) {
    throw new Error("URL is required for scanning.");
  }

  let normalizedUrl = url;
  if (!normalizedUrl.startsWith("http")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const strategy = (args.strategy as "mobile" | "desktop" | undefined) ?? "mobile";
  const wait = (args.wait as boolean | undefined) ?? true;

  if (!wait) {
    // Async: dispatch job, return job_id immediately
    const result = (await client.scanV2(normalizedUrl, strategy, false)) as ScanJob;

    return (
      `Scan dispatched for ${normalizedUrl}\n` +
      `Job ID: ${result.id}\n\n` +
      `Use get_site_metrics to check results once the job completes.`
    );
  }

  // Sync: wait for completion and return metrics
  const snapshot = (await client.scanV2(normalizedUrl, strategy, true)) as Snapshot;

  if (!snapshot.id) {
    // Fallback: no snapshot returned, try polling via job
    const fallbackJob = snapshot as unknown as ScanJob;
    if (fallbackJob.id) {
      const polled = await pollScanJobUntilComplete(
        client,
        fallbackJob.id,
        fallbackJob.site_id!,
      );
      return `Scan completed for ${normalizedUrl}\n\n${formatMetrics(polled)}`;
    }
    return "Scan was dispatched but no result was returned. Try get_site_metrics in a moment.";
  }

  return `Scan completed for ${normalizedUrl}\n\n${formatMetrics(snapshot)}`;
}
