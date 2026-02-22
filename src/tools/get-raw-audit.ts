import type { PulspeedApiClient } from "../client/api.js";
import { resolveSite } from "./helpers.js";

export const getRawAuditDefinition = {
  name: "get_raw_audit",
  description:
    "Get the raw Lighthouse audit data for a specific audit key from the latest snapshot of a site (e.g. 'render-blocking-resources', 'bootup-time', 'unused-javascript'). Returns detailed audit items useful for debugging specific performance issues.",
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
      snapshot_id: {
        type: "number",
        description:
          "Specific snapshot ID to query. Defaults to the latest snapshot.",
      },
      audit_key: {
        type: "string",
        description:
          "Lighthouse audit key to retrieve, e.g. 'render-blocking-resources', 'bootup-time', 'unused-javascript', 'uses-optimized-images', 'network-requests'",
      },
    },
    required: ["audit_key"],
  },
};

export async function handleGetRawAudit(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<string> {
  const auditKey = args.audit_key as string;

  if (!auditKey) {
    throw new Error("audit_key is required.");
  }

  let snapshotId = args.snapshot_id as number | undefined;

  if (!snapshotId) {
    const site = await resolveSite(client, args);
    const snapshots = await client.getSiteSnapshots(site.id);

    if (snapshots.length === 0) {
      return `No snapshots found for this site. Run a scan first with scan_site.`;
    }

    snapshotId = snapshots[0].id;
  }

  const result = await client.getRawAudit(snapshotId, auditKey);

  const audit = result.audit;
  const title = (audit.title as string) ?? auditKey;
  const description = (audit.description as string) ?? "";
  const score = audit.score !== undefined ? audit.score : "N/A";
  const displayValue = (audit.displayValue as string) ?? "";

  const lines: string[] = [
    `Audit: ${title}`,
    `Key:   ${result.audit_key}`,
    `Snapshot: #${result.snapshot_id}`,
    "",
    `Score: ${typeof score === "number" ? Math.round((score as number) * 100) + "/100" : score}`,
  ];

  if (displayValue) {
    lines.push(`Value: ${displayValue}`);
  }

  if (description) {
    lines.push("", `About: ${stripMarkdownLinks(description)}`);
  }

  // Format details items if present
  const details = audit.details as
    | { type?: string; items?: unknown[] }
    | undefined;
  if (details?.items && Array.isArray(details.items) && details.items.length > 0) {
    lines.push("", `Items (${details.items.length}):`);

    const maxItems = 15;
    const items = details.items.slice(0, maxItems) as Record<string, unknown>[];

    for (const item of items) {
      const itemLine = formatAuditItem(item);
      if (itemLine) lines.push(`  • ${itemLine}`);
    }

    if (details.items.length > maxItems) {
      lines.push(`  ... and ${details.items.length - maxItems} more`);
    }
  }

  return lines.join("\n");
}

function formatAuditItem(item: Record<string, unknown>): string {
  // Common Lighthouse item shapes
  const parts: string[] = [];

  if (typeof item.url === "string") parts.push(shortenUrl(item.url));
  if (typeof item.label === "string") parts.push(item.label);
  if (typeof item.duration === "number") {
    parts.push(`${Math.round(item.duration as number)}ms`);
  }
  if (typeof item.wastedMs === "number") {
    parts.push(`saves ${Math.round(item.wastedMs as number)}ms`);
  }
  if (typeof item.wastedBytes === "number") {
    const kb = Math.round((item.wastedBytes as number) / 1024);
    parts.push(`saves ${kb}KB`);
  }
  if (typeof item.totalBytes === "number") {
    const kb = Math.round((item.totalBytes as number) / 1024);
    parts.push(`${kb}KB`);
  }

  if (parts.length === 0) {
    // Fallback: stringify first few keys
    const keys = Object.keys(item).slice(0, 3);
    return keys.map((k) => `${k}: ${JSON.stringify(item[k])}`).join(", ");
  }

  return parts.join(" — ");
}

function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 40
      ? "..." + parsed.pathname.slice(-37)
      : parsed.pathname;
    return parsed.hostname + path;
  } catch {
    return url.length > 60 ? url.slice(0, 57) + "..." : url;
  }
}

function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}
