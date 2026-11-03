import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "./config.js";
import { PulspeedApiClient } from "./client/api.js";

import {
  listSitesDefinition,
  handleListSites,
} from "./tools/list-sites.js";
import {
  getSiteMetricsDefinition,
  handleGetSiteMetrics,
} from "./tools/get-site-metrics.js";
import {
  getRecommendationsDefinition,
  handleGetRecommendations,
} from "./tools/get-recommendations.js";
import {
  scanSiteDefinition,
  handleScanSite,
} from "./tools/scan-site.js";
import {
  compareSnapshotsDefinition,
  handleCompareSnapshots,
} from "./tools/compare-snapshots.js";
import {
  getUsageDefinition,
  handleGetUsage,
} from "./tools/get-usage.js";
import {
  setPerformanceBudgetDefinition,
  handleSetPerformanceBudget,
} from "./tools/set-performance-budget.js";
import {
  bulkScanDefinition,
  handleBulkScan,
} from "./tools/bulk-scan.js";
import {
  listRegressionsDefinition,
  handleListRegressions,
} from "./tools/list-regressions.js";
import {
  getRawAuditDefinition,
  handleGetRawAudit,
} from "./tools/get-raw-audit.js";
import {
  getSeoAuditDefinition,
  handleGetSeoAudit,
} from "./tools/get-seo-audit.js";

const TOOL_DEFINITIONS = [
  // Core
  listSitesDefinition,
  scanSiteDefinition,
  getSiteMetricsDefinition,
  getRecommendationsDefinition,
  compareSnapshotsDefinition,
  // New in 4.1
  getUsageDefinition,
  setPerformanceBudgetDefinition,
  bulkScanDefinition,
  listRegressionsDefinition,
  getRawAuditDefinition,
  getSeoAuditDefinition,
];

export async function main(): Promise<void> {
  const config = loadConfig();
  const apiClient = new PulspeedApiClient(config);

  const server = new Server(
    { name: "pulspeed", version: "1.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const toolArgs = (args ?? {}) as Record<string, unknown>;

    try {
      let result: string;

      switch (name) {
        case "list_sites":
          result = await handleListSites(apiClient);
          break;
        case "get_site_metrics":
          result = await handleGetSiteMetrics(apiClient, toolArgs);
          break;
        case "get_recommendations":
          result = await handleGetRecommendations(apiClient, toolArgs);
          break;
        case "scan_site":
          result = await handleScanSite(apiClient, toolArgs);
          break;
        case "compare_snapshots":
          result = await handleCompareSnapshots(apiClient, toolArgs);
          break;
        case "get_usage":
          result = await handleGetUsage(apiClient);
          break;
        case "set_performance_budget":
          result = await handleSetPerformanceBudget(apiClient, toolArgs);
          break;
        case "bulk_scan":
          result = await handleBulkScan(apiClient, toolArgs);
          break;
        case "list_regressions":
          result = await handleListRegressions(apiClient, toolArgs);
          break;
        case "get_raw_audit":
          result = await handleGetRawAudit(apiClient, toolArgs);
          break;
        case "get_seo_audit":
          result = await handleGetSeoAudit(apiClient, toolArgs);
          break;
        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
