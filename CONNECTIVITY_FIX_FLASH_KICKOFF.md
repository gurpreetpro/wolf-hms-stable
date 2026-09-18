# CONNECTIVITY RESTORATION — GEMINI 3.8 FLASH KICKOFF

**Mission**: Fix system-wide "failed to load data" dashboards and dead buttons by reconciling frontend API calls with backend routes in the PRODUCTION server entry (`server/server-cloud.js`).

**Role split (unchanged)**: Flash implements → Conductor (user's agent) verifies → Claude Opus deploys.
**Do NOT deploy. Do NOT touch SSH/VPS. Commit locally in small, clean commits.**

---

## 1. Background (What Broke & Why)

Symptom on prod (`http://185.213.27.158`): many dashboards show "Could not fetch..." errors. Example: ICU page (`/icu`) shows *"Could not fetch active ICU admissions"* and its telemetry endpoints 404.

Conductor ran Phase 1 audit (`scripts/audit/route-matrix.js`) — **already complete, do not re-investigate:**

- 543 unique frontend API calls scanned across `client/src`
- **340 matched** routes in `server-cloud.js`, **203 broken** across **57 API families**
- Root causes:
  1. Many route families are mounted only in `server/server.js` (dev entry) and were never ported into `server-cloud.js` during the Phase 3 modularization.
  2. Some route files exist in `server/routes/` but are mounted in NEITHER entry.
  3. Some UI features have no backend at all (placeholder dashboards → dead buttons).
- `auditMiddleware` was audited and is fail-open — **NOT** a cause. Do not modify it.

### Audit artifacts (READ THESE FIRST)
- `scripts/audit/route-matrix-report.json` — full broken-call list (url, method, file:line)
- `scripts/audit/triage-families.json` — the 3 buckets below
- `scripts/audit/route-matrix.js` — re-run after fixes to measure progress (see §5)

### Bucket A — mounted in `server/server.js` (dev), missing or sub-route-broken in prod (31)
`2fa, abdm, admin, admissions, ai-billing, ai, alerts, auth, billing, blood-bank, clinical, dental, dietary, equipment, finance, govt-schemes, icu, lab, mortuary, nurse, ophthalmology, ot, patients, payments, pharmacy, platform, security, settings, support, transitions, upload`

⚠️ Two sub-cases:
- **A1: whole family unmounted in server-cloud.js** (e.g. `icu`, `maternity` (not in broken list but IS unmounted — include it), `2fa`, `alerts`, `govt-schemes`…) → add mount, mirroring server.js middleware (§3).
- **A2: family IS mounted but specific sub-paths missing** (e.g. `/api/admin/archive/*`, `/api/blood-bank/crossmatch`) → prod-mounted router file lacks those handlers; diff and port (P2-2).

### Bucket B — route file exists, not mounted anywhere (13)
`anaesthesia, branding, charges, dicom, intraop, license, migration, orthopedic, pac, pacu, pos, preauth, test`
→ Wire into server-cloud.js (P2-3). If a file won't boot or is a stub, STOP and report — do not hack it into shape.

### Bucket C — no backend exists at all (13)
`ambulance, assets, clinical-pathways, communications, infection-control, laundry, neonatal, order-sets, pre-op, prior-auth, quality, staff, waste`
→ UI-side fix ONLY (P2-4): disable dead buttons/cards with "Module not enabled" state. **Do NOT build new backends.**

---

## 2. Rules (non-negotiable)

1. **Contract-first rule**: never add fallbacks or silently change payloads. If a handler expects different keys than the frontend sends, fix the FRONTEND to match the backend, and cite both sides in your report.
2. `patients.id` = UUID, `hospitals.id` = INTEGER, `users.id` = INTEGER. Never mix.
3. Production entry is `server/server-cloud.js`. All mount fixes go there. `server.js` is read-only reference.
4. Copy middleware order from server.js exactly (`tenantResolver, authenticateToken` where dev had them). Auth must never become weaker than dev.
5. New mounts go in the same `app.use('/api/...')` region of server-cloud.js, keeping the existing grouping.
6. No new dependencies. No new npm packages.
7. Commits: one per P2 step (`fix(routes): P2-1 mount icu/maternity/… in server-cloud`) listing every family touched in the body.
8. If any previously-green test fails after your change, you broke something — fix before proceeding.

## 3. Reference pattern (from server.js lines 769–832 — VERIFIED)

```js
const icuRoutes = require('./routes/icuRoutes');
const maternityRoutes = require('./routes/maternityRoutes');
app.use('/api/icu', tenantResolver, authenticateToken, icuRoutes);
app.use('/api/maternity', tenantResolver, authenticateToken, maternityRoutes);
app.use('/api/payments', paymentRoutes);   // server.js mounts BOTH /payment and /payments
```

In server-cloud.js, reuse existing imports of `tenantResolver` / `authenticateToken` — do not declare duplicates.

## 4. Work Plan (execute in order)

### P2-1 — Bucket A1 mounts (highest yield, lowest risk)
1. For each Bucket A family: grep `server-cloud.js` for the mount. If the family prefix is absent, add require + `app.use` mirroring server.js.
2. Special cases:
   - `/api/icu`, `/api/maternity` — mount exactly per §3.
   - `2fa`: server.js mounts `auth2faRoutes` under `/api/auth`, but the frontend calls `/api/2fa/*`. Mount `auth2faRoutes` under BOTH `/api/auth` and `/api/2fa` in server-cloud.js and document the dual mount.
   - `payments`: mount at both `/api/payment` and `/api/payments` as server.js does.
3. Boot check: `node -e "require('./server/server-cloud.js')"` — a DB/ENV connection error AFTER route registration is acceptable; a require/syntax error is not. Paste raw output.

### P2-2 — Bucket A2 sub-route porting
1. For each remaining broken call whose family IS mounted: locate the mounted router file; if the handler is absent, find the dev equivalent and either port the handler or add an alias mount.
2. Path-spelling divergences (e.g. `/api/admission` vs `/api/admissions`, `/api/ward` vs `/api/wards`): fix by mounting the same router at BOTH paths — never duplicate handler code.
3. Confirmed must-fix: `/api/admin/archive/*` (4), `/api/blood-bank/crossmatch|reserve|transfusion/*`, `/api/ai/*` (9 calls — verify aiRoutes handlers), `/api/billing/add-item`, `/api/appointments/slots`, `/api/admissions?status=Admitted` (the ICU page failing call — verify response shape `{ data: [...] }` matches `ICUDashboard.jsx` line 70–77 expectation).

### P2-3 — Bucket B wiring
Mount the 13 families with appropriate middleware (check each router file header for expected middleware + DB tables). Report any that crash on require.

### P2-4 — Bucket C UI disable
1. For each broken Bucket C call, open the page/component listed in `route-matrix-report.json`.
2. Buttons/actions: render `disabled` with a "Module not enabled" tooltip/badge (use existing Ant Design `Tooltip`/`Badge` patterns already in the codebase).
3. Fetch hooks that would 404: catch and render a neutral empty state ("This module is not enabled on this server") instead of a red error banner.
4. Do NOT delete components, pages, or router registrations.

### P2-5 — Verification gate (ALL must pass — paste RAW output)
1. `node scripts/audit/route-matrix.js` → target: broken ≤ 30. Every remaining broken call gets a one-line justification in your report.
2. `cd server && npm test` — 193 baseline must stay green (paste summary).
3. `cd client && npm run build` — must succeed (paste tail).
4. `git status` clean except intended files; paste `git log --oneline -10`.

## 5. Report Format (mandatory, raw verbatim)

Per P2 step: files changed (with the exact mount lines added, verbatim), matrix numbers before/after, test/build raw tails, any family NOT fixed + why. No paraphrased "all good" — Conductor independently re-runs every check before approving for Opus deploy.

## 6. Out of Scope

- Phase 7 `wolf_app` cutover, backups, Sentry (operator tasks)
- WGM mobile track (paused)
- Any DB schema change — if a route needs a missing table, REPORT it; do NOT write a migration
- `exec-sql` (dead by design, stays dead)
