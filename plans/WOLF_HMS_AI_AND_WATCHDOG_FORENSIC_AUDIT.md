# WOLF HMS — AI & WATCHDOG FORENSIC AUDIT (STAGE 1, READ-ONLY)

**Scope:** 100% read-only (`client/src`, `server/` untouched; no DB access).
**Sources:** repository source, `client/package.json` / `server/package.json`, `plans/prod-schema-snapshot.json`.

---

## 0. EXECUTIVE SUMMARY

| Metric | Finding |
|---|---|
| AI SDK | **one**: `@google/generative-ai ^0.24.1` (legacy). **No `@google/genai`** anywhere in client or server. |
| Model strings in use | `gemini-2.5-flash` (≈20 instantiations, the de-facto standard), **`gemini-pro`** (1 — retired), **`gemini-1.5-flash`** (1 — retired). |
| Backend AI entry points | **3 mounted** routers: `/api/ai` (33 routes), `/api/ai-billing` (7), `/api/lab/parse-result` (OCR). |
| **Unmounted** AI router | `enterpriseAIRoutes.js` — **20 endpoints defined, never mounted** ⇒ every `/api/enterprise-ai/*` call is 404. |
| Dead AI code | `chatController.js` (`gemini-pro`) referenced only by a test; `chatRoutes.js` unmounted; `AIDataSteward.js`, `BloodBankAI.js` never imported by a route. |
| Client AI widgets | 8 live + 3 **orphans** (`AIAssistant.jsx`, `AINoteGenerator.jsx`, `AmbientListening.jsx` — imported by nothing). |
| The green chat bubble | `ChatAssistant` in `DashboardLayout.jsx:68` — **not AI at all**; rule-based command bar over 5 REST endpoints. |
| Deterministic fallbacks | `aiController` has catalog fallbacks (`symptomCatalog`, `clinicalCatalog`, `drugInteractions.json`) returning `fallback: true`; **OCR has none**. |
| Watchdog scaffolding that already exists | `ErrorBoundary` + `WidgetErrorBoundary`, global axios interceptor, `MetricsCollector`, `auditMiddleware → audit_logs`, and a **mounted `/api/support` ticket API** over `support_tickets` / `ticket_messages`. |
| Missing for the planned reporter | no client bug-report widget, no client telemetry POST, no error persistence from the browser, no AI-triage endpoint. |

## 1. BACKEND AI INVENTORY (`server/`)

### 1.1 SDK & environment

```
server/package.json:19   "@google/generative-ai": "^0.24.1"      ← legacy SDK (not @google/genai)
client/package.json      (no AI package — all calls proxy through the API)
env var used everywhere  GEMINI_API_KEY
```

`grep GEMINI_API_KEY` → `aiController.js:9`, `chatController.js:7`, `labOCRController.js:8`, `aiBillingEngine.js:10`, `ClinicalCoPilot.js:16`, `SmartInventory.js:4`, `scripts/list_models.js:5`, `scripts/test_claim_scrubber.js:7`.
No `GOOGLE_API_KEY`, no `GOOGLE_GENAI_*`, no service-account/Vertex configuration.

### 1.2 File → model → route → status

