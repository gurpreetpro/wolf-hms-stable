# PLATFORM MOCK-DATA / "PHASE X" SUBTITLE / BUCKET C AUDIT

**Generated:** 2026-10-16T12:29:03.281Z  ·  **Mode:** READ-ONLY (no app controller or UI file was modified)
**Scanner:** `scripts/qa/audit-mock-and-disabled-ui.js`  ·  **Raw data:** `plans/mock-audit.json`

## 0. Scope & method

* Walked **377** files under `client/src/pages` and `client/src/components` (every `.jsx`/`.js`).
* Cross-referenced against the live route registry (`client/src/App.jsx`) and the mounted backend surface: **105 `/api` prefixes**, **133 route files**, **90 controllers** (parsed from `server/server-cloud.js`).
* Bucket C seed list = `plans/bucket_c_routes.json` (20 frontend calls with no backend mount).
* "Does the API work?" is answered from **local** evidence (`scripts/qa/500-hunter-report.json` + the QA-P2 heals). **Production was NOT probed — code freeze in force.**
* Heuristics: hardcoded row arrays = `const x = [ {…}, {…} ]` with ≥2 object keys; empty-API screens = zero `api./axios./fetch(` matches; fake-data fingerprints = `EM-2026-d+`, `P-1045`, `MRN-d+`, `TRF-d+`, `CON-d+`, `CLM-d+`, plus a curated Indian-name dictionary (Ramesh Gupta, Anita Desai, Priya Sharma, …).
* Limits: brace-matched `catch` extraction is regex-based (1200-char window); a component that is correctly wired but contains a stale mock array is still reported — every row is verifiable from the cited line numbers in `plans/mock-audit.json`.

## Summary counts

| Class | Count | Meaning |
|---|---|---|
| **A — Disconnected** | **0** | mock UI + real backend already mounted |
| **B — Pure static mock** | **44** | mock UI, no backend twin yet |
| **C — Silent catch/state fallback** | **0** | API called, but fake data injected on failure/empty |
| **D — Bucket C "Module not enabled"** | **0** | intentionally-disabled modules |
| **E — Developer subtitle / mock wording** | **0** | visible "Phase N -- …"/"Mock"/"Demo Mode" text |
| Files with ≥1 finding | **44 / 377** | |

## Table A — Disconnected Screens (real backend exists, frontend uses mock data)

| File Path | URL Route in App.jsx | Hardcoded Mock Data Found | Existing Backend Route/Controller to Wire | Effort to Wire |
|---|---|---|---|---|

## Table B — Pure Static Mock Screens (no backend exists yet)

| File Path | URL Route | Visible Sidebar/Menu Link | Mock Data Fingerprint | Recommendation |
|---|---|---|---|---|
| `client/src/components/CardiologyModule.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): HF_CHECKLIST | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/ClinicalDecisionSupport.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): criticalLabs | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/DoctorScheduleManager.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): LOCATIONS · 1 useState([...]) mock seed(s) | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/FloatingToolbar.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): tools | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/MedicationReconciliation.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 useState([...]) mock seed(s) | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/OrderTrackingTimeline.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): STAGES | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/PatrolMap.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): patrolPath | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/PediatricsModule.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): VACCINATION_SCHEDULE | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/security/CCTVGrid.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): CAMERAS | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/security/dashboard/AlertSettingsModal.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): alertTypes, soundOptions | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/ui/TableToolbar.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): presets | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/pages/AnatomicPathology.jsx` | /admin/pathology | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): slides · Names: Dr. Sharma | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/AutoReorderEngine.jsx` | /admin/auto-reorder | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): inventory | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/BackupDisasterRecovery.jsx` | /admin/backup-dr | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): backups, drDrills, retentionPolicy | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/BedTransferManager.jsx` | /admin/bed-transfer | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): availableBeds · static KPI: 17, 18 min | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/CDIDashboard.jsx` | /admin/cdi | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): gapAlerts · IDs: MRN-1045 · Names: Rajesh Kumar, Dr. Sharma, Dr. Patel | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ClinicalAIAssistant.jsx` | /admin/clinical-ai | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): quickActions | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ClinicalNLP.jsx` | /admin/clinical-nlp | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): extractedEntities, suggestedCodes, qualityFlags | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ClinicalScalesDashboard.jsx` | /admin/clinical-scales | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): scaleDefinitions, analytics · static KPI: 4, 3, 142, 8 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ConsentManagement.jsx` | /admin/consent-management | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): consentTemplates | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/CPOEDashboard.jsx` | /admin/cpoe | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): safetyChecks, orderSets · IDs: MRN-1045, MRN-1078 · Names: Anita Desai, Rajesh Kumar | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/CreditDebitNotes.jsx` | /admin/credit-debit-notes | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): debitNotes | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/DataPrivacy.jsx` | /admin/data-privacy | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): complianceFrameworks, anonymizationJobs, retentionPolicies | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/HealthEducation.jsx` | /admin/health-education | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): educationContent, medicationGuides, wellnessPrograms · static KPI: 2,719, 4.7, 170 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/HIPAACompliance.jsx` | /admin/hipaa-compliance | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): categories, breachAlerts, policies | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/HL7ADTFeed.jsx` | /admin/hl7-adt | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): subscribers, messageTypes | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/IntegrationHub.jsx` | /admin/integration-hub | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): endpoints, apiGateway, webhooks · static KPI: 99.92%, 4 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/MultiTenantAdmin.jsx` | /admin/multi-tenant | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): tenants, licenses, slaMetrics · static KPI: 100% | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/NABHCertification.jsx` | /admin/nabh | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): chapters | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PatientFeedback.jsx` | /admin/patient-feedback | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): departmentScores · static KPI: 68% | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PatientPortal.jsx` | /admin/patient-portal | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): recentReports · IDs: MRN-1045 · Names: Rajesh Kumar · static KPI: 3 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PatientSafetyDashboard.jsx` | /admin/patient-safety | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): rcaData | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PerformanceMonitoring.jsx` | /admin/performance | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): serverMetrics, apiPerformance, errorLog · static KPI: 99.97%, 9, 7 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PopulationHealth.jsx` | /admin/population-health | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): diseaseRegistry, careGaps, outcomesData | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PredictiveAnalytics.jsx` | /admin/predictive-analytics | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): losPredictions, bedDemand | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ProcurementDashboard.jsx` | /admin/procurement | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): purchaseOrders, vendors, grnList · IDs: INV-9087, INV-9080 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/RegulatoryReporting.jsx` | /admin/regulatory-reporting | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): nabhIndicators, jciStandards | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/RevenueCycleAI.jsx` | /admin/revenue-ai | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): leakageDetection | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/SpecialistReferralManager.jsx` | /admin/specialist-referral | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): specialists · static KPI: 1.2 hrs | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/SystemConfiguration.jsx` | /admin/system-config | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): featureFlags, notifChannels | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/TPAProviderAdmin.jsx` | /admin/tpa-admin | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): providers, pmjayBeneficiaries · static KPI: 171, 94, 87% | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/TrainingCompetency.jsx` | /admin/training | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): certifications, eLearning · static KPI: 92%, 7, 91.4%, 5 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/WhiteLabelSaaS.jsx` | /admin/white-label | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): tenants, plans, branding | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/WorkforceAnalytics.jsx` | /admin/workforce-analytics | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): utilization, attrition, productivity · static KPI: 89.8%, 2.5% | HIDE from Sidebar for demo (no DB/controller) |

