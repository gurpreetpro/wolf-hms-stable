## ✅ Completed & Verified
### STAGE 3 (SURGICAL ZERO-UI-TOUCH): HEAL DOCTOR FOLLOW-UP (403), ITEMIZED OPD BILLING (CBC + PARACETAMOL QTY) & INVOICE #4 DISPLAY (2026-10-20, Production VPS 185.213.27.158)
- [x] **Zero-UI Touch Compliance:** Preserved `client/dist` and production bundle `index-CmiIAuQj.js` 100% untouched.
- [x] **Guardrail Preserved:** Zero touch on 17 uncommitted Phase-7/WGM files.
- [x] **Defect 1 Eliminated (Doctor Follow-Up Scheduling 403 Unblocked):**
  - Updated `server/routes/appointmentRoutes.js:26` to authorize `'doctor'` on `POST /api/appointments`.
  - Updated `server/controllers/appointmentController.js:createAppointment` to resolve doctor defaults (`doctor_id`, `department`, `appointment_time`, `appointment_type`) and skip consultation fee invoicing for follow-ups.
  - Relaxed `server/middleware/validation.js:appointmentSchema` to accept doctor appointment payloads.
  - Live probe confirmed: `POST /api/appointments` by `doctor_user` returns **HTTP 201 Created** (no more 403!).
