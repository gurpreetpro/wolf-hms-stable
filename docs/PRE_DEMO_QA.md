# Pre-Demo QA Runbook (Founder, 1 page)

Run this **before walking into a clinic or a funding meeting**. Everything is local; production
(`185.213.27.158`) is under a code freeze and is never touched by this funnel.

---

## 0. One-time setup

```powershell
# backend + frontend deps
npm --prefix server install
npm --prefix client install
npm --prefix client install -D @playwright/test

# local API + Postgres must be running: server/.env points at localhost:5432 / hospital_db
# Playwright browsers: the CDN download is blocked on this network, so the suites use the
# installed Microsoft Edge via `channel: msedge` (no download needed).
```

## 1. Reset the hospital to the golden snapshot (≈ 3 seconds)

```powershell
npm --prefix server run demo:restore   # pg_restore --clean --if-exists --no-owner  → 15/15 patients in ~3s
```

Rebuild the demo data instead (idempotent, ~0.3 s) and refresh the snapshot:

```powershell
npm --prefix server run demo:seed      # writes plans/seeded_ids.json
npm --prefix server run demo:backup    # backups/demo_golden.dump (custom format, ~1.5 MB)
```

## 2. Start the stack

```powershell
# API (server-cloud.js = the production entry, 517-route baseline)
$env:PORT='8080'; $env:ADMIN_MIGRATE_SECRET='local-qa-dev-secret'
cd server; node server-cloud.js           # health: http://127.0.0.1:8080/api/health

# UI (new terminal)
cd client; npm run dev                    # http://localhost:5173  (login: admin / password123)
```

> The API hardcodes a **500 requests / 15 min** IP limiter. The 500-hunter waits for the
> window to roll over automatically; the browser suites stay far below it.

## 3. Run the funnel

```powershell
# a) backend contract/unit tests (expect 193 passed)
cd server; npx jest --forceExit

# b) runtime sweep of every Bucket A & B GET route with real seeded ids
cd ..; npm run qa:500-hunter:demo         # demo-critical families (237 routes) — the gate below
cd ..; npm run qa:500-hunter              # full sweep (535 routes, slower)

# c) browser journey + realtime + network rehearsal
cd client
npx playwright test e2e/golden-clinical-journey.spec.js   # 5 steps, Reception → Billing
npx playwright test e2e/socket-sync.spec.js               # multi-tab CODE BLUE sync (<300 ms budget)
$env:E2E_BASE_URL='http://localhost:4173'; $env:E2E_SERVER_CMD='npm run preview -- --port 4173'
npx playwright test e2e/demo-rehearsal.spec.js            # Fast 4G budgets on the built bundle
```

Or the whole thing in one shot:

```powershell
npm run qa:pre-demo        # seed → 500-hunter (demo profile) → Playwright E2E
```

## 4. Read the verdicts

| Artifact | What it proves |
|---|---|
| `scripts/qa/500-hunter-report.md` / `.json` | which GET routes 5xx, classified `UUID_MISMATCH` / `SCHEMA_GAP` |
| `plans/500-hunter-known-issues.md` | the current, triaged residual list (schema drift vs. code bugs) |
| `client/e2e/results/rehearsal-report.md` | FCP / TTI / transfer / bundle budget under Fast 4G |
| `client/e2e/results/socket-latency.json` | measured multi-tab broadcast + resolve latency |
| `client/e2e/results/zero-error-trap.json` | every captured page error / 5xx / bucket A/B 4xx |

## 5. Demo logins (hospital_id = 1)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `password123` |
| Doctor | `doctor_demo` | `password123` |
| Nurse | `nurse_demo` | `password123` |
| Reception | `receptionist_user` | `password123` |
| Lab | `lab_tech` | `password123` |
| Pharmacist | `pharmacist` | `password123` |

## 6. If something is red

1. `npm --prefix server run demo:restore` (5 s) — half of all "weird state" disappears.
2. Re-run only the failing artifact (each is independent and idempotent).
3. Check `plans/500-hunter-known-issues.md` — if the failure is in that register it is a known
   local-schema gap, not a demo blocker for the golden journey.
