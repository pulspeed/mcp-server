import type { PulspeedApiClient } from "../client/api.js";
import type { Snapshot } from "../client/types.js";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_DURATION_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollScanJobUntilComplete(
  client: PulspeedApiClient,
  jobId: number,
  siteId: number,
): Promise<Snapshot> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
    const status = await client.getScanJobStatus(jobId);

    if (status.status === "done") {
      const snapshots = await client.getSiteSnapshots(siteId);
      if (snapshots.length === 0) {
        throw new Error("Scan completed but no snapshots found.");
      }
      return snapshots[0];
    }

    if (status.status === "failed") {
      throw new Error(
        `Scan failed: ${status.error_message || "Unknown error"}`,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    "Scan timed out after 2 minutes. The scan may still be running — check again shortly.",
  );
}