| File | Model / engine | Exposed by | Status |
|---|---|---|---|
| `controllers/aiController.js` (11 `getGenerativeModel` calls: L129,154,191,251,282,315,332,347,365,384,418) | **`gemini-2.5-flash`** | `routes/aiRoutes.js` → `/api/ai/*` (33 routes) | ✅ current model; **catalog fallbacks** for symptoms/diagnosis/drugs (`fallback: true`, L53/116/229); OCR branch has **no** fallback |
| `controllers/labOCRController.js:33` | **`gemini-1.5-flash`** ⚠ | `POST /api/lab/parse-result` (`labRoutes.js:85`) | ❌ retired model → the Lab "AI parse report" upload will fail (caught at L99 with a JSON-regex fallback) |
| `controllers/chatController.js:8` | **`gemini-pro`** ⚠ | **nothing** (only `tests/ai_extreme.test.js:79`) | 💀 dead + retired model |
| `services/ClinicalCoPilot.js:17` | `gemini-2.5-flash` | via `aiController` (Phase-3 co-pilot) | ✅ |
| `services/SmartInventory.js:5` | `gemini-2.5-flash` | `getSmartAlerts` → `/api/pharmacy/reports/smart-alerts` | ✅ |
| `services/aiBillingEngine.js:11` | `gemini-2.5-flash` | `controllers/aiBillingController.js` → `/api/ai-billing/*` | ✅ (records into `ai_billing_predictions`) |
| `services/ai/ClaimsAuditor.js` | 1 Gemini ref + rule logic | `enterpriseAIRoutes` (unmounted) | ⚠ unreachable |
| `services/ai/ClinicalPathwayAI.js` | **deterministic** (0 Gemini refs) | `enterpriseAIRoutes` (unmounted) | ⚠ unreachable |
| `services/ai/RevenueCycleAI.js` | **deterministic** | `enterpriseAIRoutes` (unmounted) | ⚠ unreachable |
| `services/ai/SupplyChainAI.js` | **deterministic** | `enterpriseAIRoutes` (unmounted) | ⚠ unreachable |
| `services/aiService.js` | **regex/heuristic** (no LLM) | `POST /api/ai/parse-prescription` (`aiRoutes.js:8-26`) | ✅ works — but it is *not* AI |
| `services/AIDataSteward.js`, `services/BloodBankAI.js` | no Gemini refs | not wired to any route | 💀 orphan services |
| `data/symptomCatalog.js`, `data/clinicalCatalog.js`, `data/drugInteractions.json` | deterministic KB | used as `aiController` fallbacks | ✅ |
| `controllers/enterpriseAIController.js` | delegates to `services/ai/*` | `routes/enterpriseAIRoutes.js` — **never mounted** | ❌ all 20 endpoints 404 |

### 1.3 Route surface actually mounted

```
server/server-cloud.js:333  app.use('/api/ai',        aiRoutes)          ✅ 33 routes
server/server-cloud.js:400  app.use('/api/ai-billing', aiBillingRoutes)  ✅  7 routes
server/routes/labRoutes.js:85  POST /api/lab/parse-result → parseLabReport (OCR, 1.5-flash)
server/routes/bucketCActivationRoutes.js:977  POST /revenue-ai/appeals    ✅ (deterministic)
── NOT mounted ──────────────────────────────────────────────────────────
server/routes/enterpriseAIRoutes.js   (20 routes: revenue/supply/clinical/ops)
server/routes/chatRoutes.js           (/api/chat/threads, /send, /read, /unread, /quick-replies, …)
```

`grep "enterpriseAI" server/server-cloud.js server/server.js` → **0 hits**; `grep "api/chat"` → **0 hits**. `chatController` is referenced only from a Jest file.

**AI endpoints that exist and are reachable (abridged):**
`/api/ai/parse-prescription`, `/triage`, `/analyze-symptoms`, `/symptoms`, `/suggest-diagnosis`, `/diagnose`, `/suggest-prescription`, `/prescribe`, `/drug-interactions`, `/drug-check`, `/medication-check`, `/check-interactions`, `/analyze-labs`, `/lab-analysis`, `/generate-summary`, `/generate-care-plan`, `/care-plan`, `/generate-soap`, `/generate-note`, `/scribe`, `/chat`, `/extract-id`, `GET /patient/:id/summary`, `GET /lab/:id/insights`, `GET /admission/:id/vitals-trend`.
`/api/ai-billing/`: `predict-denial`, `icd10/suggest`, `icd10/validate/:code`, `icd10/batch`, `optimize-pricing`, `estimate-approval`, `detect-anomalies`, `stats`.

## 2. FRONTEND AI INVENTORY (`client/src/`)

### 2.1 The **green chat bubble** present on every screen