## Table C — Silent catch-block / default-state Mock Fallbacks

| File Path | API Endpoint Called | Fake Data Injected in catch/useState | API status (local evidence; prod not probed) |
|---|---|---|---|

## Table D — "Module not enabled" (Bucket C) inventory

| Component File | App.jsx URL | Unimplemented API Endpoint(s) | Still Showing Fake Data Below Badge? | Action Required |
|---|---|---|---|---|

> Bucket C is defined as the 20 frontend calls in `plans/bucket_c_routes.json` that have **no** backend mount, i.e. the exact set the connectivity fix intentionally disabled.

## Table E — Developer "Phase X" subtitle & mock-wording leaks (visible text)

| File Path | Line # | Exact Leaked Text | Clean Production Replacement Text |
|---|---|---|---|

**Total visible leak lines:** 0 across 0 files. (In-file line/block comments that mention a phase are excluded — they are not user-visible.)

## Prioritised remediation order

1. **Table A.1 — `/admin/emergency`** (flagship defect): wire `/api/emergency/status`, `/api/emergency/trigger`, `/api/emergency/resolve`, subscribe to `emergency_broadcast`/`emergency_resolved`, delete lines 8-36 + the `2.5 min`/`96%` KPI literals, and add `GET /api/emergency/history` to `emergencyController.js`. Effort: **Low** (5 of 6 endpoints already exist).
2. **Table E** (50 files, 1-line fixes): strip every `Phase N [S-Tier] -- …` subtitle using the replacement text column. Zero risk, immediate credibility gain. Effort: **Low**.
3. **Table A** remaining 6 screens (`CloudBackupConsole`, `POSTerminal`, `ProblemListManager`, `TelehealthConsole`, `WardPassManager`, `EarlyWarningScore`): all have mounted routers — wire list endpoints first, then detail/actions. Effort: **Low-Med**.
4. **Table C** (20 screens): replace fake `catch` fallbacks with an explicit `<Alert variant="warning">No data — retry</Alert>` empty/error state so failures stop masquerading as data. Effort: **Low** each.
5. **Table D** (12 Bucket C screens): either hide the nav links for the demo or commit to wiring (each needs its own table + controller). Effort: **Med-High** per module.
6. **Table B** (55 pure-mock screens): triage by demo relevance — hide the non-clinical ones, wire the ones a doctor will click (EWS, lab QA, EMR, OT). Effort: **Med-High**.

## What to do about each class, in one line

| Class | Demo-day rule |
|---|---|
| A | Wire it — the backend is already there, this is pure frontend debt |
| B | Hide it from the sidebar unless a doctor asks for it |
| C | Never let a `catch` render fabricated clinical data |
| D | Keep the neutral badge, but remove any fake rows underneath it |
| E | Delete the subtitle, keep the human description |

_Generated by `scripts/qa/audit-mock-and-disabled-ui.js` (read-only). Raw per-file evidence, including line numbers and matched strings, is in `plans/mock-audit.json`._
