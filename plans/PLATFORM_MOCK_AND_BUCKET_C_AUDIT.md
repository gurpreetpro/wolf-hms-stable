# PLATFORM MOCK-DATA / "PHASE X" SUBTITLE / BUCKET C AUDIT

**Generated:** 2026-10-16T10:57:44.413Z  ·  **Mode:** READ-ONLY (no app controller or UI file was modified)
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
| **A — Disconnected** | **6** | mock UI + real backend already mounted |
| **B — Pure static mock** | **55** | mock UI, no backend twin yet |
| **C — Silent catch/state fallback** | **20** | API called, but fake data injected on failure/empty |
| **D — Bucket C "Module not enabled"** | **12** | intentionally-disabled modules |
| **E — Developer subtitle / mock wording** | **0** | visible "Phase N -- …"/"Mock"/"Demo Mode" text |
| Files with ≥1 finding | **92 / 377** | |

## Table A — Disconnected Screens (real backend exists, frontend uses mock data)

| File Path | URL Route in App.jsx | Hardcoded Mock Data Found | Existing Backend Route/Controller to Wire | Effort to Wire |
|---|---|---|---|---|
| `client/src/pages/POSTerminal.jsx` | /admin/pos | 4 hardcoded row array(s): currentQueue, todayTransactions, serviceModules · IDs: P-1045 · Names: Ramesh Gupta, Anil Mehta | mount `/api/pos` · `server/routes/posRoutes.js` · `server/controllers/posController.js` · 29 endpoints | Low |
| `client/src/pages/CloudBackupConsole.jsx` | /admin/cloud-backup | 4 hardcoded row array(s): backupHistory, schedule, drMetrics · static KPI: 90, 100%, 18 min | `server/routes/cloudBackupRoutes.js` · 10 endpoints | Low |
| `client/src/pages/ProblemListManager.jsx` | /admin/problem-list | 2 hardcoded row array(s): activeProblems, resolvedProblems · IDs: P-1045, P-1078, P-1067, P-998 · Names: Ramesh Gupta, Priya Sharma, Rajesh Kumar, Suresh Patel · static KPI: 8, 4, 3, 2 | `server/routes/problemListRoutes.js` · `server/controllers/problemListController.js` · 5 endpoints | Low |
| `client/src/pages/TelehealthConsole.jsx` | /admin/telehealth | 3 hardcoded row array(s): waitingRoom, todaySchedule, ePrescriptionDrugs · IDs: MRN-1045, MRN-1078, MRN-1056 · Names: Anita Desai, Rajesh Kumar, Priya Singh, Mohammed Ali | mount `/api/telehealth` · `server/routes/telehealthRoutes.js` · 4 endpoints | Low |
| `client/src/pages/WardPassManager.jsx` | /admin/ward-pass | 3 hardcoded row array(s): activePasses, returnedPasses, policies · IDs: P-1045, P-1023, P-1067, P-998 · Names: Ramesh Gupta, Priya Sharma, Suresh Patel, Meena Sharma · static KPI: 95% | `server/routes/wardPassRoutes.js` · `server/controllers/wardPassController.js` · 3 endpoints | Low |
| `client/src/pages/EarlyWarningScore.jsx` | /admin/ews | 2 hardcoded row array(s): patients, escalationProtocol · IDs: MRN-1023, MRN-1045, MRN-1078, MRN-1056 · Names: Anita Desai, Rajesh Kumar, Priya Singh, Suresh Menon | mount `/api/reviews` · 0 endpoints | Med |

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
| `client/src/components/ReferralNetwork.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): EXTERNAL_SPECIALISTS · Names: Rajesh Kumar, Dr. Priya | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/security/CCTVGrid.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): CAMERAS | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/security/dashboard/AlertSettingsModal.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): alertTypes, soundOptions | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/components/ui/TableToolbar.jsx` | (no route) | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): presets | CHILD COMPONENT (no route) — inline mock must come from its parent screen |
| `client/src/pages/AnatomicPathology.jsx` | /admin/pathology | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): cases, slides · Names: Dr. Sharma | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/AuditTrail.jsx` | /admin/audit-trail | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): auditEvents, userActivity · IDs: MRN-1045, MRN-1078, MRN-1067, INV-2210 · Names: Nurse Priya, Dr. Sharma, Dr. Patel, Dr. Reddy | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/AutoReorderEngine.jsx` | /admin/auto-reorder | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): inventory | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/BackupDisasterRecovery.jsx` | /admin/backup-dr | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): backups, drDrills, retentionPolicy | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/BedTransferManager.jsx` | /admin/bed-transfer | — (not in Sidebar/TopNav matcher) | 4 hardcoded row array(s): pendingTransfers, approvedTransfers, transferHistory · IDs: TRF-301, P-1045, TRF-302, P-1023 · Names: Ramesh Gupta, Priya Sharma, Rajesh Kumar, Suresh Patel · static KPI: 17, 18 min | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/CDIDashboard.jsx` | /admin/cdi | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): cdiQueries, gapAlerts · IDs: CDI-301, MRN-1045, CDI-302, MRN-1078 · Names: Anita Desai, Rajesh Kumar, Priya Singh, Suresh Menon | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ClinicalAIAssistant.jsx` | /admin/clinical-ai | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): quickActions, recentPatients · IDs: MRN-1045, MRN-1078, MRN-1023 · Names: Anita Desai, Rajesh Kumar, Suresh Menon, Dr. Sharma | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ClinicalNLP.jsx` | /admin/clinical-nlp | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): extractedEntities, suggestedCodes, qualityFlags | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ClinicalScalesDashboard.jsx` | /admin/clinical-scales | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): activeAssessments, scaleDefinitions, analytics · IDs: P-1045, P-1023, P-987, P-1067 · Names: Ramesh Gupta, Rajesh Kumar, Suresh Patel, Meena Sharma · static KPI: 4, 3, 142, 8 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ClosedLoopMedication.jsx` | /admin/closed-loop-med | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): medicationOrders · IDs: CLM-501, CLM-502, CLM-503, CLM-504 · Names: Anita Desai, Rajesh Kumar, Priya Singh, Suresh Menon · static KPI: 12 min, 18 min, 15 min, 1 min | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ConsentManagement.jsx` | /admin/consent-management | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): activeConsents, expiringConsents, consentTemplates · IDs: CON-301, MRN-1045, CON-302, MRN-1078 · Names: Anita Desai, Rajesh Kumar, Priya Singh, Suresh Menon | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/CPOEDashboard.jsx` | /admin/cpoe | — (not in Sidebar/TopNav matcher) | 4 hardcoded row array(s): pendingOrders, safetyChecks, orderSets · IDs: ORD-2401, MRN-1045, ORD-2402, MRN-1078 · Names: Anita Desai, Rajesh Kumar, Priya Singh, Suresh Menon | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/Credentialing.jsx` | /admin/credentialing | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): licenses, skillMatrix, privileges · Names: Anita Desai, Priya Sharma, Rajesh Kumar, Suresh Patel · static KPI: 100% | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/CreditDebitNotes.jsx` | /admin/credit-debit-notes | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): creditNotes, debitNotes · Names: Priya Sharma | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/DataPrivacy.jsx` | /admin/data-privacy | — (not in Sidebar/TopNav matcher) | 4 hardcoded row array(s): complianceFrameworks, anonymizationJobs, retentionPolicies · Names: Rajesh Kumar, Priya Singh | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/EMARDashboard.jsx` | /admin/emar | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): dueMedications, administeredMeds, prnMeds · IDs: MRN-1045, MRN-1078, MRN-1023, MRN-1056 · Names: Anita Desai, Rajesh Kumar, Priya Singh, Suresh Menon | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/HealthEducation.jsx` | /admin/health-education | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): educationContent, medicationGuides, wellnessPrograms · static KPI: 2,719, 4.7, 170 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/HIPAACompliance.jsx` | /admin/hipaa-compliance | — (not in Sidebar/TopNav matcher) | 4 hardcoded row array(s): categories, phiAccessLog, breachAlerts · IDs: MRN-1045, MRN-1078, MRN-1023, MRN-1067 · Names: Anita Desai, Rajesh Kumar, Suresh Menon, Mohammed Ali | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/HL7ADTFeed.jsx` | /admin/hl7-adt | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): liveFeed, subscribers, messageTypes · Names: Priya Sharma | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/IntegrationHub.jsx` | /admin/integration-hub | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): endpoints, apiGateway, webhooks · static KPI: 99.92%, 4 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/MultiPayerSplit.jsx` | /admin/multi-payer | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): splitBills · Names: Priya Sharma | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/MultiTenantAdmin.jsx` | /admin/multi-tenant | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): tenants, licenses, slaMetrics · static KPI: 100% | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/NABHCertification.jsx` | /admin/nabh | — (not in Sidebar/TopNav matcher) | 1 hardcoded row array(s): chapters | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PatientFeedback.jsx` | /admin/patient-feedback | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): recentFeedback, departmentScores, complaints · Names: Anita Desai, Rajesh Kumar, Priya Singh, Mohammed Ali · static KPI: 68% | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PatientPortal.jsx` | /admin/patient-portal | — (not in Sidebar/TopNav matcher) | 5 hardcoded row array(s): upcomingAppointments, recentReports, prescriptions · IDs: MRN-1045, INV-2201, INV-2198, INV-2210 · Names: Rajesh Kumar, Dr. Sharma, Dr. Patel, Dr. Reddy · static KPI: 3 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PatientSafetyDashboard.jsx` | /admin/patient-safety | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): incidents, rcaData · Names: Rajesh Kumar, Priya Singh, Suresh Menon, Mohammed Ali | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PayrollIntegration.jsx` | /admin/payroll | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): payroll, attendance · Names: Anita Desai, Priya Sharma, Rajesh Kumar, Suresh Patel | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PerformanceMonitoring.jsx` | /admin/performance | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): serverMetrics, apiPerformance, errorLog · static KPI: 99.97%, 9, 7 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PopulationHealth.jsx` | /admin/population-health | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): diseaseRegistry, careGaps, outcomesData | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/PredictiveAnalytics.jsx` | /admin/predictive-analytics | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): readmissionRisk, losPredictions, bedDemand | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/ProcurementDashboard.jsx` | /admin/procurement | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): purchaseOrders, vendors, grnList · IDs: INV-9087, INV-9080 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/RegulatoryReporting.jsx` | /admin/regulatory-reporting | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): nabhIndicators, jciStandards | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/RemotePatientMonitoring.jsx` | /admin/rpm | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): monitoredPatients, alertHistory · IDs: MRN-1045, MRN-1023, MRN-1078, MRN-1067 · Names: Anita Desai, Rajesh Kumar, Suresh Menon | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/RevenueCycleAI.jsx` | /admin/revenue-ai | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): denialPredictions, deniedClaims, leakageDetection · IDs: CLM-8801, CLM-8802, CLM-8803, CLM-8804 · Names: Anita Desai, Rajesh Kumar, Priya Singh, Suresh Menon | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/SmartScheduling.jsx` | /admin/smart-scheduling | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): scheduleSuggestions, noShowPredictions, doctorLoad · IDs: SS-01, SS-02, SS-03, SS-04 · Names: Anita Desai, Rajesh Kumar, Priya Singh, Mohammed Ali | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/SpecialistReferralManager.jsx` | /admin/specialist-referral | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): pendingReferrals, completedReferrals, specialists · IDs: P-1045, P-1078, P-1067, P-1012 · Names: Ramesh Gupta, Priya Sharma, Rajesh Kumar, Suresh Patel · static KPI: 1.2 hrs | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/StaffRoster.jsx` | /admin/staff-roster | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): todayRoster, leaveCalendar, overtime · Names: Anita Desai, Priya Sharma, Rajesh Kumar, Suresh Patel · static KPI: 245, 182, 12, 8 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/SystemConfiguration.jsx` | /admin/system-config | — (not in Sidebar/TopNav matcher) | 2 hardcoded row array(s): featureFlags, notifChannels | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/TPAProviderAdmin.jsx` | /admin/tpa-admin | — (not in Sidebar/TopNav matcher) | 4 hardcoded row array(s): providers, eligibilityChecks, pmjayBeneficiaries · IDs: P-1045, P-1078, P-987, P-1012 · Names: Ramesh Gupta, Suresh Patel · static KPI: 171, 94, 87% | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/TrainingCompetency.jsx` | /admin/training | — (not in Sidebar/TopNav matcher) | 4 hardcoded row array(s): cmeTracking, certifications, assessments · Names: Anita Desai, Priya Sharma, Rajesh Kumar, Suresh Patel · static KPI: 92%, 7, 91.4%, 5 | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/TransitionPlanner.jsx` | /admin/transition-planner | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): activePlans, readyForDischarge, dischargedToday · IDs: P-1045, P-1023, P-987, P-998 · Names: Ramesh Gupta, Suresh Patel, Meena Sharma, Dr. Priya | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/WhiteLabelSaaS.jsx` | /admin/white-label | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): tenants, plans, branding | HIDE from Sidebar for demo (no DB/controller) |
| `client/src/pages/WorkforceAnalytics.jsx` | /admin/workforce-analytics | — (not in Sidebar/TopNav matcher) | 3 hardcoded row array(s): utilization, attrition, productivity · static KPI: 89.8%, 2.5% | HIDE from Sidebar for demo (no DB/controller) |

## Table C — Silent catch-block / default-state Mock Fallbacks

| File Path | API Endpoint Called | Fake Data Injected in catch/useState | API status (local evidence; prod not probed) |
|---|---|---|---|
| `client/src/components/admin/SuperAdminDashboard.jsx` | /api/platform/health<br>/api/platform/tenants<br>/api/platform/usage | 1 catch block(s): \|\| [] fallback array | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/components/AdmissionModal.jsx` | /api/ward/wards<br>/api/admissions/available-beds<br>/api/admissions/admit | 1 catch block(s): setState(array literal) | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/components/AdvancedReportsDashboard.jsx` | /api/finance/reports/department-revenue<br>/api/finance/reports/payer-analysis<br>/api/finance/reports/revenue-trend | 1 catch block(s): mock wording | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/components/billing/AdvancePaymentModal.jsx` | /api/patients/search | 1 catch block(s): setState(array literal), \|\| [] fallback array | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/components/billing/NewInvoiceModal.jsx` | /api/insurance/providers<br>/api/patients/search<br>/api/finance/generate | 1 catch block(s): setState(array literal), \|\| [] fallback array | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/components/billing/PaymentConfirmationModal.jsx` | /api/pos/devices<br>/api/pos/payment/initiate<br>/api/pos/payment/${txnId}/status | 1 catch block(s): setState(array literal) | FAILED 500 (missing pos_devices.hospital_id + service arg-order bug) — FIXED locally in QA-P2 (migration 309) |
| `client/src/components/billing/RefundModal.jsx` | /api/finance/invoices | 1 catch block(s): setState(array literal), \|\| [] fallback array | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/components/DoctorReviewsPanel.jsx` | — | 1 catch block(s): \|\| [] fallback array | No explicit endpoint captured — inspect the catch source manually |
| `client/src/components/EligibilityVerification.jsx` | /api/preauth/patient/${patientId}/insurance<br>/api/preauth/providers<br>/api/preauth/verify-eligibility | 1 catch block(s): setState(array literal), mock wording | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/components/GovtSchemePanel.jsx` | — | 1 catch block(s): setState(array literal), \|\| [] fallback array | No explicit endpoint captured — inspect the catch source manually |
| `client/src/components/insurance/PMJAYProcedureManager.jsx` | — | 1 catch block(s): setState(array literal) | No explicit endpoint captured — inspect the catch source manually |
| `client/src/components/IPDLabOrderModal.jsx` | — | 1 catch block(s): setState(array literal) | No explicit endpoint captured — inspect the catch source manually |
| `client/src/components/PreauthDashboard.jsx` | /api/preauth/requests<br>/api/preauth/stats<br>/api/preauth/request/${selectedRequest.id}/status | 1 catch block(s): fake patient/staff name, setState(array literal), mock wording · names: Priya Singh | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/components/settings/TOTPVerify.jsx` | /api/2fa/login-verify | 1 catch block(s): setState(array literal) | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/components/ShiftHandoverReport.jsx` | /api/nurse/shift-handover<br>/api/nurse/handover/notes<br>/api/nurse/handover/notes/${patient.admission_id} | 1 catch block(s): setState(array literal) | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/pages/AdminRecoveryConsole.jsx` | /api/admin/recovery/stats<br>/api/admin/recovery/patients<br>/api/admin/recovery/audit-logs | 1 catch block(s): \|\| [] fallback array · 1 useState([...]) seed with object literals | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/pages/EmergencyCommandCenter.jsx` | /api/emergency/history<br>/api/emergency/config<br>/api/emergency/trigger | 1 catch block(s): setState(array literal) | FAILED 500 (missing emergency_logs columns) — FIXED locally in QA-P2 (migration 310) |
| `client/src/pages/InsuranceCommandCenter.jsx` | — | 1 catch block(s): setState(array literal) | No explicit endpoint captured — inspect the catch source manually |
| `client/src/pages/NeonatalDashboard.jsx` | /api/neonatal/babies<br>/api/neonatal/admit | 1 catch block(s): fake patient/staff name, setState(array literal) · names: Priya Sharma | Responds locally (2xx/4xx) — prod NOT probed (code freeze) |
| `client/src/pages/PriceApprovals.jsx` | /api/pharmacy/price-requests<br>/api/lab/requests<br>/api/ward/requests | 1 catch block(s): setState(array literal), \|\| [] fallback array | FAILS locally: 500 UNKNOWN (records/columns absent) — prod NOT probed (code freeze) |