```jsx
// client/src/components/DashboardLayout.jsx:17, 67-69
import ChatAssistant from './ChatAssistant';
…
{/* AI Chat Assistant - Hide trigger on Ward Dashboard as it has its own Dock */}
<ChatAssistant hideTrigger={location.pathname.startsWith('/ward')} />
```

`ChatAssistant.jsx` calls **no AI endpoint**. It is a rule-based command bar:

| Line | Endpoint | Purpose |
|---|---|---|
| `ChatAssistant.jsx:157` | `GET /api/auth/users` | resolve a doctor/staff name |
| `:170`, `:216` | `GET /api/admissions/active` | active IPD lookups |
| `:188` | `GET /api/patients/search?q=` | find a patient by name/phone |
| `:201`, `:209` | `GET /api/opd/queue` | token/queue queries |
| `:223` | `GET /api/finance/invoices` | invoice queries |

⇒ It is a **navigation/help assistant**, deterministic, with no model call. It is the natural host for the planned watchdog trigger (already global, already mounted outside every page).

⚠ Note: three of those calls (`/api/patients/search`, `/api/opd/queue` in one branch) suffer the **envelope-unwrap bug** identified in earlier reports (`res.data.length` on `{success,data}`), which is why some chat answers come back empty.

### 2.2 The purple **`Clinical AI` floating button** and the **right-side icon dock**

| Widget | Where | Endpoints | Status |
|---|---|---|---|
| `FloatingAIButton` (purple sparkle/FAB) | `DoctorDashboard.jsx:1168`, **`LabDashboard.jsx:551`** (the "Clinical AI" button on Laboratory), `WardDashboard.jsx:970` | `POST /api/ai/symptoms` (L48), `/api/ai/drug-check` (L70), `/api/ai/lab-analysis` (L98) | ✅ works (gemini-2.5-flash + catalog fallback) |
| `FloatingToolbar` (right-side dock on Doctor) | `DoctorDashboard.jsx` (import L26; rendered near L1000+) | items: `ai` → **"AI Assist"** (`onAIClick`), **"AI Chat Bot"**, SOAP Notes, Video, Calendar… | ✅ UI only; `onAIClick` opens the AI modal |

### 2.3 Doctor AI touchpoints

| Surface | Component | Endpoint(s) | Notes |
|---|---|---|---|
| **AI Clinical Assistant modal** ("AI Assistant (DDx & Interactions)") | `AIClinicalAssistant.jsx` (mounted in `DoctorDashboard.jsx:517-520`) | `POST /api/ai/diagnose` (L38), `POST /api/ai/prescribe` (L64) | ✅ DDx + Rx suggestions |
| **Drug interaction alert** | `DrugInteractionAlert.jsx:37` | `POST /api/ai/check-interactions` | ✅ |
| **"AI Magic Parse"** (prescription text → structured rows) | inline in `DoctorDashboard.jsx:112` | `POST /api/ai/parse-prescription` | ✅ but **regex only** (`server/services/aiService.js`), no Gemini |
| **SOAP / note drafting** | `SOAPNoteTemplate.jsx` (template, no AI) + `AINoteGenerator.jsx` | `POST /api/ai/generate-note` (AINoteGenerator L32) | ⚠ **AINoteGenerator is imported by nothing** → the "Smart Compose"-style drafting UI is orphaned |
| **Deep links** | sidebar `🧠 Enterprise AI` (`Sidebar.jsx:63`) | — | routes to the page below |

> **"Smart Compose"**: no component in `client/src` carries that literal name. The closest implemented features are `AINoteGenerator` (orphan, `/api/ai/generate-note`) and the `/api/ai/generate-soap` + `/scribe` endpoints (no live caller). Both need wiring in Stage 3.

### 2.4 Other dashboards