- [x] **Defect 2A Eliminated (Invoice #4 Hidden Items & UHID Display):**
  - Updated `server/services/billingService.js:addToInvoice` to insert `hospital_id` into `invoice_items`.
  - Updated `server/controllers/financeController.js:getInvoices` to map `COALESCE(NULLIF(p.uhid, ''), NULLIF(i.patient_number, ''), p.phone) AS patient_number`, displaying `Patient ID: KOKILA-0003/2026` instead of phone number `9999988888`.
  - Updated `server/controllers/financeController.js:getInvoiceItems` to allow `hospital_id IS NULL` for backward compatibility, eliminating generic fallback `"Hospital Charges (Legacy Invoice - Details Not Available)"`.
- [x] **Defect 2B Eliminated (Prescription Quantity & Lab Orders Auto-Billing):**
  - Updated `server/controllers/clinicalController.js:saveConsultation` to include duration in `care_tasks.description` and auto-invoice ordered lab tests via `addToInvoice`.
  - Updated `server/controllers/pharmacyController.js:processPrescription` to calculate dispense quantity dynamically (`freq` × `duration` days: `BD/BID = 2`, `TDS/TID = 3`, `QID = 4`, `OD = 1`; e.g., `2 * 7 = 14`), replacing hardcoded `qtyToDispense = 1`.
- [x] **Migration 317 Applied:**
  - `server/migrations/317_followup_and_billing_itemization_heal.sql` aligned columns on `pending_charges` and `invoice_items`, backfilled `hospital_id = 1` on legacy null items, healed Patient 3's `Invoice #4` to ₹378.00 (Rx 14 qty @ ₹2 = ₹28 + CBC 1 qty @ ₹350 = ₹350), and backfilled `patient_number` with UHID.
- [x] **Quality Gates & VPS Deployment:**
  - `node --check` passed across all 7 modified backend files.
  - 193 Jest unit & contract tests passing.
  - Committed and pushed to `origin/main` (`d9cca33`).
  - SFTP uploaded to `/var/www/wolf-hms/server/` on `185.213.27.158` and PM2 restarted cleanly.
- [x] **Live Probes & Verification on `185.213.27.158`:**
  - Probe 1: Doctor appointment scheduling -> **HTTP 201 Created**.
  - Probe 2: Invoice #4 header -> **HTTP 200 OK**, `total_amount: "378.00"`, `patient_number: "KOKILA-0003/2026"`.
  - Probe 3: Invoice #4 line items -> **HTTP 200 OK**, 2 itemized rows (Paracetamol 14 qty @ ₹2.00, CBC 1 qty @ ₹350.00).

### STAGE 3 (SURGICAL ZERO-UI-TOUCH): UNBLOCK RECEPTION VITALS GATE, FIX UTC+2 TIMEZONE SHIFT & REMOVE SYNTHETIC VITALS (2026-10-20, Production VPS 185.213.27.158)
- [x] **Zero-UI Touch Compliance:** Preserved `client/dist` and production bundle `index-CmiIAuQj.js` 100% untouched.
- [x] **Guardrail Preserved:** Zero touch on 17 uncommitted Phase-7/WGM files.
- [x] **Patient 1 & Patient 2 Preserved:** Both patients active and waiting in OPD queue.
- [x] **Defect T1 Eliminated (Reception Vitals Gate Unblocked):**
  - Updated `opdController.js:registerOPD` to return BOTH data envelope AND top-level `patient`, `visit`, `token`, `payment` (`return res.status(201).json({ success: true, message: '...', data: payloadData, ...payloadData })`).
  - Compiled bundle `PatientRegistrationModal.jsx:383` (`res.data.patient?.id`), `L386`, and `L398` now resolve successfully on newly registered patients.
  - Hardened `validators/clinical.js` with Celsius-to-Fahrenheit preprocessing (<45 converts to °F) to prevent 400 validation rejection.
- [x] **Defect T2 Eliminated (UTC+2 Timezone Shift):**
  - Added `process.env.TZ = 'UTC'` and `pg.types.setTypeParser(1114, str => str ? new Date(str.replace(' ', 'T') + 'Z') : null)` at entry in `server-cloud.js`.
  - Configured `TZ=UTC` in `/var/www/wolf-hms/server/.env` and restarted PM2 with `TZ=UTC NODE_ENV=production pm2 restart wolf-hms-api --update-env`.
  - Live probe confirmed: `Patient 1` `created_at = 2026-10-18T12:50:39.314Z` and `Patient 2` `created_at = 2026-10-20T03:51:01.038Z` (0h offset, exact PostgreSQL wall-clock match).
- [x] **Synthetic Vitals Row Cleaned Up:**
  - Deleted synthetic vitals row `a9edcf9f-c069-4059-ad78-b8104c2c81a3` from both `vitals_logs` and `vitals` twin table.
  - Verified `GET /api/clinical/vitals/d8bf268a-ce7a-405d-bf00-57c2bee78841` returns 0 rows (`[]`).
- [x] **Quality Gates & VPS Deployment:**
  - `node --check` passed across all modified server files.
  - 193 Jest unit & contract tests passing.
  - Committed and pushed to `origin/main` (`b9aebba`).
  - SFTP uploaded to `/var/www/wolf-hms/server/` on `185.213.27.158` and PM2 restarted cleanly.

### STAGE 3 (SURGICAL ZERO-UI-TOUCH): RAW ARRAY ENVELOPE HEAL FOR DOCTOR VITALS, HISTORY, LAB CRITICAL ALERTS & PATIENT SEARCH (2026-10-20, Production VPS 185.213.27.158)
- [x] **Zero-UI Touch Compliance:** Preserved `client/dist` and production bundle `index-CmiIAuQj.js` 100% untouched.
- [x] **Guardrail Preserved:** Zero touch on 17 uncommitted Phase-7/WGM files.
- [x] **Patient 1 Preserved:** `Patient 1` (`visit_id = 1`, `token_number = 1`, status `Waiting`) in `opd_visits` completely untouched and active in queue.
- [x] **Doctor Vitals & History Healed (`clinicalController.js`):**
  - Updated `getVitalsByPatient` to return raw Array via `return res.status(200).json(result.rows);`.
  - Updated `getPatientHistory` to return raw Array via `return res.status(200).json(result.rows);`.
  - `DoctorDashboard.jsx` (L242, L261 in compiled bundle `index-CmiIAuQj.js`) directly reads `res.data.length > 0` and `res.data[0]`, rendering vitals (`120/80`, `76 bpm`, `98.6°F`, `98% SpO2`) immediately with zero UI rebuild.
- [x] **Lab Critical Alerts & Patient Search Healed (`labController.js` & `patientController.js`):**
  - Updated `getPendingCriticalAlerts` to return raw Array, preventing `alerts.map is not a function` in `CriticalAlertWidget.jsx:91`.
  - Updated `searchPatients` to return raw Array, enabling dropdown results in `OPDReception.jsx`, `AdvancePaymentModal.jsx`, `NewInvoiceModal.jsx`, and `RecoveryConsole.jsx`.
- [x] **Quality Gates & VPS Deployment:**
  - `node --check` passed on all 3 modified controllers.
  - 193 Jest unit & contract tests passing.
  - Committed and pushed to `origin/main` (`e4931cf`).
  - SFTP uploaded to `/var/www/wolf-hms/server/controllers/` on `185.213.27.158` and restarted PM2 `wolf-hms-api`.
- [x] **Live Probes & Verification on `185.213.27.158`:**
  - `GET /api/clinical/vitals/d8bf268a-ce7a-405d-bf00-57c2bee78841` -> **200 OK**, `Array.isArray(body) === true`, `bp: 120/80`, `heart_rate: 76`, `temp: 98.6`, `spo2: 98`.
  - `GET /api/clinical/history/d8bf268a-ce7a-405d-bf00-57c2bee78841` -> **200 OK**, `Array.isArray(body) === true`.
  - `GET /api/lab/critical-alerts/pending` -> **200 OK**, `Array.isArray(body) === true`.
  - `GET /api/patients/search?q=Patient` -> **200 OK**, `Array.isArray(body) === true` (returns `Patient 1`).

### STAGE 3 (SURGICAL ZERO-UI-TOUCH): HEAL RECEPTION VITALS WRITE & OPD QUEUE WAITING TIME (2026-10-19, Production VPS 185.213.27.158)
- [x] **Zero-UI Touch Compliance:** Preserved `client/dist` and production bundle `index-CmiIAuQj.js` 100% untouched. Updated `PatientQueueCard.jsx` in source tree only.
- [x] **Guardrail Preserved:** Zero touch on 17 uncommitted Phase-7/WGM files.
- [x] **Patient 1 Preserved:** `Patient 1` (`visit_id = 1`, `token_number = 1`, status `Waiting`) in `opd_visits` completely untouched and active in queue.
- [x] **Defect A Healed (`ClinicalService.logVitals`):**
  - Rewrote `logVitals` in `server/services/clinicalService.js` using raw `pool.query` instead of Prisma.
  - Automatically handles `gen_random_uuid()` on prod and sequence on local.
  - Safely extracts and writes `bp_systolic`, `bp_diastolic`, `pulse`, `temperature`, `spo2` (as integer on prod, string on local).
  - Dual-writes to `vitals` twin table and generates `clinical_alerts`.
  - Hardened `validators/clinical.js` so empty strings `""` are converted to `null`, preventing 400 rejection on partial triage.
- [x] **Defect B Healed (`opdController.js` & `PatientQueueCard.jsx`):**
  - Mapped `v.created_at AS visit_date` in `getQueue`, so existing compiled bundle evaluates true check-in timestamp with real time-of-day.
  - Extended queue filter to `WHERE (v.visit_date = CURRENT_DATE OR v.status = 'Waiting')`, keeping active patients visible across date roll-overs.
  - Updated `PatientQueueCard.jsx:13` to prefer `patient.created_at || patient.visit_date`.
- [x] **Live Probes & Verification on `185.213.27.158`:**
  - `POST /api/clinical/vitals` -> **201 Created** (row persisted with UUID).
  - `GET /api/clinical/vitals/d8bf268a-ce7a-405d-bf00-57c2bee78841` -> **200 OK** returning BP `120/80`, Heart Rate `76`, Temp `98.6`, SpO2 `98` (no more `N/A`!).
  - `GET /api/opd/queue` -> **200 OK** (Patient 1 active, waiting time calculated from check-in time).
  - PM2 `wolf-hms-api` online and healthy.
  - 193 Jest unit & contract tests passing.

### STAGE 3 (ZERO-UI-TOUCH): HEAL vitals_logs.admission_id & HARDEN clinicalController.js (2026-10-18, Production VPS 185.213.27.158)
- [x] **Zero-UI Touch Compliance:** Preserved `client/` and production bundle `index-CmiIAuQj.js` 100% untouched.
- [x] **Guardrail Preserved:** Zero touch on 17 uncommitted Phase-7/WGM files.
- [x] **Patient 1 Preserved:** `Patient 1` (`visit_id = 1`, `token_number = 1`, status `Waiting`) in `opd_visits` completely untouched and active.
- [x] **Migration 315 Authored & Deployed (`server/migrations/315_doctor_opd_vitals_and_clinical_heal.sql`):**
  - Dynamically resolved `admissions.id` data type and added `vitals_logs.admission_id UUID` on `wolf_hms_prod` (and `INTEGER` locally).
  - Created indexes `idx_vitals_logs_admission_id` and `idx_vitals_logs_patient_id`.
  - Backfilled `vitals_logs.admission_id` from active `admissions`.
- [x] **Surgical Controller Hardening in `clinicalController.js`:**
  - `getVitalsByPatient`: Cast IDs to text (`patient_id::text = $1 OR admission_id::text IN (...)`).
  - `saveConsultation`: Multi-source tenant resolver `req.hospital_id || req.hospitalId || req.user?.hospital_id || 1`, added `hospital_id` to `care_tasks`, and tenant-matching on prescriptions/labs.
  - `getTasks`, `getSOAPNotes`, `getRoundNotes`: Immediate `ResponseHandler.success(res, [])` guard for undefined/null `admission_id` preventing PostgreSQL 22P02 crashes.
- [x] **Live Probes & Verification on `185.213.27.158`:**
  - `GET /api/clinical/vitals/d8bf268a-ce7a-405d-bf00-57c2bee78841` -> **200 OK** (resolved 500!).
  - `GET /api/clinical/history/d8bf268a-ce7a-405d-bf00-57c2bee78841` -> **200 OK**.
  - `GET /api/clinical/tasks?admission_id=undefined` -> **200 OK `[]`**.
  - `GET /api/clinical/soap-notes/undefined` -> **200 OK `[]`**.
  - `GET /api/opd/queue` -> **200 OK** (Patient 1 present and waiting in queue).
  - PM2 `wolf-hms-api` online and healthy.

### ZERO-UI-TOUCH MASTER DATABASE & BACKEND HEAL (2026-10-18, Production VPS 185.213.27.158)
- [x] **Zero-UI Touch Compliance:** Preserved `client/` and production bundle `index-CmiIAuQj.js` 100% untouched.
- [x] **Guardrail Preserved:** Zero touch on 17 uncommitted Phase-7/WGM files.
- [x] **Migration 314 Authored & Deployed (`server/migrations/314_prod_master_schema_and_uuid_heal.sql`):**
  - Widened all 36 foreign key candidate columns from `INTEGER` to `UUID` dynamically on `wolf_hms_prod`.
  - Created 81 missing clinical and operational tables (`patient_consumables`, `patient_service_charges`, `shift_handoff_notes`, `fall_risk_assessments`, `wound_assessments`, `patient_care_plans`, `soap_notes`, `round_notes`, `clinical_alerts`, `lab_orders`, `lab_results`, etc.).
  - Added missing columns and fixed NOT NULL defaults across `nursing_care_plans`, `pain_scores`, `fluid_balance`, `iv_lines`, `care_tasks`, `admissions`, `patient_vitals`, `ward_consumables`, `vitals`.
  - Seeded baseline `ward_consumables`, `ward_service_charges`, and active `vitals` + `vitals_logs` for admitted patients.
- [x] **7 Surgical Controller Fixes:**
  - `nurseController.js`: Multi-source vitals fallback for NEWS2; consumable write with `used_by` & `recorded_by`; non-fatal billing try-catch; coalesce join.
  - `wardController.js` & `admissionController.js`: Imported `calculateNEWS2` and attached live numeric `news2Score`, `news2Risk`, `news2Color` to `getBeds` and `getAdmittedPatients`.
  - Removed 22 `parseInt(admission_id / patient_id)` coercion traps across `chargesController.js`, `enterpriseAIController.js`, `financeController.js`, `billingInterceptorRoutes.js`, and `FinanceService.js`.
- [x] **Verification & Live Probes on `185.213.27.158`:**
  - `node --check` passed on all modified server files.
  - Local Jest test suite: **193 passed, 0 failed** (3 skipped).
  - Live probe `POST /api/nurse/consumables` -> **201 Created** (`Syringe 5ml` recorded for Sneha Bhat).
  - Live probe `GET /api/nurse/consumables/:admissionId` -> **200 OK** (recorded item returned with `recorded_by_name`).
  - Live probes `POST /api/nurse/care-plan`, `/pain`, `/fluid-balance`, `/iv-line`, `/services` -> **201 Created**.
  - Smart Ward BedCard NEWS2 -> returns numeric `news2Score: 0`, `news2Risk: 'LOW'`, `news2Color: 'success'` (no more `? - Unknown`).
  - System-wide X-Ray audit re-scan: Smart Ward tab failures dropped to **0/13 FAIL (100% PASS)**!

### GALAXY WAVES 1, 2 & 2B DEPLOYMENT (2026-10-17, Production VPS 185.213.27.158)
- [x] **GitHub Push:** Pushed f41b95..b711204 to origin/main (Waves 1, 2, 2B UI wiring, mutations, E2E tests).
- [x] **Delta Pack & Assets:** Deployed bundle index-CmiIAuQj.js and synced to client/dist/.
- [x] **Schema & Types Alignment:** Converted icu_ventilator_logs.admission_id and icu_fluid_io_charting.admission_id to UUID; pre-created Wave 2 tables with UUID dmission_id.
- [x] **Migrations 312 & 313:** Applied both migrations on wolf_hms_prod with zero errors.
- [x] **ICU & Clinical Department Verifications:** Verified live API responses for /api/icu/ventilator-logs/:id, /api/icu/fluid-io/:id, /api/bed-transfers, /api/pathology/specimens, /api/cpoe/orders, /api/cdi/queries, /api/blood-bank/requests, /api/cloud-backup/runs, /api/quality/metrics (100% compliance).

### BUCKET-C BASELINES & DEMOCK ROLLOUT (2026-10-16, Production VPS 185.213.27.158)
- [x] **Delta Deploy & Migration 311:** Deployed de-mocked bundle (`index-BGhCy1Hu.js`, `FloorPlanManager-880h6Q5q.js`), applied Migration 311 creating Bucket-C tables, restarted PM2 (`wolf-hms-api` online).
- [x] **Bucket-C / Table-A Baseline Seeding:** Populated baseline rows on `wolf_hms_prod` (`hospital_id = 1`):
  `quality_metrics` (8), `quality_checklists` (5), `ambulance_vehicles` (3), `laundry_orders` (4), `biomedical_waste_logs` (5), `hospital_assets` (6), `hospital_communications` (3), `prior_auth_requests` (2), `staff_shifts` (4), `staff_rosters` (5), `clinical_order_sets` (3), `clinical_pathways` (2), `pos_providers` (3), `pos_devices` (3).
- [x] **Emergency Logs Resolution:** Resolved active alerts so `/admin/emergency` has 0 active emergencies.
- [x] **Endpoint Verification:** `GET /api/quality/metrics` (`total = 8`), `GET /api/ambulance/vehicles` (`total = 3`), `GET /api/emergency/status` (`data = null`).
- [x] **Scratch Purge:** Removed all deployment temporary files and SSH scripts from local workspace.

### PRE-DEMO QA FUNNEL — Phases 0–5 (2026-10-15, local only, prod untouched)
- [x] **P0 Recon:** route matrix re-verified (517 matched / 20 broken); `plans/bucket_ab_routes.json`
      (1 113 routes), `plans/bucket_c_routes.json` (20), `plans/bucket_b_500s.md`,
      `plans/local_schema_dump.txt`, `plans/admin_cli_smoke.log`
- [x] **P1 Golden snapshot:** `demo:seed` (15 patients, 5 cohorts, 15/15 checks, 0.3 s) →
      `demo:backup` (pg_dump -Fc, 1.5 MB) → `demo:restore` (pg_restore atomic, 15/15 in 3.0 s)
- [x] **P2 500-Hunter:** authenticated sweep with real seeded ids, UUID/INTEGER-aware substitution,
      429-aware retry, `UUID_MISMATCH`/`SCHEMA_GAP` classification, JSON+MD reports, exit codes
- [x] **P2 heals:** migrations 306 (Bucket B PACU), 307 (`audit_logs`), 308 (`hospital_settings`
      tenancy), 309 (POS devices + controller arg-order fix), 310 (`emergency_logs` ward alerts),
      repo file 216 (`govt_scheme_packages`) — each was a demo-blocking 500 found by the funnel
- [x] **P2 tests:** `npx jest --forceExit` → **193 passed, 0 failed** (3 skipped)
- [x] **P3 E2E:** Playwright on Edge (`channel: msedge`); `golden-clinical-journey.spec.js`
      **5/5 passing in 25.9 s** (Reception+registration → Doctor+AI interaction → ICU → Lab/Radiology
      → Pharmacy/Billing) with the Zero-Error Trap (pageerror / any 5xx / Bucket A&B 4xx, Bucket C
      404 exempt)
- [x] **P4 rehearsal:** `demo-rehearsal.spec.js` passing under CDP Fast 4G on the built bundle
      (bundle 7.31 MB < 8 MB budget, FCP 3.6 s, TTI 21 ms, Bucket C neutral states verified)
- [x] **P4 socket sync (GREEN):** `socket-sync.spec.js` — aligned room names (`hosp_${id}` and `hospital_${id}`),
      attached `req.io = io` in `server-cloud.js`/`server.js`, routed `/socket.io` through Vite dev proxy.
      Broadcast and clear events verified arriving within ~250ms and ~100ms (< 300ms budget). E2E suite 7/7 green.
- [x] **P5 packaging:** root `qa:route-manifest|qa:500-hunter|qa:500-hunter:demo|qa:pre-demo`,
      `.github/workflows/pre-demo-qa.yml`, `docs/PRE_DEMO_QA.md`
- [ ] **Residual 500s (documented, not green):** 134 critical (full sweep) / 43 (demo profile) —
      local schema drift, triaged in `plans/500-hunter-known-issues.md`



### WARD-TILE: Admin Dashboard Ward Tiles Fix (2026-09-20)
- [x] Relabeled "Wards" tile to "Nurse Station (Ward Board)" (`/ward`)
- [x] Added "Ward Management (Incharge)" tile (`/ward-management`)
- [x] Removed duplicate "Ward Config" tile (`/admin/wards`)
- [x] Built client (`npm run build` green, bundle `index-6sfNt8ER.js`) and verified all client tests pass (16/16)

### System-Wide Connectivity Restoration — Phase 2: Flash Implementation (2026-09-19)
- [x] **P2-1: Bucket A1 Mounts (commit `90a4806`)**:
  - [x] Mounted 14 dev routers in `server/server-cloud.js`: `icu`, `maternity`, `2fa`, `payments`, `abdm`, `ai-billing`, `alerts`, `dental`, `govt-schemes`, `mortuary`, `ophthalmology`, `support`, `transitions`, `upload`.
- [x] **P2-2: Bucket A2 Sub-Route Porting & Aliases (commit `96ee749`)**:
  - [x] Reconciled sub-routes across 25 route/controller modules: `admissionRoutes`, `aiRoutes`, `billingRoutes`, `bloodBankRoutes`, `clinicalRoutes`, `dentalRoutes`, `dietaryRoutes`, `equipmentRoutes`, `financeRoutes`, `labRoutes`, `nurseRoutes`, `otRoutes`, `patientRoutes`, `problemListRoutes`, `pharmacyRoutes`, `platformRoutes`, `securityRoutes`, `settingsRoutes`, `supportRoutes`, `abdmRoutes`, `authRoutes`, etc.
  - [x] Reduced broken routes from 157 to 77.
- [x] **P2-3: Bucket B Wiring (commit `49304b3`)**:
  - [x] Mounted 13 unmounted routers: `anaesthesia`, `branding`, `charges`, `dicom`, `intraop`, `license`, `migration`, `orthopedic`/`orthopedics`, `pac`, `pacu`, `pos`, `preauth`, `test`.
  - [x] Added `POST /api/branding` and `GET /api/test/migrate-login-security`.
  - [x] Fixed `PreauthDashboard.jsx` query parameter serialization.
  - [x] Resolved Prometheus registry conflict in `OverwatchService.js`.
  - [x] Added `requireRole` middleware helper in `permissionMiddleware.js`.
- [x] **P2-4: Bucket C UI Disable (commit `b2888eb`)**:
  - [x] Handled 13 unimplemented families with disabled triggers, "Module not enabled" badges/tooltips, informational banners, and modal guards: `ambulance`, `assets`, `clinical-pathways`, `communications`, `infection-control`, `laundry`, `neonatal`, `order-sets`, `pre-op`, `prior-auth`, `quality`, `staff`, `waste`.
  - [x] Rebuilt client bundle and copied `client/dist/` to `server/public/`.
- [x] **P2-5: Verification Gate (All Passed)**:
  - [x] `node scripts/audit/route-matrix.js`: broken = 20 (target $\le 30$).
  - [x] `npm test` in `server/`: 193 passing tests (39 suites passed, 3 skipped, 0 failures).
  - [x] `npm run build` in `client/`: production build successful in 8.44s.
  - [x] Clean local git commit history.

### WGM Track T1: Tactical Enterprise Completion + Crash Root-Cause + Telemetry (2026-09-18)

- [x] **T1-A: Tabs Hardening & Screen Consolidation (F4/F5 completion)**:
  - [x] Consolidated navigation in `wgm/App.js` into 5 tactical tab sections: Home (Command), Patrol, Dispatch, People, Profile.
  - [x] Grouped all 14 screens into logical stacks (`HomeStackScreen`, `PatrolStackScreen`, `DispatchStackScreen`, `PeopleStackScreen`, `ProfileStackScreen`) preserving direct root-level backwards compatibility.
  - [x] Enhanced `wgm/src/components/ScreenShell.js` with shift-aware header integration, duty mode badges, and station subtitles.
  - [x] Authored comprehensive manual QA test matrix in `wgm/QA_UI_CHECKLIST.md`.
  - [x] Authored Jest snapshot tests in `wgm/src/__tests__/navigation.test.js`: **8/8 tests passed**, snapshot written and verified.
- [x] **T1-B: Patrol-Start Crash Root Cause (logcat MANDATORY first)**:
  - [x] Authored `wgm/docs/LOGCAT_CAPTURE.md` detailing exact ADB logcat reproduction commands (`adb logcat -s WolfGuard:D *:E -c`).
  - [x] Authored `wgm/docs/PATROL_LOGCAT_RESULT.md` capturing and documenting `java.lang.SecurityException: Need android.permission.ACCESS_FINE_LOCATION or android.permission.ACCESS_COARSE_LOCATION to call LocationManager.requestLocationUpdates`.
  - [x] Added runtime permission gating inside `wgm/src/screens/PatrolScreen.js` (`handleStartPatrol`), requesting foreground permissions before invoking location updates.
  - [x] Hardened `wgm/src/services/locationService.js` `init()` with try/catch, Sentry capture, and fallback to `Location.getLastKnownPositionAsync`.
- [x] **T1-C: Real-Time Telemetry Convergence**:
  - [x] Updated `wgm/src/services/locationService.js` to import `expo-battery` and append `batteryLevel` (integer %) exclusively during active patrols (`setPatrolActive(true)`).
  - [x] Connected `socketService.connect()` on login (`LoginScreen.js`) and on cached boot (`AuthContext.js`); wired `socketService.disconnect()` on logout.
  - [x] Added socket event listeners for `ping_guard` (auto-emits `guard_ping_response` with location and battery), `request_photo` (launches tactical camera modal), and `sos_ack` (triggers haptics and toast).
  - [x] Enhanced server `server/services/socketHandler.js` with 90s silence timeout watcher marking inactive guards `OFFLINE`.
  - [x] Authored `wgm/scripts/test-telemetry-e2e.js` and verified: pong received in **2ms** (<3000ms SLA), silence timeout watcher cleanly flips guard status to OFFLINE.
- [x] **T1-D: Tactical Visual Layer**:
  - [x] Replaced emojis with `TacticalIcon` in `wgm/src/screens/DispatchScreen.js` and `wgm/src/screens/PatrolScreen.js`.
  - [x] Designed and implemented the Home Command 2x2 grid hero in `PatrolScreen.js` featuring bold linear gradients for SOS, Patrol, Checkpoint, and Visitors with tactical badges and haptics.
  - [x] Reskinned `wgm/src/screens/DutySelectionScreen.js` in cyber terminal aesthetic (`> WG-TERM-01 // NODE: ONLINE`, monospace status tags, cyber brackets).
  - [x] Audited and verified **zero raw hex** tokens across `wgm/src/` outside `wgm/src/theme/index.js`.

### Ecosystem Hardening Program — Phase 7: Defense-in-Depth Enforcement, Resilience & Performance (2026-09-18)

- [x] **W1 — wolf_app Non-Superuser Role Split**:
  - [x] Authored migration `server/migrations/305_wolf_app_role.sql` creating non-superuser role `wolf_app` with LOGIN, public schema DML permissions, sequence usage, and default privileges. Zero hardcoded secrets via `${ENV:WOLF_APP_DB_PASSWORD}` interpolation.
  - [x] Created `server/config/bootRoles.js` resolving `wolf_app` when `APP_DB_ROLE=wolf_app` and `WOLF_APP_DB_PASSWORD` are set, falling back cleanly to `DB_USER` (`postgres`) for local development.
  - [x] Gated boot-time auto-migrations and schema DDL behind `BOOT_DDL=true` in `server/server-cloud.js` and `server/server.js`, preventing non-superuser runtime failures on startup.
  - [x] Enhanced `server/scripts/admin-cli.js` with deterministic `${ENV:VAR_NAME}` token replacement and fail-closed validation.
  - [x] Authored unit tests in `server/tests/unit/adminCliEnv.test.js` (7 tests passing) and `server/tests/unit/bootRoles.test.js` (5 tests passing).
  - [x] Authored contract test `server/tests/contract/rlsEnforced.test.js` (4 tests passing) verifying transaction-scoped tenant isolation and role separation.
  - [x] Authored operator cutover runbook `scripts/probes/wolf-app-cutover.md` detailing migration execution, PM2 environment reconfiguration, live RLS isolation verification, and rollback procedure.
- [x] **W2 — Automated Backup Schedule & Restore Proof**:
  - [x] Authored `server/scripts/backup-scheduler.js` providing opt-in backup scheduling (`BACKUP_ENABLED=true`) via `node-cron` (default `02:15` daily) with fallback `setInterval` runner.
  - [x] Implemented retention pruning algorithm retaining `BACKUP_RETENTION_DAILY` (default 14) and `BACKUP_RETENTION_WEEKLY` (default 4) snapshots.
  - [x] Implemented automated weekly integrity verification pass (`BACKUP_VERIFY_WEEKLY=true`) executing `verifyBackupFile` and logging failures with `[BACKUP-ALERT]`.
  - [x] Authored operator drill runbook `scripts/probes/restore-drill-auto.md` detailing non-destructive restoration into isolated container scratch schema `scratch_restore`.
  - [x] Authored unit tests in `server/tests/unit/backupSchedule.test.js` (5 tests passing).
- [x] **W3 — Performance & Slow-Query Telemetry**:
  - [x] Extended `server/services/MetricsCollector.js` with Prometheus histogram `db_query_duration_ms` (`query_prefix`, `status`), counter `db_slow_queries_total`, configurable threshold `SLOW_QUERY_MS` (default 500ms), and 15-minute rolling window tracking.
  - [x] Implemented in-memory bounded ring buffer tracking the top 5 slowest HTTP endpoints (`getTopSlowEndpoints`).
  - [x] Instrumented query execution in `server/config/dbPools.js` measuring query duration across `primaryPool`, `replicaPool`, and smart router without breaking existing callers.
  - [x] Enriched `GET /api/health/obs` with `slowQueriesLast15m`, `poolWaitingCount`, and `topSlowEndpoints`.
  - [x] Authored contract tests in `server/tests/contract/slowQueryTelemetry.test.js` (4 tests passing) and updated `server/tests/contract/obsStatus.test.js` (5 tests passing).
  - [x] Authored operational performance guide `docs/PERF_GUIDE.md` documenting k6 smoke baseline figures (p95 ~237ms @ 50 VU, 0% error rate) and post-deploy telemetry verification.
- [x] **W4 — Documentation, OpenAPI & Full Verification**:
  - [x] Updated `SECURITY_DEBT.md` Item 5 with Phase 7 role-split status and cutover runbook.
  - [x] Updated `docs/openapi.yaml` with enriched `/api/health/obs` schema; validated with `@redocly/cli lint` (0 errors).
  - [x] Total backend test harness results: **193 passing tests** (39 passed suites, exactly **3 skipped suites**, 0 failures).
  - [x] Total frontend test harness results: **16 passing tests**, clean production build.
  - [x] Zero VPS mutations; all deliverables local code, tests, and operator runbooks.

### Ecosystem Hardening Program — Phase 6: Observability: Metrics, Logging, Alerting & Error Visibility (2026-09-17)

- [x] **W1 — Request Metrics & Prometheus Export**:
  - [x] Refactored `server/services/MetricsCollector.js` onto `prom-client` (`http_requests_total`, `http_request_duration_ms`, `db_slow_queries_total`, regex path normalization for cardinality defense, 15m trailing error window)
  - [x] Mounted `metricsMiddleware` in `server/server-cloud.js` (line 88, directly after helmet/CORS)
  - [x] Implemented `GET /api/metrics` in `server/routes/systemRoutes.js` gated by `protect` + `authorize('super_admin', 'platform_owner', 'admin')`, emitting Prometheus text exposition
  - [x] Authored contract tests in `server/tests/contract/metrics.test.js` (5 tests passing)
- [x] **W2 — Structured Logging with Winston**:
  - [x] Authored centralized Winston logger in `server/utils/logger.js` (JSON format in production, colorized console in development, file transport, auto-created log dir, unhandled exception/rejection handling)
  - [x] Replaced `console.*` at strictly the 6 mandated sites: `requestLogger`, `auditMiddleware`, `socketCluster`, `secrets.js`, `authController` reuse detection, `admin-cli`
  - [x] Authored unit tests in `server/tests/unit/logger.test.js` (3 tests passing)
- [x] **W3 — Sentry Verification & Activation Path**:
  - [x] Audited `OverwatchService.js` and confirmed DSN gating (`SENTRY_DSN`)
  - [x] Implemented `GET /api/debug/sentry-trigger` in `server/routes/setupRoutes.js` (strictly `super_admin` only, returns HTTP 403 in `NODE_ENV=production`)
  - [x] Authored operator runbook `scripts/probes/error-tracking-verify.md`
  - [x] Authored unit tests in `server/tests/unit/sentryGate.test.js` (4 tests passing)
- [x] **W4 — Alert Definitions & Aggregate Health Contract**:
  - [x] Authored Prometheus alert rules `docs/alert.rules.yml` (5xx errors, latency p95, slow queries, socket drops, RLS violations, token reuse, pool exhaustion, disk space)
  - [x] Authored operator alerting guide `docs/ALERTING.md`
  - [x] Implemented `GET /api/health/obs` in `server/routes/systemRoutes.js` gated by `protect` + `authorize('super_admin', 'platform_owner', 'admin')`
  - [x] Authored contract tests in `server/tests/contract/obsStatus.test.js` (4 tests passing)
- [x] **W5 — Documentation, OpenAPI & Full Verification**:
  - [x] Updated `docs/openapi.yaml` with `/api/metrics`, `/api/health/obs`, and `/api/debug/sentry-trigger`
  - [x] Validated with `@redocly/cli lint docs/openapi.yaml` (0 errors, 0 warnings)
  - [x] Verified `tests/unit/openapiCoverage.test.js` (5/5 tests passing)
  - [x] Total backend test harness results: **167 passing tests**, 34 passed suites, exactly **3 skipped suites**, 0 failures
  - [x] Total frontend test harness results: **16 passing tests**, clean production build
  - [x] Zero VPS mutations; all deliverables local code, tests, and operator runbooks

### Ecosystem Hardening Program — Phase 5: Compliance & Access: SSO/OIDC, HIPAA Audit Hardening, Backup & DR (2026-09-16)

- [x] **W1 — Enterprise SSO / OIDC Integration (Non-Breaking, Optional)**:
  - [x] Pinned and installed `openid-client@^5.7.0` (CJS native) in `server/package.json`
  - [x] Authored `server/services/oidcService.js` with lazy discovery and testing mock support
  - [x] Implemented `server/routes/ssoRoutes.js` (`GET /api/auth/sso/login` with PKCE & state cookies; `GET /api/auth/sso/callback` with email matching to existing users, no auto-provisioning, 403 on unmapped/inactive accounts, issuing standard 8h JWT + rotating refresh token)
  - [x] Mounted `/api/auth/sso` ahead of `/api/auth` in `server/server-cloud.js`
  - [x] Authored enterprise configuration runbook `docs/SSO_ENABLEMENT.md` (Azure AD, Google Workspace, Keycloak)
  - [x] Authored contract tests in `server/tests/contract/ssoFlow.test.js` (7 tests passing)
- [x] **W2 — HIPAA Audit Trail Hardening & Cryptographic Hash Chaining**:
  - [x] Closed P5-1 audit coverage gap: corrected route path resolution in `server/middleware/auditMiddleware.js` (`req.originalUrl || req.baseUrl + req.path`)
  - [x] Mounted `auditMiddleware` before route handlers in `server/server-cloud.js` across all 12 PHI resource routes (`patients`, `admissions`, `prescriptions`, `lab`, `pharmacy`, `radiology`, `clinical`, `appointments`, `opd`, `billing`, `finance`, `insurance`, `pmjay/claims`)
  - [x] Created migration `server/migrations/304_audit_integrity.sql` adding `prev_hash VARCHAR(64)` and `record_hash VARCHAR(64)`
  - [x] Implemented cryptographic SHA-256 hash chaining in `server/utils/auditChain.js`, `server/middleware/auditMiddleware.js`, and `server/middleware/auditLogger.js`
  - [x] Implemented super-admin CSV audit export endpoint `GET /api/admin/audit/export` with cryptographic chain validation in `server/routes/auditExportRoutes.js`
  - [x] Authored 6-year retention and cold storage runbook `docs/AUDIT_RETENTION.md`
  - [x] Authored unit tests `server/tests/unit/auditChain.test.js` (5 tests passing) and contract tests `server/tests/contract/auditExport.test.js` (5 tests passing)
- [x] **W3 — Automated Backup & Disaster Recovery**:
  - [x] Authored disaster recovery runbook `scripts/probes/restore-drill.md` (RTO $\le$ 15 min, RPO $\le$ 1 hr, step-by-step restoration, post-restore smoke verification)
  - [x] Authored safe backup dump script `server/scripts/backup-dump.js` (dry-run by default, requires explicit `--commit`, timestamped gzipped output)
  - [x] Authored offline backup verification script `server/scripts/verify-backup.js` (inspects `.sql` and `.sql.gz` streams, verifies core tables and `record_hash`)
  - [x] Authored unit tests `server/tests/unit/backupVerify.test.js` (4 tests passing)
- [x] **W4 — Documentation, OpenAPI & Regression Verification**:
  - [x] Updated `SECURITY_DEBT.md` with Item 8 (Audit Trail Coverage Gap & Tamper-Vulnerability closed)
  - [x] Updated `docs/openapi.yaml` with SSO and HIPAA Audit Export endpoints; passed `@redocly/cli lint` with 0 errors/warnings
  - [x] Expanded backend test suite from 130 to **151 passing tests** (30 test suites passing, 3 skipped, 0 failures)
  - [x] Frontend test suite: **16 passing tests**; clean build
  - [x] Zero mutations to live VPS; all work local code, tests, and runbooks

### Ecosystem Hardening Program — Phase 4: Stability & Scale: Realtime Clustering, Pooling & Load Proof (2026-09-16)

- [x] **W0 — Close P3-F1 Carry-Over Debt**:
  - [x] Excised hardcoded `'wolf-migrate-2026'` fallback secret in `server/routes/adminMigrationRoutes.js`
  - [x] Fail-fast check via `server/config/secrets.js` (`ADMIN_MIGRATE_SECRET`) throws at boot if missing
  - [x] Added `ADMIN_MIGRATE_SECRET=` to `server/.env.example`
  - [x] Unit test `server/tests/unit/adminMigrationConfig.test.js` (2 tests passing)
- [x] **W1 — Socket.IO Horizontal Redis Adapter**:
  - [x] Added pinned `@socket.io/redis-adapter@^8.3.0` alongside `ioredis@^5.3.0`
  - [x] Authored `server/services/socketCluster.js` with `attachAdapter(io, redisUrl)`
  - [x] Default-off: single-node instances without `REDIS_URL` are completely unaffected
  - [x] Wired conditionally into `server/server-cloud.js`
  - [x] Unit test `server/tests/unit/socketCluster.test.js` (3 tests passing)
- [x] **W2 — PM2 Cluster Mode**:
  - [x] Authored `deploy/ecosystem.config.cjs` with `wolf-hms-api`, `exec_mode: 'cluster'`, `instances: 'max'`, `max_memory_restart: '1G'`
  - [x] Authored stepwise operator runbook `scripts/probes/post-cluster-rollout.md`
  - [x] Unit test `server/tests/unit/ecosystemConfig.test.js` (3 tests passing)
- [x] **W3 — PgBouncer & Database Pool Hardening**:
  - [x] Authored reference Compose files `deploy/docker-compose.pgbouncer.yml` and `docker-compose.pgbouncer.yml`
  - [x] Hardened `server/config/dbPools.js` and `server/db.js` with env-tunable parameters (`PG_POOL_MAX` default 10, `PG_POOL_IDLE_TIMEOUT` default 30000ms, `PG_POOL_CONN_TIMEOUT` default 5000ms)
  - [x] Boot-time logging of effective pool settings
  - [x] Unit test `server/tests/unit/dbPoolConfig.test.js` (3 tests passing)
- [x] **W4 — k6 Concurrency & Load Testing Suite**:
  - [x] Authored `loadtests/k6/smoke-health.js` (50 VU, 30s, p95 < 300ms, error rate < 1%)
  - [x] Authored `loadtests/k6/login-mixed.js` (25 VU staggered login + authenticated query, fails closed if creds missing)
  - [x] Authored `loadtests/k6/socket-storm.js` (100 concurrent WebSocket connections, 30s hold, error counter)
  - [x] Authored comprehensive execution documentation `loadtests/README.md`
- [x] **W5 — Second-Tenant RLS Proof**:
  - [x] Created migration `server/migrations/303_second_tenant_seed.sql` seeding Hospital 2 ('Wolf Clinic Two'), staff, and patients (strict UUID PKs)
  - [x] Authored operator isolation proof runbook `scripts/probes/rls-multi-tenant.md`
  - [x] Unit test `server/tests/unit/rlsProofPlan.test.js` (3 tests passing)
- [x] **W6 — Documentation & Verification**:
  - [x] Closed P3-F1 in `SECURITY_DEBT.md`
  - [x] Total backend test harness results: **130 passing tests**, 26 passed suites, exactly **3 skipped suites** (`deadly_scenario.test.js`, `nuclear_load.test.js`, `e2e.test.js`), 0 failures
  - [x] Frontend test harness results: **16 passing tests**, clean production build
  - [x] Zero VPS mutations; all deliverables local code, tests, and operator runbooks

### Ecosystem Hardening Program — Phase 3: Backend Modularization, API Contract & Token Lifecycle (2026-09-16)

- [x] **Server Decomposition & Landmine Removal**:
  - [x] Reduced `server/server-cloud.js` from 1,627 lines to **523 lines** (line count < 900 target met)
  - [x] Permanently removed `/api/health/exec-sql` and `/api/health/run-migration` 410 stubs (returns HTTP 404)
  - [x] Neutralized destructive migration landmines at `server-cloud.js:960-1260` (hotfix table drops and tenant backfills)
  - [x] Extracted inline route handlers into 3 standalone route modules: `systemRoutes.js`, `setupRoutes.js`, `securityCompatRoutes.js`
  - [x] Sanitized hardcoded `WolfSetup2024!` from all secondary controllers and seed scripts
  - [x] Archived obsolete `server-cloud-fixed.js` to `phase2_backups/server-cloud-fixed.js.bak`
- [x] **OpenAPI 3.1 Specification & Interactive Documentation**:
  - [x] Authored complete OpenAPI 3.1 specification at `docs/openapi.yaml` covering clinical, auth, emergency, security, setup, and system endpoints
  - [x] Validated with `@redocly/cli lint`: **0 errors**
  - [x] Mounted interactive Redoc UI at `GET /api/docs` and raw spec at `GET /api/docs/openapi.yaml`
  - [x] Contract test `server/tests/unit/openapiCoverage.test.js` (5 tests passing)
- [x] **Refresh Token Lifecycle & Family Revocation**:
  - [x] Created database migration `server/migrations/302_refresh_tokens.sql` with hashed token storage (`token_hash`), `family_id`, and indexes
  - [x] Implemented SHA-256 hashed refresh token generation, rotation, and reuse detection in `server/controllers/authController.js`
  - [x] Automatic family-wide revocation upon detecting reuse of already-revoked tokens
  - [x] Explicit logout revocation at `POST /api/auth/logout`
  - [x] Retained 30-day token expiration for mobile security guards; reduced web session token lifespan to 8h
  - [x] Contract tests in `server/tests/contract/refreshFlow.test.js` (6 tests passing)
- [x] **Legacy Suite Rehabilitation**:
  - [x] Rehabilitated 7 legacy test suites to deterministic in-memory mock DB tests (`interceptor`, `reception_audit`, `duplicate_check`, `hospital_edge_cases`, `ai_extreme`, `complex_cardiac_case`, `hospital_simulation`)
  - [x] Fixed open handle timers in `authRoutes.js` and `loginRateLimiter.js` with `.unref()`
  - [x] Total backend test harness results: **116 passing tests**, 21 passed suites, exactly **3 skipped suites** (`deadly_scenario.test.js`, `nuclear_load.test.js`, `e2e.test.js`), 0 failures, 2.1s runtime
  - [x] Total frontend test harness results: **16 passing tests**, clean production build

### Ecosystem Hardening Program — Phase 2: Security Depth (2026-09-16)

- [x] **Backdoor Neutralization & Administrative CLI**:
  - [x] Neutralized `POST /api/health/exec-sql` to HTTP **410 Gone** across all methods with informative guidance
  - [x] Authored `server/scripts/admin-cli.js` with `--sql`, `--file`, `--dry-run`, and `--token` flags
  - [x] Integrated audit logging in `server/logs/admin-cli.log`
  - [x] Converted 3 operational runbooks in `scripts/admin-runbooks/`: `seed-guard.md`, `apply-migration.md`, `read-diagnostics.md`
  - [x] Contract tests in `server/tests/contract/adminSurface.test.js` (5 tests passing) and `server/tests/unit/adminCli.test.js` (5 tests passing)
- [x] **Secrets Vaulting & Fail-Fast Hygiene**:
  - [x] Created `server/config/secrets.js` vault loader with `validateSecrets({ failFast })`
  - [x] Eliminated hardcoded `'secret_key'` fallbacks in `server/controllers/authController.js`
  - [x] Enforced fail-fast 500 error on token signing when `JWT_SECRET` is unset
  - [x] Updated root `.env.example` and `server/.env.example` with `SETUP_KEY`, `MIGRATION_CLI_TOKEN`, `JWT_EXPIRES`, `ALLOWED_ORIGINS`
- [x] **Row-Level Security (RLS) Completion**:
  - [x] Audited all 107 multi-tenant tables in `SECURITY_RLS_MATRIX.md`
  - [x] Created `server/migrations/301_rls_gapfill.sql` covering all 95 remaining multi-tenant tables with `ENABLE`/`FORCE ROW LEVEL SECURITY` and `tenant_isolation_<table>` policies
  - [x] Implemented `server/middleware/rlsContext.js` with transaction-scoped `withTenantContext`
  - [x] Unit tests in `server/tests/unit/rlsMatrix.test.js` (3 tests passing)
- [x] **JWT Hardening & CORS Lockdown**:
  - [x] Tokens signed with `iss: 'wolf-hms'`, `aud: 'wolf-hms-api'`, and configurable `JWT_EXPIRES` (8h default for web, 30d for guards)
  - [x] `server/middleware/authMiddleware.js` verifies `iss`/`aud` with backward-compatibility window for legacy tokens
  - [x] Replaced reflect-all CORS and Socket.IO `*` wildcard with strict `ALLOWED_ORIGINS` allowlist
  - [x] Unit tests in `server/tests/unit/jwtConfig.test.js` (5 tests passing) and `server/tests/unit/corsConfig.test.js` (5 tests passing)
- [x] **Gated Debug & Setup Endpoints**:
  - [x] Gated `/api/debug/env` and `/api/debug/fs` behind `protect` and `super_admin` / `platform_owner` roles
  - [x] Gated `/api/setup/reset-and-seed` and `/api/setup/schema-sync` behind `SETUP_KEY`
- [x] **Verification Probes & Status**:
  - [x] Authored `scripts/probes/post-deploy-security.ps1` non-mutating verification probe
  - [x] Test suite expanded to **58 passing tests** (12 suites, 0 failures, 0 database connection requirement)
  - [x] Pre-edit backups preserved in `phase2_backups/`
  - [x] Zero VPS mutations; operator deployment runbook documented in `SECURITY_DEBT.md` and `HARDENING_PHASE2_FLASH_KICKOFF.md`

### Ecosystem Hardening Program — Phase 1: Foundation (2026-09-16)

- [x] **Backend Test Harness (`server/`)**:
  - [x] Installed `supertest@^7.0.0`
  - [x] Fixed broken imports in `server/tests/apiResponse.test.js` and `server/tests/errors.test.js`
  - [x] Quarantined 9 legacy DB/scenario scripts behind `isDbTest = process.env.DB_TESTS === '1'` gate with clean `describe.skip`
  - [x] Converted `server/tests/e2e.test.js` to Jest `describe.skip` gated by `process.env.SMOKE === '1'`
  - [x] Unit test: `server/tests/unit/isbtParser.test.js` (8 tests passing: ISBT 128 donation/product codes, checksum, invalid formats)
  - [x] Unit test: `server/tests/unit/CryptoUtils.test.js` (4 tests passing: SHA256 hashing, salting, deterministic hashing)
  - [x] Contract test: `server/tests/contract/emergency.contract.test.js` (4 tests passing: code/type fallback cascade)
  - [x] Contract test: `server/tests/contract/security.contract.test.js` (5 tests passing: /location, /sos, /patrols)
  - [x] Contract test: `server/tests/contract/dashboard.contract.test.js` (3 tests passing: /opd/queue, /admissions/active, /emergency/status)
  - [x] Verified: `cd server && npm test` passes with **35 green tests**, 10 skipped, 0 failures, 0 database connection requirement (execution time: ~1.4s)
- [x] **Frontend Test Harness (`client/`)**:
  - [x] Installed `vitest@^2.1.0`, `@testing-library/react@^16.0.0`, `jsdom@^25.0.0`
  - [x] Configured `client/vitest.config.js` and `"test": "vitest run"` in `client/package.json`
  - [x] Unit test: `client/src/utils/safeStorage.test.js` (7 tests passing: getItem, setItem, removeItem, clear, quota error handling)
  - [x] Unit test: `client/src/utils/currency.test.js` (6 tests passing: INR formatting, symbol handling, decimals)
  - [x] Component test: `client/src/components/Dashboard.test.jsx` (3 tests passing: renders all 47 operational modules, badge count matches, critical departments present)
  - [x] Verified: `cd client && npm test` passes with **16 green tests**; `npm run build` completes cleanly in ~10.7s
- [x] **Continuous Integration (CI Gate)**:
  - [x] Created `.github/workflows/ci.yml` defining automated backend test gate (`npm test`), frontend test gate (`npm test` + `npm run build`), and mobile syntax check gate (`node --check`)
- [x] **Secrets Hygiene & Developer Ergonomics**:
  - [x] Created `wgm/.env.example`
  - [x] Created `wolf-ultimate/.env.example`
  - [x] Created `wolf-care-app/.env.example`
  - [x] Annotated `/api/health/exec-sql` in `server/server-cloud.js` with security debt notice block
  - [x] Created `SECURITY_DEBT.md` cataloging 6 debt vectors tagged for Phase 2
  - [x] Created `HARDENING_PROGRAM.md` tracking Master Roadmap and Phase 1 completion
- [x] **Zero Production Disruption**:
  - [x] Zero mutations to runtime application logic
  - [x] Zero credential rotations or VPS actions
  - [x] Dev-dependencies only added to `package.json`

### Emergency System (Database Level)

- [x] `fn_sync_emergency_to_logs()` trigger — auto-syncs emergency_events → emergency_logs
- [x] `fn_enrich_emergency_event()` trigger — enriches location with responder teams
- [x] `emergency_code_responders` registry — 7 codes (Blue/Cardiac, Red/Fire, Yellow/Disaster, Pink/Infant, Orange/Hazmat, White/Violent, Black/Bomb)
- [x] Stale "Active" alerts resolved in both emergency tables
- [x] Verified via `test_all_codes.js`

### Emergency System (Local Code)

- [x] `emergencyController.js` — reads `req.body.code`, inserts both tables, emits Socket.IO
- [x] `WardDashboard.jsx` — instant banner display, pulsating animation, RESOLVE button

### Database & Schema

- [x] Tenant resolver unified to `hospital_id = 1`
- [x] Invoices UUID relational join fix
- [x] LIMS routes mounted under `/api/lab/parameters` and `/api/lab-params`
- [x] Base schemas: `lab_parameters`, `ot_schedules`, `pending_lab_payments`
- [x] `add_hospital_id_to_96_tables.sql` migration

### Infrastructure

- [x] Memory Bank created (6 files in `memory-bank/`)
- [x] Infrastructure guide created (`wolf_infrastructure_guide.md`)
- [x] Handoff guide for cross-agent work (`handoff_guide.md`)

### Wolf Guard Backend (2026-09-07, Multi-Agent: Antigravity + Kimi K3 + DeepSeek V4 Flash)

- [x] `guardController.js` — `getOnlineGuards` rewritten (LATERAL join, correct column names)
- [x] `guardController.js` — `getActivePatrols` rewritten (same column fixes)
- [x] `guardController.js` — `updateLocation` rewritten (plain INSERT, no upsert, full Prisma schema)
- [x] 9 new endpoints: maps (save/getActive), geofences, SOS, incidents, missions, patrols (start/end/checkpoint)
- [x] `securityRoutes.js` — 9 new route registrations
- [x] `server-cloud.js` — locationRoutes mount added for production
- [x] `GuardMap.jsx` — Socket URL fixed (window.location.origin fallback)
- [x] `locationService.js` — setGuardId method + placeholder replaced
- [x] Production seed: guard_kumar user (id=14, security_guard role, APPROVED)
- [x] Production seed: 2 geofence zones (Main Hospital Compound + Restricted Server Block)

## 🔄 In Progress / Immediate Fixes

### Emergency System (Deployment)

- [ ] Deploy fixed `emergencyController.js` to VPS (SSH now works — use ssh2 deploy script)
- [ ] Deploy rebuilt frontend bundle to VPS
- [ ] Add staff notification list UI after emergency trigger

### Wolf Guard (Verification & Deployment)

- [x] Rebuild client dist with keyless ESRI World Dark Gray Canvas and safe battery scaling (deployed 2026-09-13)
- [x] Deploy server socket handler with guard room routing (`guard_${userId}`, `user_${userId}`) — deployed & verified 2026-09-13
- [x] Deploy guardController.js with ping/photo emit payloads and hospital_id resolution (deployed & verified 2026-09-13)
- [x] Live guard telemetry sync (real battery 53%) & WebSocket ping/photo round-trip verified end-to-end (2026-09-13)
- [x] Rebuild Wolf Guard Mobile release APK with continuous duty telemetry, socket auto-reconnect, and Tactical HQ Ping/Photo modals (delivered to Desktop 2026-09-13)
- [x] Deploy missing securityRoutes.js to VPS (patrols/start, end, checkpoint, sos, maps, incidents) (2026-09-14)
- [x] Fix native Alert crash in PatrolScreen.js with extractErrorMessage safe string casting (2026-09-14)
- [x] Harden sensorService.js with isAvailableAsync() guards across accelerometer, gyroscope, magnetometer (2026-09-14)
- [x] Harden locationService.js with GPS watch and sensor try/catch fallbacks (2026-09-14)
- [x] Rebuild Wolf Guard Mobile release APK with Phase 1 crash fixes and delivered to Desktop (143.5 MB) (2026-09-14)
- [x] Phase 2: Wire HeadingEstimator and StepDetector into locationService for live PDR (2026-09-14)
- [x] Phase 2: Add zero-drift position snapping and QR anchor coordinate parsing in QRScannerScreen (2026-09-14)
- [x] Phase 3: Multi-floor blueprint alignment and Barometer altimeter tracking (2026-09-14)
  - [x] Production DB migration: added floor_number & altitude to guard_locations and floor_plans
  - [x] Seeded calibrated blueprints for Floor 1 and Floor 2
  - [x] guardController.js deployed with floor querying, saving, and Socket.IO broadcasting
  - [x] Barometer sensor fusion, altitude calculations, and floor transitions in locationService.js
  - [x] Added [FLOOR L1] telemetry pill with tap-to-cycle in PatrolScreen.js
  - [x] QR scanner 3D anchor snapping in QRScannerScreen.js
  - [x] Interactive floor level selector in SecurityDashboardV2.jsx and high-contrast badges in LiveOverwatchMap.jsx
  - [x] Web client bundle rebuilt and deployed live to production VPS
  - [x] Wolf Guard Mobile Release APK compiled and delivered to Desktop (143.5 MB)
- [x] Phase 4: Industrial Indoor Positioning & Georeferenced Multi-Floor Architecture (2026-09-14)
  - [x] DB Migration: hospital_buildings, floor_plans corners/calibration/walkable_graph upgrade, floor_zones table
  - [x] Backend: 7 new endpoints (uploadBlueprint, calibrateFloorPlan, corridors, zones CRUD, buildings) deployed to VPS
  - [x] Georeferencing Studio Modal (FloorPlanStudioModal.jsx): Leaflet.DistortableImage integration, drag/rotate/scale/4-corner warp, metrics HUD, fine steppers
  - [x] Floor Plan Management: modernized FloorPlanManager.jsx with studio launcher card & floor table
  - [x] Cockpit Map (LiveOverwatchMap.jsx): 4-corner affine blueprint rendering, directional guard heading cones, zone overlays, corridor lines
  - [x] Web Client: rebuilt with Vite and deployed live to VPS (/var/www/wolf-hms/server/public)
  - [x] Mobile PDR Map-Matching: CorridorParticleFilter (150-particle Monte Carlo filter) preventing wall-through drift
  - [x] Mobile Stride Estimation: Weinberg dynamic formula in StepDetector.js
  - [x] Mobile APK: compiled in C:\wgm and delivered to Desktop\WolfGuard.apk (143.5 MB)
- [x] Phase 5: Expose Hospital Floor Layout Upload & Georeferencing on Frontend (2026-09-14)
  - [x] Added prominent cyan glowing button [Upload Floor Plan & Align] in SecurityDashboardV2.jsx map header
  - [x] Added amber uncalibrated warning banner [Level L1: No calibrated layout. Upload your hospital floor plan... [Upload & Align]]
  - [x] Added floating [📐 Align Layout] pill button inside LiveOverwatchMap.jsx container
  - [x] Registered /security/floor-plans and /admin/floor-plans routes in App.jsx (React.lazy + Suspense)
  - [x] Added Floor Plans link in TopNav.jsx and Sidebar.jsx (Admin & Support sections)
  - [x] Enhanced FloorPlanManager.jsx with parallel multi-floor discovery for levels [-1, 1, 2, 3, 4]
  - [x] Resolved Leaflet.Toolbar2 and leaflet-distortableimage runtime exception (TypeError: Cannot read properties of undefined reading 'Action')
  - [x] Suppressed Unsplash stock photos in LiveOverwatchMap.jsx and cleared DB image_url columns
  - [x] Deployed client bundle to VPS and verified live end-to-end via CDP (login, dashboard, modal, floor plan manager)
- [x] Phase 6: Guard Authentication Expiration & Telemetry Reconnection Fix (2026-09-14)
  - [x] Resolved "Not authorized, token failed" crash: upgraded authController.js JWT expiry from 15m to 30d for mobile/guard logins, and 24h for web sessions
  - [x] Deployed authController.js to VPS and restarted PM2 wolf-hms-api; verified live token lifetime (30 days for guard_kumar, 24h for admin)
  - [x] Added x-client-type: 'mobile' header and 401 response interceptor in wgm/src/services/api.js
  - [x] Upgraded wgm/src/context/AuthContext.js with isTokenExpired() auto-purge and clientType: 'mobile' login payload
  - [x] Recompiled Wolf Guard Mobile Release APK (143.5 MB) and delivered to Desktop/WolfGuard.apk
- [ ] Fix `pingAllGuards` — still references `gl.last_update` (should be `gl."timestamp"`)

### Pharmacy

- [ ] Full stock population: 50 Indian essential medicines for hospital_id = 1

### Dashboard Polish

- [ ] Verify clean rendering: /ward, /lab, /pharmacy dashboards
- [ ] Fix any console errors on dashboard load

## ❌ Not Started

### Deployment & DevOps

- [x] Fix SSH access to VPS — password auth via ssh2 Node.js library (2026-09-08)
- [ ] Fix GitHub token for git push
- [x] Set up CI gate (.github/workflows/ci.yml automated backend, frontend, mobile syntax checks) (2026-09-16)
- [ ] Set up CD deployment pipeline (GitHub Actions or Coolify webhooks to VPS)
- [ ] Create staging environment

### Mobile Apps

- [ ] Wolf Care App — Android APK build & deployment
- [x] Wolf Guard Mobile (WGM) — APK builds, WebView fixed, cleartext enabled, bio-lock disabled
- [x] WGM — Production login test (verified guard_kumar / Guard@123 on production API 2026-09-12)
- [x] WGM — Native Font Resolution & Tier-1 Enterprise Overhaul (2026-09-12)
  - [x] Native Font Packaging: Root cause fixed; 21 font TTFs copied to `android/app/src/main/assets/fonts/` with 3 aliases (`MaterialCommunityIcons.ttf`, `material-community.ttf`, `Material Design Icons.ttf`); `sourceSets` assets hook added to `build.gradle`
  - [x] TacticalIcon SVG Engine: Pure SVG vector icons for all mission critical badges, buttons, and navigation, eliminating blank font tofu boxes permanently
  - [x] Tactical Obsidian Theme: High-tech palette (`#080C14` canvas, `#0F172A` surfaceL1, `#162032` surfaceL2, `#1E293B` elevated) with 1px precision glass borders and high-contrast duty accents (Industrial Amber, Tactical Cyan, Executive Violet)
  - [x] Duty Assignment Terminal: Officer clearance identity card (`Officer Kumar • ID: WG-014 • LEVEL-2 HIGH-SEC`), capability pills, illuminated icon pedestals, and deploy triggers
  - [x] Mission Operations HUD: Telemetry strip (battery, torch, GPS fix), cyber command card, 2x2 Tactical Action Matrix with high-contrast subtitles, shift event timeline, and floating emergency SOS beacon
  - [x] Release Build & Desktop Delivery: Built via `assembleRelease` in `C:\wgm`, verified `assets/fonts/*.ttf` in APK, delivered to `Desktop/WolfGuard.apk` (143.5 MB)
- [ ] Wolf Ultimate — APK build

### Frontend

- [ ] Full frontend redesign/polish
- [ ] Dark mode verification across all 110+ pages
- [ ] Responsive design audit for tablet/mobile web

### Clinical Modules (Feature Completion)

- [ ] CPOE workflow end-to-end testing
- [ ] eMAR barcode scanning integration
- [ ] Blood bank ISBT 128 scanner testing
- [ ] Radiology DICOM viewer (OHIF) integration testing
- [ ] Telehealth video call stability testing
- [ ] AI Clinical CoPilot tuning with Gemini API

### Compliance

- [ ] NABH certification checklist validation
- [ ] HIPAA compliance audit
- [ ] DPDP (Data Protection) compliance
- [ ] ABDM health ID integration testing

### Backend

- [x] Automated test suite creation — Phase 1 complete (35 backend unit/contract tests, 16 frontend tests) (2026-09-16)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Redis caching layer activation
- [ ] Rate limiting fine-tuning for production

## 🐛 Known Bugs

| Bug                                         | Severity        | Status                  | Root Cause                                                                   |
| ------------------------------------------- | --------------- | ----------------------- | ---------------------------------------------------------------------------- |
| Emergency always shows CODE_BLUE            | 🔴 Critical     | Fix ready, not deployed | VPS controller reads wrong field                                             |
| Emergency banner requires page refresh      | 🔴 Critical     | Fix ready, not deployed | No Socket.IO emit in old code                                                |
| No responder list shown after alert         | 🟡 Medium       | DB done, UI not built   | Frontend component missing                                                   |
| `pingAllGuards` references `gl.last_update` | 🟡 Medium       | Not fixed               | Same column mismatch as old getOnlineGuards                                  |
| Git push fails                              | 🟡 Medium       | Not fixed               | GitHub token expired                                                         |
| ~~SSH to VPS rejected~~                     | ~~🔴 Critical~~ | ✅ RESOLVED             | Password auth via ssh2 (2026-09-08)                                          |
| WGM fake SOS button                         | 🔴 Critical     | Not fixed               | Calls no API, just shows alert                                               |
| WGM fake Patrol Start/Stop                  | 🟡 Medium       | Not fixed               | Writes to local array only                                                   |
| ~~WGM 3 competing themes~~                  | ~~🟡 Medium~~   | ✅ FIXED (P1)           | ThemeContext now dark-only; token system single source of truth (2026-09-11) |

### Agent Infrastructure (2026-09-08)

- [x] AGENTS.md rewritten — secrets scrubbed, review checklist, rules/skills indexed
- [x] 5 rules created in `.agents/rules/`
- [x] 2 new skills created: `deployment`, `wolf-guard-mobile`
- [x] `techContext.md` secrets scrubbed
- [x] `.gitignore` null-byte corruption fixed, deduplicated
- [x] `VPS_CREDENTIALS.md` created (gitignored)
- [x] `coolify.pem` untracked from git (`git rm --cached`) + ignored via `*.pem` wildcard
- [x] `token.txt` (expired JWT) added to `.gitignore`
- [x] `activeContext.md` and `progress.md` updated

### VPS Hardening Migration Deployment (2026-09-17)

- [x] **301_rls_gapfill.sql** — ran but created 0 policies (outer `BEGIN;`/`COMMIT;` rollback)
- [x] **301v2_rls_gapfill.sql** — v1 had empty `table_name=''` guards (0 policies); fixed in 7fbb403 → 13 new policies (1297ms)
- [x] **301v3_rls_gapfill.sql** — 151 remaining gap tables → ✅ applied (1567ms), zero skipped
- [x] **302_refresh_tokens.sql** — ✅ applied (138ms)
- [x] **303v2_second_tenant_seed.sql** — ✅ applied (66ms): 4 users + 2 patients for hospital_id=2
- [x] **304_audit_integrity.sql** — ✅ applied: prev_hash + record_hash columns on audit_logs
- **RLS policy count on prod: 172** — 100% coverage of all hospital_id tables (gap query returns 0)
- **wolf DB role is SUPERUSER** — bypasses all RLS; write-isolation cannot be tested until role-split

### Deploy Session Final Verification (2026-09-17)

- [x] **Security Probe**: 5/5 PASS (exec-sql→404, debug/env→404, JWT iss/aud verified, CORS blocked, OPD queue→200)
- [x] **Smoke Load Test**: 50 VUs × 30s, 1739 requests, 0 failures, p95=237ms (<300ms), error rate=0.00% (<1%)

### Phase 7 Candidates (Future)

- [ ] **wolf_app role-split**: Create non-superuser `wolf_app` DB role for application connections; `wolf` superuser retained for migrations/admin only. Required for real RLS write-isolation enforcement. (`SELECT rolname, rolsuper FROM pg_roles WHERE rolname='wolf'` confirmed `rolsuper = true` on 2026-09-17)
- [ ] Re-run RLS isolation proof (write-hijack test 4e) after role-split to verify `ERROR: violates row-level security policy`

### Security Notes

- **`coolify.pem` is still in git history** (committed in `703fe3a`). The key is already non-functional (rejected by VPS, replaced with password auth). Decision: do NOT purge from history now (would rewrite all hashes). Purge after `git push` is restored, if needed.
- **Credential rotation**: VPS password (`nBRAR619`) was set via Hostinger panel reset. DB password (`password`) and SQL backdoor key are unchanged from initial setup. Consider rotating after `git push` is restored.

## 2026-09-17 — Deploy Session Complete
- VPS deployed at commit 6349ff1; PM2 wolf-hms-api online
- Migrations applied: 302 ✅ 303v2 ✅ 304 ✅ 301v2 (13 tables) + 301v3 (151 tables) = 172 policies total, zero gaps
- Fixed: blank response, unbounded retry storms, broken token exchange/history modes, ! line in .gitignore
- wolf DB role = SUPERUSER: RLS policies exist but enforcement deferred to Phase 7 wolf_app non-superuser role
- Pending: post-deploy-security.ps1 + k6 smoke (Step 5); GitHub push of d569718


## 2026-10-17 Galaxy Interaction Audit
- [x] `scripts/qa/audit-dead-buttons-and-kpis.js` (5 classes, line-accurate, JSON+MD emitters)
- [x] Reports: `plans/GALAXY_INTERACTION_AND_BUTTON_AUDIT.md`, `plans/dead-buttons-audit.json`
- [ ] P0: /icu FIX-1..FIX-4 (remove disabled guard on L440/L454, seed ICU admission, bind MAP/BP + add temp column, delete L438 leak)
- [ ] P0: write-side wiring for the 6 GET-only Table-A screens
- [ ] Wire or hide the 15 CLOSE_ONLY_MODAL screens + BloodBankDashboard phantom modal (L563)

## 2026-10-17 Wave-1 (done)
- [x] /icu end-to-end: migration 312, UUID-safe controller, quick-admit, 6 cards bound, leak removed (audit 0)
- [x] Table-A 7/7 BOUND with real POST/PUT/PATCH
- [x] Bucket-C write wiring: ambulance, comms, laundry, staff, assets, quality, pathways
- [x] TECH_LEAK 0
- [ ] Remaining Class-1 dead buttons (102) across CPOE/CDI/Radiology/BedTransfer/COPE dashboards
- [ ] 36 STATIC_JSX_KPI literals outside /icu
