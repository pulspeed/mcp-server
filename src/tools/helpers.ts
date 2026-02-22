import type { PulspeedApiClient } from "../client/api.js";
import type { Site } from "../client/types.js";

/**
 * Resolve a site from either url or site_id argument.
 */
export async function resolveSite(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<Site> {
  const siteId = args.site_id as number | undefined;
  const url = args.url as string | undefined;

  if (siteId) {
    const details = await client.getSite(siteId);
    return details.site;
  }

  if (url) {
    const sites = await client.listSites();
    const normalizedInput = normalizeForComparison(url);
    const found = sites.find(
      (s) => normalizeForComparison(s.url) === normalizedInput,
    );

    if (!found) {
      throw new Error(
        `Site not found for URL: ${url}. Use list_sites to see monitored sites, or scan_site to add a new one.`,
      );
    }

    return found;
  }

  throw new Error(
    "Either 'url' or 'site_id' must be provided.",
  );
}

function normalizeForComparison(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return url.replace(/\/$/, "");
  }
}