| Dashboard | Widget | Endpoint | Status |
|---|---|---|---|
| **Pharmacy** — `AI Forecast` tab | inline chart in `PharmacyDashboard.jsx` (`fetchForecast`) | `GET /api/pharmacy/forecast` → `getDemandForecast` (deterministic burn-rate math) | ✅ works, **not** an LLM (Gemini lives in `SmartInventory` → `/api/pharmacy/reports/smart-alerts`, which the UI never calls) |
| **Billing** — `Leakage Tracker` | `billing/BillingLeakageTracker.jsx` | `GET /api/lab/completed`, `GET /api/pharmacy/dispenses/unbilled`, `GET /api/clinical/tasks`, `POST /api/billing/add-item` | ⚠ deterministic diff engine; the unbilled endpoint silently returns `[]` (missing `charges.department` column) |
| **Billing** — AI Billing tab | `BillingOptimizer.jsx`, `ICD10Coder.jsx` | `BillingOptimizer`: `api.post('/ai-billing/…')` **← missing `/api` prefix ⇒ 404**; `ICD10Coder`: `/api/ai-billing/*` ✅ | ❌ / ✅ |
| **Admin** — Enterprise AI page | `pages/EnterpriseAIDashboard.jsx:5` `const API = '/api/ai'` then `GET ${API}/ops/beds`, `/ops/staff-workload`, `/ops/er-surge`, `/ops/scorecard` | handlers exist in `enterpriseAIRoutes` (**unmounted**) | ❌ 404 for all four cards |
| **Finance** — Revenue Cycle AI | `pages/RevenueCycleAI.jsx:12` | `POST /api/revenue-ai/appeals` (mounted, `bucketCActivationRoutes.js:977`) | ✅ |
| **Lab** — AI report parse | `LabDashboard.jsx:199` | `POST /api/lab/parse-result` (`gemini-1.5-flash`) | ❌ retired model |
| **Reception** — AI triage & ID OCR | `PatientRegistrationModal.jsx:256, 282` | `/api/ai/triage`, `/api/ai/extract-id` | ✅ / ⚠ OCR branch has no fallback |
| **Nurse/IPD** — care plan | `NursePatientProfile.jsx:225` | `POST /api/ai/care-plan` | ✅ |
| **Demo** | `pages/AIDemoPage.jsx:68,87,110` | `drug-check`, `symptoms`, `lab-analysis` | ✅ |
| **Static shell** | `pages/ClinicalAIAssistant.jsx` | **no API calls** | 💀 decorative page |
| **Orphans** | `AIAssistant.jsx`, `AINoteGenerator.jsx`, `AmbientListening.jsx` | — | 💀 imported by nothing |
| **Doctor↔patient chat** | `DoctorChatPanel.jsx` | `/api/chat/threads`, `/send`, `/read`, `/unread`, `/quick-replies` | ❌ `chatRoutes` **never mounted** ⇒ 404 |

## 3. REUSABLE INFRASTRUCTURE FOR THE AI WATCHDOG & ISSUE REPORTER

### 3.1 Client-side error handling that already exists

| Mechanism | File | What it does | Reusable? |
|---|---|---|---|
| `ErrorBoundary` (class, `componentDidCatch`) | `client/src/components/ErrorBoundary.jsx:5-16` | logs to `console.error` and renders a fallback UI | ✅ **hook point** — add a telemetry POST inside `componentDidCatch` |
| `WidgetErrorBoundary` | `components/WidgetErrorBoundary.jsx` | per-widget isolation, used in `admin/SpatialCalibrationStudio.jsx` and `security/dashboard/SecurityDashboardV2.jsx` | ✅ good pattern to wrap every dashboard widget |
| Global axios interceptor | `client/src/main.jsx:52-78` | 401 → /login; **500/503/ERR_NETWORK → /service-unavailable**; 403 → console.warn; also `window.onunhandledrejection` renders an error page | ✅ **single choke point** for capturing failed requests (URL, status, message) |
| `axiosInstance` retry layer | `client/src/utils/axiosInstance.js:30-70` | 3× exponential retry on 5xx/network | ✅ add per-request id + timing here |
| Bug/feedback widget | — | **none** | ❌ must be built |
| Client telemetry POST / Sentry | — | **none** (`grep Sentry|reportIssue|BugReport|FeedbackWidget` → 0) | ❌ must be built |

