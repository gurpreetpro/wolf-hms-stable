# PHASE 6 - Observability: Metrics, Logging, Alerting & Error Visibility

**Execution Pack for Gemini 3.8 Flash**
**Approved:** 2026-09-16 | **Authority:** Conductor (Phases 1-5 verified; 151 backend + 16 frontend tests green)

Facts below are conductor-verified against the live codebase. Do NOT re-audit; implement directly.

## Verified Starting State

| # | Fact |
|---|------|
| P6-1 | **Observability deps installed but largely unwired**: `prom-client ^14.2.0`, `winston ^3.8.2`, `@sentry/node ^7.53.1` all present in `server/package.json`. |
| P6-2 | **Sentry wired**: `Overwatch.initSentry(app)` at `server-cloud.js:446`. DSN likely absent in prod env - verify gate behavior. |
| P6-3 | `metricsMiddleware.js` exists (`res.on(finish)` -> `MetricsCollector.recordRequest(method, url, status, duration)`) but is **NOT mounted** in server-cloud.js. |
| P6-4 | `server/services/MetricsCollector.js` exists; storage format unknown - likely in-memory counters; needs `/metrics` exposure. |
| P6-5 | **No Prometheus `/metrics` endpoint**; no aggregated admin status endpoint; dashboard has no system-health tile. |
| P6-6 | **Winston** present but unused at call sites - code uses `console.log` (verified: CORS, SSO, mount logs). |
| P6-7 | Harness: 151 backend + 16 frontend tests green; stable patterns. |

## Objective
Activate the installed-but-dormant observability stack: request metrics exposed, structured logging, alert definitions, verified Sentry pipeline. Local artifacts; zero VPS contact.

---

## W1 - Request Metrics (prom-client + existing middleware)
1. Read `server/services/MetricsCollector.js` fully. Preferred path: refactor onto `prom-client` (Counter `http_requests_total{method,route,status}`, Histogram `http_request_duration_ms`) while keeping the existing public API so `metricsMiddleware.js` needs no behavior change. If already prom-based, skip refactor.
2. **Mount `metricsMiddleware` in server-cloud.js before ALL route registrations** (right after helmet/CORS, before tenantResolver). It is currently unused.
3. Expose `GET /api/metrics` returning `register.metrics()` text, gated by `protect` + `authorizeRoles(super_admin, platform_owner, admin)`. Document Prometheus scrape basic-auth in runbook.
4. Tests `tests/contract/metrics.test.js` (>=4): unauthenticated 401; role gating; Content-Type contains text/plain; after one instrumented request, body contains `http_requests_total`.

## W2 - Structured Logging with Winston (additive)
1. `server/utils/logger.js` - winston logger: JSON in production (NODE_ENV=production), colorized console in dev; env `LOG_LEVEL` (default info), `LOG_FILE` (default `logs/server.log`); auto-create dir; wire `.exceptions`/`.rejections` handlers.
2. Replace console.* in ONLY THESE 6 SITES: requestLogger middleware, auditMiddleware, socketCluster attach, secrets-vault boot validation, refresh-token reuse detection, admin-cli runs. NO codebase-wide sweep.
3. Test `tests/unit/logger.test.js`: logger exists; honors LOG_LEVEL; creates missing log dir without crashing.

## W3 - Sentry Verification & Activation Path
1. Read Overwatch initSentry implementation (grep Overwatch.js); confirm DSN-gated and env var name (likely SENTRY_DSN).
2. Add `GET /api/debug/sentry-trigger` (super_admin only AND only when NODE_ENV !== production) that throws a test error.
3. Runbook `scripts/probes/error-tracking-verify.md`: operator sets DSN on VPS -> restart -> hit trigger -> confirm issue in Sentry.
4. Test `tests/unit/sentryGate.test.js`: 403 without role; no-DSN branch does not crash.

## W4 - Alert Definitions & Aggregate Health Contract
1. `docs/ALERTING.md` + `alert.rules.yml` snippet for operator: high 5xx rate (>2% over 5m), p95 latency > 1s, socket disconnect spike, RLS cross-tenant blocks, refresh-token reuse detections, disk-fill. Files only; no deploy.
2. New admin endpoint `GET /api/health/obs` returning JSON: uptimeSeconds, requests total, errorRateWindow (last 15m from MetricsCollector), activeSockets (if exposed), dbPool (use pool.totalCount/waitingCount from dbPools if available).
3. NO client UI this phase - JSON contract only; the dashboard tile is a later track.
4. Tests `tests/contract/obsStatus.test.js` (>=3): role gating; response contains uptimeSeconds, requests, errorRateWindow keys.

## W5 - Docs & Memory Bank
- `HARDENING_PROGRAM.md`: Phase 6 marked done; Phase 7 preview (security review sprint 2, perf hardening, backup automation completion).
- `docs/openapi.yaml`: add /api/metrics, /api/health/obs, /api/debug/sentry-trigger; keep redocly lint clean and openapiCoverage green.
- `memory-bank/activeContext.md` + `progress.md` updated.

---

## Exit Criteria
- [ ] 151 prior green + >=11 new (metrics 4, logger 2, sentry 1, obs 4) -> **>=162 green**
- [ ] metricsMiddleware mounted; /api/metrics admin-gated, Prom text emitted
- [ ] Winston logger env-driven; exceptions/rejections handled
- [ ] Sentry trigger gated and non-crashing without DSN; runbook written
- [ ] docs/ALERTING.md + alert.rules.yml authored; /api/health/obs contract test green
- [ ] OpenAPI updated & lint clean; memory-bank updated; zero VPS actions

## Hard Boundaries
- NO VPS/SSH, no Sentry org creation, no Prometheus/Grafana service setup - configs + docs + gates only
- NO new dependencies (everything needed is already installed)
- NO sweeping console.log replacement (only the 6 listed sites)
- NO removal/change of requestLogger behavior
- NO client-side (React/WGM) changes
- Grep before assuming mount points; ambiguity -> STOP, ask conductor
- Preserve Phase 4 default-off (Redis/REDIS_HOST/cluster) and Phase 5 SSO-disabled defaults exactly

## Deliverable
Workstream status table + npm test tail + redocly lint + changed-file list. Local only.

