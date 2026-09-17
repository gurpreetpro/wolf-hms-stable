# Production Observability & Prometheus Alerting Guide

> **Standard**: Wolf HMS Reliability & Security Monitoring  
> **Applicability**: Enterprise Production Clusters & VPS Deployments  
> **Scrape Targets**: `GET /api/metrics` (Prometheus text) & `GET /api/health/obs` (JSON Health Telemetry)

---

## 1. Overview & Architecture

Wolf HMS Phase 6 introduces continuous Prometheus metrics collection and structured operational visibility:
- **`GET /api/metrics`**: Exposes standard Prometheus text metrics (`prom-client`), including `http_requests_total`, `http_request_duration_ms_bucket`, process telemetry, and database execution statistics. Protected behind `super_admin`, `platform_owner`, or `admin` roles.
- **`GET /api/health/obs`**: Exposes machine-readable aggregate health telemetry for internal dashboards and heartbeat monitors (`uptimeSeconds`, request counts, 15m error rate, active WebSocket connections, and PostgreSQL connection pool stats).
- **`docs/alert.rules.yml`**: Pre-configured Prometheus Alertmanager rules designed for rapid anomaly detection and incident response.

---

## 2. Prometheus Scrape Configuration

To configure Prometheus to scrape Wolf HMS securely:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'wolf-hms-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/wolf/api/metrics'
    scheme: 'http'
    bearer_token: '<PROMETHEUS_SERVICE_ACCOUNT_JWT>'
    static_configs:
      - targets: ['185.213.27.158:5002']
        labels:
          environment: 'production'
          app: 'wolf-hms'
```

*Note*: For scraping behind Nginx, configure Nginx to proxy `/api/metrics` or pass the `Authorization: Bearer <token>` header from a dedicated scrape service account.

---

## 3. Core Alerting Rules & Threshold Rationale

| Alert Name | Trigger Expression | Severity | Triage Runbook |
|---|---|---|---|
| `WolfHmsHigh5xxErrorRate` | 5xx rate $> 2\%$ over 5m | 🔴 Critical | Inspect `logs/server.log` for unhandled exceptions or database connection failures. Check Sentry dashboard for active stack traces. |
| `WolfHmsHighP95Latency` | P95 latency $> 1,000$ms over 5m | 🟡 Warning | Check PostgreSQL connection pool waiting count (`pg_pool_waiting_count`) and slow queries log (`db_slow_queries_total`). Verify if large reports/exports are running. |
| `WolfHmsSocketDisconnectSpike` | Socket disconnects $> 50$/s | 🟡 Warning | Verify Redis horizontal adapter health (`attachAdapter`) and Nginx WebSocket proxy configuration (`proxy_read_timeout`). |
| `WolfHmsRlsCrossTenantBlockSurge` | Cross-tenant violations $> 5$ in 5m | 🔴 Critical | Security incident. Investigate IP and user account initiating requests to verify if an active credential compromise or cross-tenant crawl is underway. |
| `WolfHmsTokenReuseDetected` | Token reuse $> 0$ | 🔴 Critical | Potential session hijacking. The entire token family has been automatically revoked. Notify user and review authentication audit trail. |
| `WolfHmsDbPoolExhaustion` | Connection pool waiting count $> 5$ for 2m | 🔴 Critical | PostgreSQL pool exhausted. Increase `PG_POOL_MAX` in `.env` or check for long-running uncommitted transactions. |
| `WolfHmsDiskSpaceLow` | Root partition storage $> 85\%$ | 🟡 Warning | Rotate audit log files, purge old Docker images (`docker system prune`), and move backup archives to cold S3/B2 storage. |

---

## 4. Aggregate Health Endpoint (`GET /api/health/obs`)

System administrators and monitoring agents can poll `/api/health/obs` to inspect real-time operational status without parsing Prometheus raw text.

### Example Request
```bash
curl -H "Authorization: Bearer <ADMIN_JWT>" \
  "http://185.213.27.158/wolf/api/health/obs"
```

### Example Response
```json
{
  "status": "OK",
  "uptimeSeconds": 86400,
  "requests": {
    "total": 142050,
    "success": 141200,
    "error": 850
  },
  "errorRateWindow": 0.60,
  "activeSockets": 48,
  "dbPool": {
    "totalCount": 10,
    "idleCount": 8,
    "waitingCount": 0
  }
}
```