### 3.2 Server-side infrastructure

| Mechanism | File | What it records |
|---|---|---|
| `MetricsCollector` | `server/services/MetricsCollector.js` (class at L70, `normalizeRoute` L58) | in-process request/latency metrics (no DB table) |
| `auditMiddleware` | `server/middleware/auditMiddleware.js` (mounted on `/api/clinical`, `/api/lab`, `/api/appointments`, `/api/finance`, …) | `INSERT INTO audit_logs` (L105) with `user_id, action, entity_type, entity_id, details, ip_address, hospital_id, prev_hash, record_hash, resource_type, resource_id, is_phi, user_agent, metadata` |
| `errorHandler` | `server/middleware/errorHandler.js` | maps DB errors → HTTP 500 JSON (no persistence) |
| `supportRoutes` (**mounted**) | `server/routes/supportRoutes.js`; `app.use('/api/support', …)` at `server-cloud.js:406`, `server.js:748` | `GET/POST /api/support/tickets`, `GET /tickets/:id`, `POST /tickets/:id/message`, `PATCH /tickets/:id/status` → `support_tickets` + `ticket_messages` |
| `notification_logs` writer | notification service | outbound SMS/email/push audit |

⚠ **Security note for the reporter work:** `supportRoutes.js:244/266/282/306/328` declare `async (req,res)` **without any `protect`/`authorize` middleware** — `/api/support/tickets` is currently **unauthenticated**. Any watchdog/issue-reporter must add auth (and tenant scoping) rather than reuse the routes as-is.

### 3.3 Database tables already on `wolf_hms_prod` (from `prod-schema-snapshot.json`)

| Table | Columns | Fit for the watchdog |
|---|---|---|
| **`support_tickets`** | `id, ticket_number, user_id, category, priority, subject, description, status, remote_access_requested, remote_access_granted, remote_access_token, remote_access_expires, hospital_id, created_at, updated_at` (15) | ✅ **primary store for "report an issue"** — category/priority/subject/description + remote-access fields already modelled |
| **`ticket_messages`** | `id, ticket_id, user_id, message, is_internal, hospital_id, created_at` (7) | ✅ conversation thread (AI triage reply can be a message) |
| **`system_alerts`** | `id, title, message, severity, is_active, hospital_id, created_at` (7) | ✅ broadcast an active incident/dashboard outage |
| **`system_logs`** | `id, user_id, action, details, ip_address, timestamp` (6) | ✅ lightweight client-error sink (or add a dedicated `client_error_logs`) |
| **`audit_logs`** | `id, user_id, user_name, action, entity_type, entity_id, details, ip_address, hospital_id, created_at, prev_hash, record_hash, resource_type, resource_id, is_phi, user_agent, metadata, performed_by` (18) | ✅ hash-chained audit (server-side); `metadata` can hold request/DOM telemetry |
| **`ai_billing_predictions`** | `id, model_name, model_version, prediction_type, prediction_result, confidence_score, created_at` (7) | ✅ proof that AI outputs are already version-stamped — reuse this pattern for AI triage results |
| **`notification_logs`** | 17 cols (`channel, status, error_message, provider_response, delivered_at, …`) | ✅ delivery audit for alerting staff |
| **`notification_preferences`** | 17 cols (`enable_push/email/sms, quiet_start/quiet_end, …`) | ✅ respect quiet hours for watchdog alerts |
| **`system_settings`** | `id, key, value, description, hospital_id, created_at` (6) | ✅ feature flags (enable AI, watchdog on/off) |
| `clinical_alerts`, `lab_critical_alerts` | existing alert tables (used by `ClinicalService`, lab result engine) | ⚠ clinical alerts, **not** system/tech alerts — keep separate |

**No table exists for:** client-side error events, DOM snapshots, user actions/click trails, AI prompt/response logs, or AI triage runs. The reporter will need at least one new table (or a JSONB `metadata` column on `support_tickets` / `system_logs`).