## Table D — "Module not enabled" (Bucket C) inventory

| Component File | App.jsx URL | Unimplemented API Endpoint(s) | Still Showing Fake Data Below Badge? | Action Required |
|---|---|---|---|---|
| `client/src/components/OrderSetSelector.jsx` | (no route) | GET /api/order-sets<br>POST /api/order-sets/apply | no — badge is a pure neutral stub | WIRE existing `orderSetRoutes.js` (0 endpoints) — else create the missing table |
| `client/src/pages/AmbulanceDashboard.jsx` | /admin/ambulance | GET /api/ambulance/trips<br>GET /api/ambulance/vehicles | YES — Names: Priya Sharma, Rajesh Kumar | WIRE existing `ambulanceController.js` (0 endpoints) — else create the missing table |
| `client/src/pages/AssetDashboard.jsx` | /admin/assets | GET /api/assets | no — badge is a pure neutral stub | NO BACKEND for "assets" — HIDE the sidebar/nav link for the demo |
| `client/src/pages/CommsDashboard.jsx` | /admin/communications | GET /api/communications | no — badge is a pure neutral stub | NO BACKEND for "communications" — HIDE the sidebar/nav link for the demo |
| `client/src/pages/InfectionControlDashboard.jsx` | /admin/infection-control | POST /api/infection-control/report | YES — 4 useState([...]) mock seed(s) | NO BACKEND for "infectioncontrol" — HIDE the sidebar/nav link for the demo |
| `client/src/pages/LaundryDashboard.jsx` | /admin/laundry | GET /api/laundry/orders | YES — 1 hardcoded row array(s): mock | NO BACKEND for "laundry" — HIDE the sidebar/nav link for the demo |
| `client/src/pages/NeonatalDashboard.jsx` | /admin/neonatal | POST /api/neonatal/admit<br>GET /api/neonatal/babies | no — badge is a pure neutral stub | NO BACKEND for "neonatal" — HIDE the sidebar/nav link for the demo |
| `client/src/pages/OTDashboard.jsx` | /ot | POST /api/pre-op/assessment | no — badge is a pure neutral stub | NO BACKEND for "preop" — HIDE the sidebar/nav link for the demo |
| `client/src/pages/PriorAuthDashboard.jsx` | /admin/prior-auth | POST /api/prior-auth/submit | YES — 1 useState([...]) mock seed(s) | NO BACKEND for "priorauth" — HIDE the sidebar/nav link for the demo |
| `client/src/pages/QualityDashboard.jsx` | /admin/quality | GET /api/quality/checklist<br>GET /api/quality/metrics | no — badge is a pure neutral stub | NO BACKEND for "quality" — HIDE the sidebar/nav link for the demo |
| `client/src/pages/StaffSchedulingDashboard.jsx` | /admin/staff-scheduling | GET /api/staff/roster<br>GET /api/staff/shifts | no — badge is a pure neutral stub | NO BACKEND for "staffscheduling" — HIDE the sidebar/nav link for the demo |
| `client/src/pages/WasteManagementDashboard.jsx` | /admin/waste | GET /api/waste/daily-log<br>POST /api/waste/log<br>GET /api/waste/stats | YES — 1 hardcoded row array(s): WASTE_CATEGORIES | NO BACKEND for "waste" — HIDE the sidebar/nav link for the demo |

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
