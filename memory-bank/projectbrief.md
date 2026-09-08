# WOLF HMS — Project Brief

## What is WOLF HMS?
WOLF HMS is an enterprise-grade, multi-tenant Hospital Management System (HMS) built for Indian healthcare facilities. It covers the full operational lifecycle of a hospital — from patient registration at the reception desk, through clinical care in OPD/IPD/ICU/OT, to final billing, insurance claims, and discharge.

## Product Suite (7 Products)

### 1. WOLF HMS Web Dashboard (React SPA)
- **Tech**: React 18 + Vite + Ant Design
- **Location**: `client/`
- **Pages**: 110+ pages (OPD, IPD, Lab, Pharmacy, Blood Bank, Radiology, Emergency, Ward, OT, PACU, ICU, Billing, Finance, Insurance, Housekeeping, Dietary, Parking, Mortuary, Ambulance, Security, CSSD, Telehealth, POS, Analytics, NABH, HIPAA, FHIR, etc.)
- **Components**: 240+ reusable components across 21 directories
- **Client Services**: 16 API service modules (auth, admin, AI, bloodBank, clinical, finance, govtScheme, lab, nurse, opd, pharmacy, security, socket, telemetry, ward)

### 2. WOLF Ultimate (Staff Super-App — React Native/Expo)
- **Tech**: React Native + Expo + TypeScript
- **Location**: `wolf-ultimate/`
- **Role-based navigation**: 10 role stacks (Doctor, Nurse, Pharmacist, Lab, Radiology, Reception, RMO, Physio, Diet, CSSD, Biomed, HIM, BloodBank)
- **Screens**: 180+ screens covering every clinical and admin workflow
- **Services**: 30+ TypeScript service modules (doctor, nurse, lab, pharmacy, radiology, bloodBank, billing, clinical, medication, carePlan, diet, CSSD, insurance, physio, ward, OT, emergency, prescription, vitals, IO chart, IV, pain, medRecords, communication, roster, specialty, support, network, offline, notification)

### 3. Wolf Guard Mobile (WGM — Security App — React Native/Expo)
- **Tech**: React Native + Expo + JavaScript
- **Location**: `wgm/`
- **Screens**: Login, Patrol, Parking, Dispatch, Visitors Entry, Vehicle Inspection, Incident Reporting, Comms, Logistics, Shift Handover, QR Scanner, Duty Selection, Profile
- **Services**: AI, Chat, Geofencing, Location tracking, Mapping, Security, Sensor, Socket, Voice, SOS hardware hook, HIPS (Hostile Intruder Protection System), Step Detection, Heading Estimation
- **Unique**: Neural animated background, spatial awareness, hardware SOS button integration

### 4. Wolf Care App (Patient-Facing — React Native/Expo)
- **Tech**: React Native + Expo + TypeScript (Expo Router)
- **Location**: `wolf-care-app/`
- **Screens**: Login (OTP), Appointments, Orders (home lab), Records, Profile, Video Call, Explore
- **Services**: API, Storage, Video Socket
- **Features**: Telehealth video calls, home lab booking, medical records access

### 5. Wolf Guard Mobile (Legacy Scaffold)
- **Location**: `wolf-guard-mobile/` (mostly empty scaffold, WGM above is the active version)

### 6. Wolf Staff Mobile (Placeholder)
- **Location**: `wolf-staff-mobile/` (empty, functionality absorbed into Wolf Ultimate)

### 7. Backend API Server (Node.js/Express Monolith)
- **Tech**: Node.js + Express + PostgreSQL + Socket.IO
- **Location**: `server/`
- **Entry points**: `server.js` (local), `server-cloud.js` (production, 66K lines)
- **Controllers**: 90+ controllers
- **Services**: 65+ services
- **Routes**: 120+ route files
- **Middleware**: 20 middleware modules
- **Migrations**: 168 SQL/JS migration files
- **Cron**: EOD ERP sync
- **Workers**: Background email worker
- **Queue**: Queue factory for async jobs
- **Events**: System event bus

## Business Scope
- Multi-tenant (multi-hospital) with `hospital_id` isolation on all tables
- Indian healthcare compliance: ABDM, PMJAY, eRaktKosh, NABH, DPDP
- Government scheme integration (Ayushman Bharat, PMJAY claims)
- HL7/FHIR interoperability
- Insurance/TPA claims processing
- ISBT 128 blood bank barcode parsing
- White-label SaaS capability