## 4. GAP ANALYSIS & IMPLICATIONS FOR THE PLANNED UPGRADE

### P0 — must fix before or during Stage 3
| Gap | Evidence | Consequence for the upgrade |
|---|---|---|
| **Legacy SDK** `@google/generative-ai@0.24.1` | `server/package.json:19` | Must migrate to `@google/genai`; every `getGenerativeModel` call site changes |
| **Retired model `gemini-pro`** | `chatController.js:8` | Hard 404 if ever mounted; delete or migrate |
| **Retired model `gemini-1.5-flash`** | `labOCRController.js:33` → `POST /api/lab/parse-result` | The Lab "AI parse" button is live but **will fail**; needs `gemini-3.x` + JSON-regex fallback |
| **`/api/ai/*` POST routes are unauthenticated** | `aiRoutes.js` — only 3 GETs use `authenticateToken`; DoctorDashboard comment: *"No auth header needed on ai routes yet"* | Open LLM proxy = cost/abuse/PII risk; add `protect` + rate limiting before expanding |
| **20 enterprise endpoints never mounted** | `enterpriseAIRoutes.js` (0 references in `server-cloud.js`/`server.js`) | `EnterpriseAIDashboard` renders 4 empty cards (404s); the sidebar "Enterprise AI" link leads nowhere |
| **No bug-reporting pipeline** | no client widget, no telemetry POST, no error table | the Watchdog & One-Click Reporter must be built from scratch (server + client + schema) |

### P1 — consistency & correctness
| Gap | Evidence |
|---|---|
| 11 duplicated `getGenerativeModel` instantiations in one controller | `aiController.js` L129…L418 |
| 3 model strings across 8 files, no central registry | `gemini-2.5-flash` / `gemini-1.5-flash` / `gemini-pro` |
| Pseudo-AI presented as AI | `/api/ai/parse-prescription` is regex (`services/aiService.js`); Pharmacy "AI Forecast" and Billing "Leakage Tracker" are deterministic maths |
| Missing `/api` prefix | `BillingOptimizer.jsx:28-34` calls `/ai-billing/*` ⇒ 404 |
| Guardrails absent | no PHI redaction before prompts, no output validation, no clinical disclaimer, no confidence thresholds, no deterministic fallback for OCR / generate-* |
| Fallback inconsistency | catalog fallbacks in `aiController` (`fallback: true`) vs uncaught 500s in `ClinicalCoPilot`, `SmartInventory`, `aiBillingEngine` |
| Dead/orphan AI code | `chatController.js`, `chatRoutes.js`, `AIDataSteward.js`, `BloodBankAI.js`, `AIAssistant.jsx`, `AINoteGenerator.jsx`, `AmbientListening.jsx`, `ClinicalAIAssistant.jsx` |

### P2 — polish
| Gap | Evidence |
|---|---|
| Green bubble is not AI and has envelope-unwrap bugs | `ChatAssistant.jsx:188, 201-209` |
| No per-widget boundary on clinical dashboards | `WidgetErrorBoundary` used only in 2 security/admin components |
| `model_name`/`model_version` persisted only for billing AI | `ai_billing_predictions` (7 cols) — extend to every AI call |
| No AI usage/cost telemetry | no token/latency logging anywhere |

## 5. STAGE 2 — LIVE VPS CHECKLIST (Gemini 3.8 Flash)

> Read-only except the curl probes (they only read). Mask secrets when printing.

### 5.1 Environment & SDK on the VPS
```bash
cd /var/www/wolf-hms/server 2>/dev/null || cd ~/wolf-hms/server
grep -c '^GEMINI_API_KEY=' .env && echo "GEMINI_API_KEY present" || echo "GEMINI_API_KEY MISSING"
grep -o '^GEMINI_API_KEY=.\{0,6\}' .env                 # prefix only — never the full key
node -e "console.log(require('@google/generative-ai/package.json').version)"    # expect 0.24.x
node -e "try{require('@google/genai');console.log('genai PRESENT')}catch(e){console.log('genai ABSENT')}"
pm2 env 0 | grep -i gemini | sed 's/=.*/=<redacted>/'
```

