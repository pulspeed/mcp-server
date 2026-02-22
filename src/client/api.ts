import { PulspeedConfig } from "../config.js";
import type {
  MetricsData,
  PerformanceBudgetResult,
  PerformanceBudgets,
  RawAuditData,
  Site,
  SiteDetails,
  Snapshot,
  ScanJob,
  ScanJobStatus,
  UsageData,
} from "./types.js";

export class PulspeedApiClient {
  private readonly headers: Record<string, string>;
  private readonly baseUrl: string;
  private readonly v2Url: string;

  constructor(config: PulspeedConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    // Derive v2 base URL from v1 (handles both /api/v1 and custom URLs)
    this.v2Url = this.baseUrl.replace(/\/v1$/, "/v2");
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  // ── V1 methods ────────────────────────────────────────────────

  async listSites(): Promise<Site[]> {
    return this.get<Site[]>("/sites");
  }

  async getSite(siteId: number): Promise<SiteDetails> {
    return this.get<SiteDetails>(`/sites/${siteId}`);
  }

  async createSite(
    url: string,
    name: string,
    frequency: string = "daily",
  ): Promise<Site> {
    return this.post<Site>("/sites", { url, name, frequency });
  }

  async triggerScan(siteId: number): Promise<ScanJob> {
    return this.post<ScanJob>(`/sites/${siteId}/scan`, {});
  }

  async getScanJobStatus(jobId: number): Promise<ScanJobStatus> {
    return this.get<ScanJobStatus>(`/scan-jobs/${jobId}`);
  }

  async getSnapshot(snapshotId: number): Promise<Snapshot> {
    return this.get<Snapshot>(`/snapshots/${snapshotId}`);
  }

  async getSiteSnapshots(siteId: number): Promise<Snapshot[]> {
    return this.get<Snapshot[]>(`/sites/${siteId}/snapshots`);
  }

  // ── V2 methods ────────────────────────────────────────────────

  /** POST /api/v2/scan — instant scan, synchronous by default */
  async scanV2(
    url: string,
    strategy: "mobile" | "desktop" = "mobile",
    wait: boolean = true,
  ): Promise<Snapshot | ScanJob> {
    return this.postV2<Snapshot | ScanJob>("/scan", { url, strategy, wait });
  }

  /** GET /api/v2/usage */
  async getUsage(): Promise<UsageData> {
    return this.getV2<UsageData>("/usage");
  }

  /** GET /api/v2/metrics?url=...&period=7d */
  async getMetrics(url: string, period: string = "7d"): Promise<MetricsData> {
    const params = new URLSearchParams({ url, period });
    return this.getV2<MetricsData>(`/metrics?${params.toString()}`);
  }

  /** PUT /api/v2/sites/{id}/budgets */
  async setPerformanceBudget(
    siteId: number,
    budgets: PerformanceBudgets,
  ): Promise<PerformanceBudgetResult> {
    return this.putV2<PerformanceBudgetResult>(
      `/sites/${siteId}/budgets`,
      budgets as Record<string, unknown>,
    );
  }

  /** GET /api/v2/snapshots/{id}/raw-audit/{key} */
  async getRawAudit(snapshotId: number, key: string): Promise<RawAuditData> {
    return this.getV2<RawAuditData>(
      `/snapshots/${snapshotId}/raw-audit/${encodeURIComponent(key)}`,
    );
  }

  // ── Private helpers ───────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    return this.request<T>(`${this.baseUrl}${path}`, "GET");
  }

  private async getV2<T>(path: string): Promise<T> {
    return this.request<T>(`${this.v2Url}${path}`, "GET");
  }

  private async post<T>(
    path: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(`${this.baseUrl}${path}`, "POST", data);
  }

  private async postV2<T>(
    path: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(`${this.v2Url}${path}`, "POST", data);
  }

  private async putV2<T>(
    path: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(`${this.v2Url}${path}`, "PUT", data);
  }

  private async request<T>(
    url: string,
    method: string,
    data?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${body}`,
      );
    }

    const json = await response.json();
    return (json.data ?? json) as T;
  }
}
