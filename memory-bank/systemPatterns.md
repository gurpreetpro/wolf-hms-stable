# Architecture Patterns, Data Conventions & System Design

## Database Schema Conventions

### Primary Key Types (CRITICAL — Mismatches cause crashes)
| Table | PK Column | Type | Notes |
|-------|-----------|------|-------|
| `patients` | `id` | UUID | STRICT — never INTEGER |
| `admissions` | `id` | UUID | STRICT — never INTEGER |
| `hospitals` | `id` | INTEGER | Auto-increment |
| `users` | `id` | INTEGER | Auto-increment |
| `drugs` | `id` | INTEGER | Auto-increment |
| `pharmacy_inventory` | `id` | INTEGER | Auto-increment |
| `lab_parameters` | `id` | INTEGER | Auto-increment |
| `emergency_events` | `id` | SERIAL | Auto-increment |
| `emergency_logs` | `id` | SERIAL | Auto-increment |
| `blood_units` | `id` | INTEGER | Auto-increment |
| `hospital_buildings` | `id` | SERIAL | Auto-increment, building coordinates & floor count |
| `floor_plans` | `id` | SERIAL | Auto-increment, corners JSONB, walkable_graph JSONB |
| `floor_zones` | `id` | SERIAL | Auto-increment, polygon JSONB, risk_level, hospital_id |

### Multi-Tenancy
- Every major table has `hospital_id INTEGER` column
- Tenant isolation enforced at query level: `WHERE hospital_id = $1`
- Tenant resolver middleware: `server/middleware/tenantResolver.js`
- Row-Level Security (RLS): Partially implemented, not fully enforced
- Current production demo: `hospital_id = 1`

### Foreign Key Conventions
- Patient references: Always UUID (`patients.id`)
- User references: Always INTEGER (`users.id`)
- Hospital references: Always INTEGER (`hospitals.id`)
- Admission references: Always UUID (`admissions.id`)

## Backend Architecture

### Server Entry Points
- `server/server.js` — Local development entry (51K)
- `server/server-cloud.js` — Production entry (66K), used by PM2
- Both are monoliths that register all routes inline

### Controller-Service-Route Pattern
```
Request → Middleware → Route → Controller → Service → PostgreSQL
                                    ↓
                              Socket.IO emit (for real-time events)
```

### Middleware Stack (20 modules)
| Middleware | Purpose |
|-----------|---------|
| `authMiddleware.js` | JWT token verification, user extraction |
| `tenantResolver.js` | Extract hospital_id from JWT or request |
| `permissionMiddleware.js` | Role-based access control |
| `licenseMiddleware.js` | License key validation |
| `rateLimiter.js` | API rate limiting |
| `auditMiddleware.js` | Audit trail logging |
| `adminAudit.js` | Admin-specific audit logging |
| `auditLogger.js` | General audit log writer |
| `authCache.js` | Token/session caching |
| `cacheMiddleware.js` | Response caching |
| `errorHandler.js` | Global error handler |
| `gatewayMiddleware.js` | API gateway logic |
| `idempotency.js` | Idempotent request handling |
| `metricsMiddleware.js` | Performance metrics collection |
| `requestLogger.js` | Request/response logging |
| `security.js` | Security headers, CORS |
| `tenantUpload.js` | Tenant-scoped file uploads |
| `validateRequest.js` | Request body validation |
| `validation.js` | Schema validation |
| `validationMiddleware.js` | Input sanitization |

### All 90+ Controllers
**Core Clinical**: opdController, admissionController, emergencyController, nurseController, pharmacyController, labController, radiologyController, bloodBankController, clinicalController, vitalsController, bedController, wardController, dischargeController, transferController, carePlanController, prescriptionController, procedureController, problemListController

**Specialty**: dentalController, ophthalmologyController, orthopedicController, maternityController, physioController, icuController, otController, anaesthesiaController, pacController, pacuController, intraOpController, specialistController

**Billing/Finance**: financeController, chargesController, paymentController, posController, preauthController, insuranceController, tpaController, treatmentPackageController

**Admin/Infrastructure**: adminController, hospitalController, authController, settingsController, setupController, platformController, licenseController, schemaSyncController, adminRecoveryController, scaleController, appBuildController

**AI/Advanced**: aiController, aiBillingController, enterpriseAIController, alertController, automationController

**Support Services**: ambulanceController, housekeepingController, dietaryController, parkingController, mortuaryController, cssdController, equipmentController, instrumentController, logisticsController, deviceController, barcodeController, visitorController, wardPassController, securityController, chatController, mfaController, totpController, medicalRecordsController, patientMergeController, consentController, corporateController, transitionController, govtSchemeController, abdmController, syncController, rosterController, labOCRController, radiologyOrderController, doctorAnalyticsController, analyticsController, patientController, receptionController

### All 65+ Services
**Clinical**: clinicalService, MARService, LabService, lisService, BloodBankService, SpecialtyService

**AI Layer**: aiService, aiBillingEngine, ClinicalCoPilot, ClinicalSentinel, BloodBankAI, PredictiveAnalytics, SmartInventory, AIDataSteward, RiskCalculator

**Infrastructure**: authService, billingService, FinanceService, insuranceService, emailService, smsService, whatsappService, notificationService, fcmService, webhookService, paymentGateway, sessionService, tokenService

**Integration**: fhirService, HL7Receiver, abdmService, ERaktKoshService, EdiService, GoogleDriveService