### 5.2 Which models this key can actually call
```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
 | grep -o '"name": "models/[^"]*"' | sort | head -40
```
Expect `gemini-2.5-flash`; check that `gemini-pro` and `gemini-1.5-flash` are **absent** — that confirms both retired-model defects.

### 5.3 Live endpoint probes (current behaviour)
```bash
BASE=http://127.0.0.1:8080

# 1. chat (gemini-2.5-flash) — expect 200 with reply text
curl -s -X POST $BASE/api/ai/chat -H 'Content-Type: application/json' -d '{"message":"hello"}' | head -c 300

# 2. triage / symptoms (catalog fallback) — expect 200, look for "fallback": true
curl -s -X POST $BASE/api/ai/triage   -H 'Content-Type: application/json' -d '{"complaint":"fever and cough"}' | head -c 300
curl -s -X POST $BASE/api/ai/symptoms -H 'Content-Type: application/json' -d '{"symptoms":"chest pain"}' | head -c 300

# 3. prescription parse (regex, no LLM) — expect 200
curl -s -X POST $BASE/api/ai/parse-prescription -H 'Content-Type: application/json' \
  -d '{"text":"Paracetamol 500mg 1-0-1 for 7 days"}' | head -c 300

# 4. OCR (gemini-1.5-flash — suspect) — expect failure / regex fallback
curl -s -o /dev/null -w '%{http_code}\n' -X POST $BASE/api/lab/parse-result \
  -H "Authorization: Bearer $LAB_TOKEN" -F 'file=@/tmp/sample.pdf'

# 5. unmounted surfaces — expect 404
curl -s -o /dev/null -w 'enterprise /ops/beds: %{http_code}\n' $BASE/api/ai/ops/beds -H "Authorization: Bearer $ADMIN_TOKEN"
curl -s -o /dev/null -w 'chat threads: %{http_code}\n' "$BASE/api/chat/threads?doctor_id=1"

# 6. ai-billing prefix bug
curl -s -o /dev/null -w 'no-prefix /ai-billing: %{http_code}\n'   -X POST $BASE/ai-billing/predict-denial    -H 'Content-Type: application/json' -d '{}'
curl -s -o /dev/null -w 'correct /api/ai-billing: %{http_code}\n' -X POST $BASE/api/ai-billing/predict-denial -H 'Content-Type: application/json' -d '{}'

# 7. support API currently unauthenticated (security check — read only)
curl -s -o /dev/null -w 'support tickets without token: %{http_code}\n' $BASE/api/support/tickets
```
```bash
pm2 logs wolf-hms-api --lines 300 --nostream | grep -iE 'gemini|generative|404.*models|API key|quota' | tail -20
```

### 5.4 Database reality check for the watchdog
```sql
SELECT count(*) FROM support_tickets;
SELECT id, ticket_number, category, priority, status, created_at FROM support_tickets ORDER BY id DESC LIMIT 5;
SELECT count(*) FROM ticket_messages;
SELECT count(*) FROM system_alerts WHERE is_active = TRUE;
SELECT count(*) FROM ai_billing_predictions;
SELECT model_name, model_version, prediction_type, confidence_score, created_at
  FROM ai_billing_predictions ORDER BY id DESC LIMIT 5;
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'support_tickets' ORDER BY ordinal_position;    -- confirm the 15 columns
```

### 5.5 Acceptance criteria for Stage 3
1. Zero occurrences of `@google/generative-ai`, `gemini-pro`, `gemini-1.5-flash`; one model registry (`gemini-3.8-flash` heavy / `gemini-3.5-flash-lite` light).
2. Every AI route is `protect`-ed, rate-limited, tenant-scoped, with a deterministic fallback and a user-visible "AI unavailable" state.
3. `enterpriseAIRoutes` mounted (or deleted) so `EnterpriseAIDashboard` shows real data; `chatRoutes` mounted or removed.
4. A global **Report an Issue** trigger in `DashboardLayout` captures route, user/role, last N failed requests (status/URL/body shape), console errors and a DOM snippet, and POSTs them to an **authenticated** `/api/support/tickets` (+ a telemetry table or `system_logs`).
5. AI triage of the ticket writes a `ticket_messages` row and stores model/version/confidence in the same version-stamped pattern as `ai_billing_predictions`.

