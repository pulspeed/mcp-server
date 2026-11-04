# @pulspeed/mcp-server

**Website performance monitoring for AI agents.**

[Pulspeed](https://pulspeed.ai) MCP server exposes 11 tools for scanning sites, reading Core Web Vitals, detecting regressions, and getting AI-powered recommendations — all callable by Claude, Cursor, Windsurf, and any MCP-compatible agent.

[![npm version](https://img.shields.io/npm/v/@pulspeed/mcp-server)](https://www.npmjs.com/package/@pulspeed/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Quick Setup

### Get an API key

Sign up at [pulspeed.ai](https://pulspeed.ai) → **Settings → API Tokens** → create a token.

### Claude Code (CLI)

```bash
claude mcp add pulspeed -e PULSPEED_API_KEY=your_token_here -- npx -y @pulspeed/mcp-server
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "pulspeed": {
      "command": "npx",
      "args": ["-y", "@pulspeed/mcp-server"],
      "env": {
        "PULSPEED_API_KEY": "your_token_here"
      }
    }
  }
}
```

### Cursor

Edit `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "pulspeed": {
      "command": "npx",
      "args": ["-y", "@pulspeed/mcp-server"],
      "env": {
        "PULSPEED_API_KEY": "your_token_here"
      }
    }
  }
}
```

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "pulspeed": {
      "command": "npx",
      "args": ["-y", "@pulspeed/mcp-server"],
      "env": {
        "PULSPEED_API_KEY": "your_token_here"
      }
    }
  }
}
```

---

## Tools

All tools that identify a site accept either `url` or `site_id`.

### `scan_site`

Trigger a PageSpeed Insights scan. Creates the site automatically if not yet tracked. Blocks until done (~30–60s) by default.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | ✓ | URL to scan |
| `strategy` | `mobile` \| `desktop` | — | Default: `mobile` |
| `wait` | boolean | — | `true` (default) = wait for result; `false` = async, returns `job_id` |

### `bulk_scan`

Scan multiple URLs at once (max 10). All jobs are dispatched immediately.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `urls` | string[] | ✓ | 1–10 URLs |
| `strategy` | `mobile` \| `desktop` | — | Default: `mobile` |
| `wait` | boolean | — | `false` (default) = async; `true` = sequential with results |

### `list_sites`

List all monitored sites with latest scores and scan settings.

### `get_site_metrics`

Core Web Vitals for a site with trend analysis and score history.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | ✓ or `site_id` | Site URL |
| `site_id` | number | ✓ or `url` | Pulspeed site ID |
| `period` | `24h` \| `7d` \| `30d` \| `90d` | — | History window (default: `7d`) |

### `get_recommendations`

AI-powered optimisation recommendations from the latest scan analysis. Requires Developer or Scale plan.

### `compare_snapshots`

Compare two scans with % deltas and a human-readable assessment (`🟢 Significant improvement` → `🔴 Significant regression`).

| Param | Type | Description |
|-------|------|-------------|
| `url` / `site_id` | — | Site identifier (compares latest two) |
| `snapshot_id_a` | number | Specific newer snapshot |
| `snapshot_id_b` | number | Specific older snapshot |

### `list_regressions`

Find consecutive scans where the performance score dropped significantly.

| Param | Type | Description |
|-------|------|-------------|
| `url` / `site_id` | — | Site identifier |
| `threshold` | number | Min score drop to count (default: `3`) |
| `limit` | number | Scan history to analyse (default: `20`, max: `50`) |

### `get_usage`

Current billing-period consumption: scans used/remaining, AI analyses, plan limits.

### `set_performance_budget`

Set metric thresholds for a site. Violations trigger `threshold.exceeded` webhook events on the next scan.

| Param | Type | Description |
|-------|------|-------------|
| `url` / `site_id` | — | Site identifier |
| `performance_score` | `{ min: number }` | e.g. `{ min: 80 }` |
| `lcp` | `{ max: number }` | Max LCP in ms, e.g. `{ max: 2500 }` |
| `fcp` | `{ max: number }` | Max FCP in ms |
| `tbt` | `{ max: number }` | Max TBT in ms |
| `ttfb` | `{ max: number }` | Max TTFB in ms |
| `cls` | `{ max: number }` | Max CLS, e.g. `{ max: 0.1 }` |

### `get_raw_audit`

Full Lighthouse audit data for a specific audit key — detailed resource-level breakdown.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` / `site_id` | — | ✓ or `snapshot_id` | Site identifier |
| `snapshot_id` | number | — | Specific snapshot (default: latest) |
| `audit_key` | string | ✓ | Lighthouse audit key |

Common audit keys: `render-blocking-resources`, `bootup-time`, `unused-javascript`, `uses-optimized-images`, `network-requests`, `uses-text-compression`.

### `get_seo_audit`

Latest technical SEO audit from [CrawlRay](https://crawlray.com): overall score and per-check status with issues. Audits run automatically after performance scans on paid plans.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` / `site_id` | — | ✓ | Site identifier |

---

## Example Prompts

```
"Scan https://mysite.com and tell me the performance score"

"What's the LCP trend for mysite.com over the last 30 days?"

"My site slowed down today — what changed?"

"Scan all pages: homepage, /about, /blog and compare their scores"

"Set a performance budget: score ≥ 80, LCP ≤ 2500ms"

"Show me the render-blocking resources slowing down mysite.com"
```

## Example: Diagnose a regression

```
User: "My Lighthouse score dropped 12 points overnight. What happened?"

→ list_regressions(url="https://mysite.com", threshold=5)
   "🔴 CRITICAL −12 pts: 78 → 66 on 2026-02-22 (snapshot #142)"

→ compare_snapshots(url="https://mysite.com")
   "LCP: 2100ms → 3800ms (+81% ✗)  TBT: 180ms → 520ms (+189% ✗)"

→ get_raw_audit(url="https://mysite.com", audit_key="bootup-time")
   "analytics-v2.js — 1840ms execution. Saves 1.2s if deferred."

Agent: "A new analytics script blocks the main thread for 1.84s,
        causing LCP and TBT to spike. Defer or async-load it."
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PULSPEED_API_KEY` | ✓ | — | API token from pulspeed.ai/settings |
| `PULSPEED_BASE_URL` | — | `https://pulspeed.ai/api/v1` | Override for self-hosted |

---

## Plans

All plans include MCP access. Quotas apply:

| Plan | Scans/month | AI Analysis | Webhooks |
|------|-------------|-------------|----------|
| Free | 30 | 5/month | — |
| Developer ($29) | 500 | Included | 5 endpoints |
| Scale ($79) | 2,000 | Included | 20 endpoints |

---

## Development

```bash
git clone https://github.com/pulspeed/mcp-server
cd mcp-server
npm install
npm run build    # compile TypeScript → dist/
npm run dev      # watch mode
npm start        # run compiled server
```

---

## License

MIT © [Pulspeed](https://pulspeed.ai)