**Monitoring**: HealthCheckService, MetricsCollector, OverwatchService, SelfHealingService, Logger, DatabaseRecovery

**Operations**: BackupService, ArchiveService, AuditService, FeatureFlagService, i18nService, locationService, prescriptionPdfService, themingService, WolfVoiceService

**Real-time**: socketHandler, videoSignaling, videoSocketHandler, messageRouter

**Security**: loginRateLimiter, LoginSecurityService, RemoteAccessService, CryptoUtils

**Data**: migration_service, MigrationService, masterDataCache, redisClient

### All 120+ Route Files
Routes follow naming convention: `{module}Routes.js`
Key non-obvious routes:
- `healthRoutes.js` — Contains the `exec-sql` backdoor endpoint
- `migration_routes.js` — Runtime migration execution
- `adminMigrationRoutes.js` — Admin migration panel
- `selfhealRoutes.js` — Self-healing database operations
- `overwatchRoutes.js` — System monitoring dashboard
- `vaultRoutes.js` — Secret/credential management
- `runnerRoutes.js` — Task runner execution
- `unifiedCartRoutes.js` — Multi-service billing cart
- `pmjayClaimRoutes.js` / `pmjayRateRoutes.js` — Government scheme claims

### Background Jobs
| File | Purpose |
|------|---------|
| `cron/eod_erp_sync.js` | End-of-day ERP synchronization |
| `workers/backgroundWorkers.js` | General background task processor |
| `workers/emailWorker.js` | Async email dispatch |
| `queue/queueFactory.js` | Job queue creation and management |
| `events/systemBus.js` | In-process event bus for decoupled communication |

### Utility Modules
| File | Purpose |
|------|---------|
| `utils/apiResponse.js` | Standardized API response wrapper |
| `utils/CryptoUtils.js` | Encryption/decryption helpers |
| `utils/ensureAdmins.js` | Boot-time admin user verification |
| `utils/ensureSchema.js` | Boot-time schema verification |
| `utils/errors.js` | Custom error classes |
| `utils/isbtParser.js` | ISBT 128 barcode parser (blood bank) |
| `utils/licenseUtil.js` | License key validation logic |
| `utils/logUtil.js` | Structured logging |
| `utils/masterDataCache.js` | In-memory cache for master data |
| `utils/responseHandler.js` | Response formatting |
| `utils/tenantHelper.js` | Tenant ID extraction helpers |

## Frontend Architecture

### React + Vite + Ant Design
- Build: `cd client && npm run build` → outputs to `client/dist/`
- Production: `dist/` contents copied to `server/public/`
- Routing: React Router (client-side)
- State: Component state + Context API (no Redux)
- HTTP: Axios with interceptors for auth headers
- Real-time: Socket.IO client (`client/src/services/socket.js`)
- Theme: Light/dark mode via ThemeToggle component
- Base Map Tiles: ESRI World Dark Gray Canvas (`esri_dark`) for tactical dark UI (zero watermarks, keyless)
- Georeferencing & Leaflet Distortable Image:
  - `leaflet-distortableimage` requires `L.Toolbar2.Action` from `leaflet-toolbar`.
  - Always import `leaflet-toolbar` before `leaflet-distortableimage` in `client/src/utils/leafletDistortable.js`.
  - Global `window.L = L` is explicitly exposed in `client/src/main.jsx`.
- Code-Splitting & Route Isolation:
  - Complex Leaflet GIS modules (e.g., `FloorPlanManager.jsx`, `FloorPlanStudioModal.jsx`) are dynamically loaded using `React.lazy()` and `<React.Suspense>`.
  - This guarantees Leaflet initialization or plugin evaluation issues never crash root/auth routes (`/login`).

### Component Directory Structure (21 directories)
| Directory | Purpose |
|-----------|---------|
| `admin/` | Admin panels, security studio |
| `ai/` | AI assistant, clinical AI components |
| `billing/` | Billing workspace, payment modals |
| `delivery/` | (Placeholder) |
| `design/` | Design system components |
| `finance/` | Finance reports, revenue charts |
| `insurance/` | Claims, preauth, PMJAY |
| `lab/` | Lab forms, reports, QC dashboard |
| `nursing/` | (Nursing-specific components) |
| `pac/` | Pre-admission clinic forms |
| `pos/` | Point-of-sale dashboard |
| `print/` | Print templates (invoices, certificates, prescriptions) |
| `radiology/` | Radiology OHIF viewer |
| `scc/` | Security command center |
| `security/` | Security settings, guard management |
| `settings/` | System settings modals |
| `support/` | Remote support components |
| `telemedicine/` | Video call components |
| `ui/` | Shared UI components |
| `ward/` | Ward-specific components (transfusion, blood) |
| `WolfMigrator/` | Database migration wizard |

## Contract-First Rule
CRITICAL: Never apply fallbacks or default variables without verifying the exact request payload keys from the frontend component. The emergency alert bug (3-month-old) was caused by the backend reading `req.body.type` while the frontend sent `req.body.code`.

## Socket.IO Events
| Event | Direction | Purpose |
|-------|-----------|---------|
| `emergency_broadcast` | Server → Client | Emergency alert triggered |
| `emergency_resolved` | Server → Client | Emergency alert resolved |
| `ward_update` | Server → Client | Ward bed/patient changes |
| `notification` | Server → Client | General notifications |
| `chat_message` | Bidirectional | Staff chat |
| `video_signal` | Bidirectional | WebRTC signaling |