---

## APPENDIX — Evidence index

| Claim | Evidence |
|---|---|
| SDK | `server/package.json:19`; no AI dep in `client/package.json` |
| `gemini-2.5-flash` (11×) | `server/controllers/aiController.js:129,154,191,251,282,315,332,347,365,384,418` |
| `gemini-pro` | `server/controllers/chatController.js:8` |
| `gemini-1.5-flash` | `server/controllers/labOCRController.js:33` |
| AI routers mounted | `server-cloud.js:333` (`/api/ai`), `:400` (`/api/ai-billing`), `:406` (`/api/support`) |
| Enterprise routes unmounted | `server/routes/enterpriseAIRoutes.js` (no require in `server-cloud.js`/`server.js`) |
| Chat routes unmounted | `server/routes/chatRoutes.js`; no `/api/chat` mount |
| Global chat bubble | `client/src/components/DashboardLayout.jsx:17,68`; `ChatAssistant.jsx:157-223` |
| Floating AI button | `FloatingAIButton.jsx:48,70,98`; used at `DoctorDashboard.jsx:1168`, `LabDashboard.jsx:551`, `WardDashboard.jsx:970` |
| Doctor AI modal | `DoctorDashboard.jsx:517-520` → `AIClinicalAssistant.jsx:38,64` |
| AI dock | `FloatingToolbar.jsx:13,29-39` |
| Regex "AI" parser | `server/routes/aiRoutes.js:8-26`; `server/services/aiService.js` |
| Billing prefix bug | `BillingOptimizer.jsx:28-34` |
| Error boundary | `client/src/components/ErrorBoundary.jsx:5-16`; `WidgetErrorBoundary.jsx` |
| Global interceptor | `client/src/main.jsx:52-78`; `utils/axiosInstance.js:30-70` |
| Audit logging | `server/middleware/auditMiddleware.js:105` |
| Support API (no auth) | `server/routes/supportRoutes.js:244,266,282,306,328` |
| DB tables | `plans/prod-schema-snapshot.json` — `support_tickets` (15), `ticket_messages` (7), `system_alerts` (7), `system_logs` (6), `audit_logs` (18), `ai_billing_predictions` (7), `notification_logs` (17), `notification_preferences` (17), `system_settings` (6) |

**Limitations:** static analysis only; no DB access, no runtime probes, no files modified. §5.2–§5.3 must be executed on the VPS because model availability depends on the key's project, not on the repository.

---

### Bottom line

1. **One legacy SDK, three model generations, 20 dead endpoints.** Everything clinical runs on `gemini-2.5-flash` through `@google/generative-ai`; two files still name retired models (`gemini-pro` in dead code, `gemini-1.5-flash` on the **live** Lab OCR route); the entire `enterpriseAIRoutes` surface (revenue/supply/clinical/ops) is unreachable.
2. **The green bubble is not AI**, the purple Lab button and the Doctor AI modal are, and three AI React components (`AIAssistant`, `AINoteGenerator`, `AmbientListening`) are orphans — the upgrade has more wiring work than modelling work.
3. **The watchdog has a strong head start:** `ErrorBoundary`, a global axios choke point, `MetricsCollector`, hash-chained `audit_logs`, and a **mounted** support-ticket API backed by `support_tickets` + `ticket_messages` (with remote-access fields). Missing: the client reporter widget, an authenticated telemetry endpoint, a client-error store, and the AI triage step.
4. **Before adding AI surface, close the open door:** every `POST /api/ai/*` route is currently unauthenticated, and `/api/support/tickets` is unauthenticated too — both must be `protect`-ed and rate-limited in the same release.






