import type { PulspeedApiClient } from "../client/api.js";
import { resolveSite } from "./helpers.js";

export const getSeoAuditDefinition = {
  name: "get_seo_audit",
  description:
    "Get the latest technical SEO audit for a monitored website (robots.txt, sitemap, meta tags, canonical, structured data, security headers, redirects, hreflang, internal links, AI crawler access) with per-check status and issues.",
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
    },
  },
};

export async function handleGetSeoAudit(
  client: PulspeedApiClient,
  args: Record<string, unknown>,
): Promise<string> {
  const site = await resolveSite(client, args);
  const { seo } = await client.getSite(site.id);

  if (!seo) {
    return `No SEO audit available for ${site.url} yet. Audits run automatically after performance scans on paid plans.`;
  }

  const lines: string[] = [
    `Site: ${site.url}`,
    `SEO score: ${seo.overall_score}/100  (audited ${seo.audited_at})`,
    `Checks: ${seo.total_checks} total, ${seo.passed} passed, ${seo.warnings} warnings, ${seo.failed} failed`,
    "",
  ];

  for (const [check, result] of Object.entries(seo.results)) {
    lines.push(`${result.status.toUpperCase().padEnd(5)} ${check} (${result.score})`);
    if (result.error) {
      lines.push(`      error: ${result.error}`);
    }
    for (const issue of result.issues) {
      const detail = issue.detail ? ` — ${issue.detail}` : "";
      lines.push(`      [${issue.severity}] ${issue.message}${detail}`);
    }
  }

  return lines.join("\n");
}
