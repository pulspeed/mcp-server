export interface Site {
  id: number;
  name: string;
  url: string;
  frequency: "daily" | "weekly";
  strategy: "mobile" | "desktop";
  repo_name: string | null;
  created_at: string;
  updated_at: string;
  latest_snapshot: Snapshot | null;
}

export interface SnapshotMetrics {
  fcp: number | null;
  lcp: number | null;
  tti: number | null;
  tbt: number | null;
  ttfb: number | null;
  cls: number | null;
}

export interface Snapshot {
  id: number;
  site_id: number;
  performance_score: number | null;
  metrics: SnapshotMetrics;
  analysis?: string | null;
  strategy: string;
  taken_at: string;
  created_at: string;
}

export interface SiteDetails {
  site: Site;
  snapshots: Snapshot[];
  chart_data: {
    labels: string[];
    scores: (number | null)[];
    metrics: {
      fcp: (number | null)[];
      lcp: (number | null)[];
      tti: (number | null)[];
      tbt: (number | null)[];
      ttfb: (number | null)[];
      cls: (number | null)[];
    };
  };
  analysis: string | null;
  webhook_events: string[];
}

export interface ScanJob {
  id: number;
  site_id: number;
  status: "pending" | "processing" | "done" | "failed";
  source: string;
  started_at: string | null;
  finished_at: string | null;
  error_message?: string | null;
}

export interface ScanJobStatus {
  id: number;
  site_id: number;
  status: "pending" | "processing" | "done" | "failed";
  source: string;
  started_at: string | null;
  finished_at: string | null;
  error_message?: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  plan: "free" | "pro" | "team";
  avatar: string | null;
  email_verified_at: string | null;
  created_at: string;
}

export interface UsageData {
  plan: string;
  period: { start: string; end: string };
  scans: { used: number; limit: number; remaining: number };
  ai_analyses: { used: number; limit: number; remaining: number };
}

export interface MetricsHistoryEntry {
  performance_score: number | null;
  fcp: number | null;
  lcp: number | null;
  tti: number | null;
  tbt: number | null;
  ttfb: number | null;
  cls: number | null;
  taken_at: string;
}

export interface MetricsData {
  url: string;
  site_id: number;
  current: MetricsHistoryEntry | null;
  trend: "improving" | "stable" | "declining" | "insufficient_data";
  history: MetricsHistoryEntry[];
  period: string;
}

export interface PerformanceBudgets {
  performance_score?: { min?: number };
  lcp?: { max?: number };
  fcp?: { max?: number };
  tbt?: { max?: number };
  ttfb?: { max?: number };
  cls?: { max?: number };
}

export interface PerformanceBudgetResult {
  site_id: number;
  performance_budgets: PerformanceBudgets | null;
}

export interface RawAuditData {
  snapshot_id: number;
  audit_key: string;
  audit: Record<string, unknown>;
}

export interface ScanV2Result {
  // Returned when wait=true: snapshot data
  id?: number;
  performance_score?: number | null;
  metrics?: SnapshotMetrics;
  strategy?: string;
  taken_at?: string;
  // Returned when wait=false: job data
  status?: "pending" | "processing" | "done" | "failed";
  site_id?: number;
}
