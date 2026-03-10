import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { HospitalProfileProvider } from './contexts/HospitalProfileContext';
import { SystemStatusProvider } from './contexts/SystemStatusContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import SecuritySetup from './pages/SecuritySetup';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import OPDReception from './pages/OPDReception';
import QueueDisplay from './pages/QueueDisplay';
import DoctorDashboard from './pages/DoctorDashboard';
import WardDashboard from './pages/WardDashboard';
import LabDashboard from './pages/LabDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import RadiologyDashboard from './pages/RadiologyDashboard';
import AnaesthesiaDashboard from './pages/AnaesthesiaDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import BillingDashboard from './pages/BillingDashboard';
import AdminSettings from './pages/AdminSettings';
import StaffManagement from './pages/StaffManagement';
import AIDemoPage from './pages/AIDemoPage';
import DemoPage from './pages/DemoPage';
import Activation from './pages/Activation';
import WardManagement from './pages/WardManagement';
import PriceApprovals from './pages/PriceApprovals';
import EquipmentApprovals from './pages/EquipmentApprovals';
import AppointmentsPage from './pages/AppointmentsPage';
import PublicReportView from './pages/PublicReportView';
import ProtectedRoute from './components/ProtectedRoute';
import OTDashboard from './pages/OTDashboard';
import PACDashboard from './pages/PACDashboard';
import CSSDDashboard from './pages/CSSDDashboard';
import AnaesthesiaConsole from './pages/AnaesthesiaConsole';
import PACUDashboard from './pages/PACUDashboard';
import BloodBankDashboard from './pages/BloodBankDashboard';
import MortuaryDashboard from './pages/MortuaryDashboard';
import HousekeepingDashboard from './pages/HousekeepingDashboard';
import DietaryDashboard from './pages/DietaryDashboard'; // Phase 2
// import SecurityDashboard from './pages/SecurityDashboard'; // DELETED - Legacy
// import SecurityCommandCenter from './pages/SecurityCommandCenter'; // DELETED - Legacy
import VisitorManagement from './pages/VisitorManagement'; // Phase 2 Overwatch
// import SecurityCockpit from './pages/SecurityCockpit'; // DELETED - Replaced by GuardCommandCentre
import GuardCommandCentre from './pages/GuardCommandCentre'; // Phase 7 - Redesigned for Indian Operators
import SuperAdminPage from './pages/SuperAdminPage'; // Developer Dashboard
import MasterDomainLanding from './pages/MasterDomainLanding'; // Master Domain
import AdminRecoveryConsole from './pages/AdminRecoveryConsole'; // Admin Recovery Console (DPDP Compliant)
import DoctorReviewsPanel from './components/DoctorReviewsPanel'; // Wolf Care Reviews
import ArticlesManager from './components/ArticlesManager'; // Wolf Care Health Articles
import HomeCollectionDashboard from './components/HomeCollectionDashboard'; // Wolf Care Home Lab
import ErrorBoundary from './components/ErrorBoundary';
import PlatformDashboard from './pages/PlatformDashboard'; // Platform Control Plane
import NotificationToast from './components/NotificationToast'; // Real-time notifications
import ServiceUnavailable from './pages/ServiceUnavailable';
import QualityDashboard from './pages/QualityDashboard';
import WasteManagementDashboard from './pages/WasteManagementDashboard';
import AdvancedReportsDashboard from './components/AdvancedReportsDashboard';
import NeonatalDashboard from './pages/NeonatalDashboard';
import AmbulanceDashboard from './pages/AmbulanceDashboard';
import LaundryDashboard from './pages/LaundryDashboard';
import StaffSchedulingDashboard from './pages/StaffSchedulingDashboard';
import AssetDashboard from './pages/AssetDashboard';
import CommsDashboard from './pages/CommsDashboard';
import ClinicalPathwaysDashboard from './pages/ClinicalPathwaysDashboard';
import InfectionControlDashboard from './pages/InfectionControlDashboard';
import FHIRExplorer from './pages/FHIRExplorer';

// Phase 2: Revenue & Clinical AI
import PriorAuthDashboard from './pages/PriorAuthDashboard';
import ProcurementDashboard from './pages/ProcurementDashboard';
import AutoReorderEngine from './pages/AutoReorderEngine';

// Phase 3: Advanced Analytics & Operations
import PredictiveAnalytics from './pages/PredictiveAnalytics';
import PopulationHealth from './pages/PopulationHealth';
import AnatomicPathology from './pages/AnatomicPathology';

// Phase 4: Enterprise Polish
import CreditDebitNotes from './pages/CreditDebitNotes';
import MultiPayerSplit from './pages/MultiPayerSplit';
import HL7ADTFeed from './pages/HL7ADTFeed';
import NABHCertification from './pages/NABHCertification';
import WhiteLabelSaaS from './pages/WhiteLabelSaaS';
// Wolf Vault - Beyond Gold Insurance Architecture
import InsuranceVault from './pages/admin/InsuranceVault';
import InsuranceCommandCenter from './pages/InsuranceCommandCenter';
import MigratorWizard from './components/WolfMigrator/MigratorWizard'; // [NEW] Vampire Migration Tool

// Phase 5 - Location & Delivery Tracking
import RouteReplay from './components/delivery/RouteReplay';
import StaffLocationDashboard from './components/delivery/StaffLocationDashboard';

// Phase 6: Clinical Depth (S-Tier)
import CPOEDashboard from './pages/CPOEDashboard';
import CDIDashboard from './pages/CDIDashboard';
import PatientSafetyDashboard from './pages/PatientSafetyDashboard';
import EMARDashboard from './pages/EMARDashboard';
import ClosedLoopMedication from './pages/ClosedLoopMedication';

// Phase 7: AI & Intelligence Layer (S-Tier)
import ClinicalAIAssistant from './pages/ClinicalAIAssistant';
import SmartScheduling from './pages/SmartScheduling';
import EarlyWarningScore from './pages/EarlyWarningScore';
import RevenueCycleAI from './pages/RevenueCycleAI';
import ClinicalNLP from './pages/ClinicalNLP';

// Phase 8: Patient Engagement & Telehealth (S-Tier)
import PatientPortal from './pages/PatientPortal';
import TelehealthConsole from './pages/TelehealthConsole';
import PatientFeedback from './pages/PatientFeedback';
import HealthEducation from './pages/HealthEducation';
import RemotePatientMonitoring from './pages/RemotePatientMonitoring';

// Phase 9: Compliance, Governance & Audit (S-Tier)
import HIPAACompliance from './pages/HIPAACompliance';
import AuditTrail from './pages/AuditTrail';
import ConsentManagement from './pages/ConsentManagement';
import RegulatoryReporting from './pages/RegulatoryReporting';
import DataPrivacy from './pages/DataPrivacy';

// Phase 10: Infrastructure, DevOps & Platform Administration (S-Tier)
import SystemConfiguration from './pages/SystemConfiguration';
import IntegrationHub from './pages/IntegrationHub';
import BackupDisasterRecovery from './pages/BackupDisasterRecovery';
import PerformanceMonitoring from './pages/PerformanceMonitoring';
import MultiTenantAdmin from './pages/MultiTenantAdmin';

// Phase 11: Staff, HR & Workforce Management (S-Tier)
import StaffRoster from './pages/StaffRoster';
import Credentialing from './pages/Credentialing';
import TrainingCompetency from './pages/TrainingCompetency';
import PayrollIntegration from './pages/PayrollIntegration';
import WorkforceAnalytics from './pages/WorkforceAnalytics';

// Phase 12: Critical Backend Gap Closure (Deep Scan Audit Fix)
import EmergencyCommandCenter from './pages/EmergencyCommandCenter';
import BedTransferManager from './pages/BedTransferManager';
import TreatmentPackageManager from './pages/TreatmentPackageManager';
import TPAProviderAdmin from './pages/TPAProviderAdmin';
import CloudBackupConsole from './pages/CloudBackupConsole';

// Phase 13: Remaining Gap Closure (Deep Scan Audit — Medium + Low)
import AutomationDashboard from './components/AutomationDashboard';
import SpecialistReferralManager from './pages/SpecialistReferralManager';
import ClinicalScalesDashboard from './pages/ClinicalScalesDashboard';
import POSTerminal from './pages/POSTerminal';
import ProblemListManager from './pages/ProblemListManager';
import TransitionPlanner from './pages/TransitionPlanner';
import WardPassManager from './pages/WardPassManager';

function App() {
  return (
    <ThemeProvider>
      <HospitalProfileProvider>
        <SystemStatusProvider>
        <ErrorBoundary>
          {/* Global Real-time Notification Toast */}
          <NotificationToast maxNotifications={5} autoDismiss={8000} />
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/security-setup" element={<SecuritySetup />} />
              <Route path="/activate" element={<Activation />} />
              <Route path="/activated" element={<Activation />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/service-unavailable" element={<ServiceUnavailable />} />
              
              {/* Developer Portal - Master Domain Landing */}
              <Route path="/developer" element={<MasterDomainLanding />} />
              {/* Public Lab Report Access (No Login) */}
              <Route path="/report/:token" element={<PublicReportView />} />

              {/* SaaS Platform Control Plane - Super Admin Only */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'administrator', 'platform_admin']} />}>
                  <Route path="/platform" element={<PlatformDashboard />} />
              </Route>

              {/* ============================================== */}
              {/* ROLE-BASED ACCESS CONTROL (RBAC) - Phase 1    */}
              {/* ============================================== */}

              {/* Common routes - Any authenticated user */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<DashboardHome />} />
                  <Route path="/queue-display" element={<QueueDisplay />} />
                  <Route path="/ai-demo" element={<AIDemoPage />} />
                </Route>
              </Route>

              {/* Reception/OPD - receptionist, admin */}
              <Route element={<ProtectedRoute allowedRoles={['receptionist', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/opd" element={<OPDReception />} />
                  <Route path="/patients" element={<OPDReception />} />
                  <Route path="/appointments" element={<AppointmentsPage />} />
                </Route>
              </Route>

              {/* Doctor Dashboard - doctor, admin */}
              <Route element={<ProtectedRoute allowedRoles={['doctor', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/doctor" element={<DoctorDashboard />} />
                </Route>
              </Route>

              {/* Ward/Nursing Clinical - nurse, ward_incharge, doctor, admin */}
              <Route element={<ProtectedRoute allowedRoles={['nurse', 'ward_incharge', 'doctor', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/ward" element={<WardDashboard />} />
                  <Route path="/ward/:wardId" element={<WardDashboard />} />
                </Route>
              </Route>

              {/* Ward Management - In-Charge Only */}
              <Route element={<ProtectedRoute allowedRoles={['ward_incharge', 'doctor', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/ward-management" element={<WardManagement />} />
                </Route>
              </Route>

              {/* Lab Dashboard - lab_tech, admin */}
              <Route element={<ProtectedRoute allowedRoles={['lab_tech', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/lab" element={<LabDashboard />} />
                </Route>
              </Route>

              {/* Pharmacy - pharmacist, admin */}
              <Route element={<ProtectedRoute allowedRoles={['pharmacist', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/pharmacy" element={<PharmacyDashboard />} />
                </Route>
              </Route>

              {/* Radiology - radiology_tech, lab_tech, admin */}
              <Route element={<ProtectedRoute allowedRoles={['radiology_tech', 'lab_tech', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/radiology" element={<RadiologyDashboard />} />
                </Route>
              </Route>

              {/* Blood Bank - blood_bank_tech, lab_tech, admin */}
              <Route element={<ProtectedRoute allowedRoles={['blood_bank_tech', 'lab_tech', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/blood-bank" element={<BloodBankDashboard />} />
                </Route>
              </Route>

              {/* Anaesthesia - anaesthetist, doctor, admin */}
              <Route element={<ProtectedRoute allowedRoles={['anaesthetist', 'doctor', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/anaesthesia" element={<AnaesthesiaDashboard />} />
                </Route>
              </Route>

              {/* OT Management - surgeon, doctor, nurse, admin (Phase 10) */}
              <Route element={<ProtectedRoute allowedRoles={['surgeon', 'doctor', 'nurse', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/ot" element={<OTDashboard />} />
                  <Route path="/pac" element={<PACDashboard />} />
                  <Route path="/cssd" element={<CSSDDashboard />} />
                  <Route path="/anaesthesia-console" element={<AnaesthesiaConsole />} />
                  <Route path="/pacu" element={<PACUDashboard />} />
                </Route>
              </Route>

              {/* Finance/Billing - billing, accountant, admin */}
              <Route element={<ProtectedRoute allowedRoles={['billing', 'accountant', 'receptionist', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/finance" element={<FinanceDashboard />} />
                  <Route path="/billing" element={<BillingDashboard />} />
                  <Route path="/insurance" element={<InsuranceCommandCenter />} />
                  <Route path="/insurance/claims" element={<InsuranceCommandCenter />} />
                </Route>
              </Route>

              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>

                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/staff" element={<StaffManagement />} />
                  <Route path="/admin/prices" element={<PriceApprovals />} />
                  <Route path="/admin/equipment" element={<EquipmentApprovals />} />
                  <Route path="/admin/wards" element={<WardManagement />} />
                  <Route path="/admin/recovery" element={<AdminRecoveryConsole />} />
                  <Route path="/admin/migration" element={<MigratorWizard />} />
                  <Route path="/settings" element={<AdminSettings />} />
                  <Route path="/admin/mortuary" element={<MortuaryDashboard />} />
                  <Route path="/admin/reviews" element={<DoctorReviewsPanel />} />
                  <Route path="/admin/articles" element={<ArticlesManager />} />
                  <Route path="/admin/home-lab" element={<HomeCollectionDashboard />} />
                  <Route path="/admin/vault" element={<InsuranceVault />} />
                  <Route path="/admin/insurance" element={<InsuranceVault />} />
                  {/* Phase 5 - Delivery & Location Tracking */}
                  <Route path="/admin/route-replay" element={<RouteReplay />} />
                  <Route path="/admin/staff-locations" element={<StaffLocationDashboard />} />
                  {/* Wave 1 Compliance */}
                  <Route path="/admin/quality" element={<QualityDashboard />} />
                  <Route path="/admin/waste" element={<WasteManagementDashboard />} />
                  {/* Wave 2 Reports */}
                  <Route path="/admin/reports" element={<AdvancedReportsDashboard />} />
                  {/* Wave 3 Neonatal */}
                  <Route path="/admin/neonatal" element={<NeonatalDashboard />} />
                  {/* Wave 4 Operations */}
                  <Route path="/admin/ambulance" element={<AmbulanceDashboard />} />
                  <Route path="/admin/dietary" element={<DietaryDashboard />} />
                  <Route path="/admin/laundry" element={<LaundryDashboard />} />
                  <Route path="/admin/mortuary" element={<MortuaryDashboard />} />
                  {/* Wave 5 Support Services */}
                  <Route path="/admin/visitors" element={<VisitorManagement />} />
                  <Route path="/admin/staff-scheduling" element={<StaffSchedulingDashboard />} />
                  <Route path="/admin/assets" element={<AssetDashboard />} />
                  <Route path="/admin/communications" element={<CommsDashboard />} />
                  <Route path="/admin/clinical-pathways" element={<ClinicalPathwaysDashboard />} />
                  {/* Phase 1: A-Tier Upgrade */}
                  <Route path="/admin/infection-control" element={<InfectionControlDashboard />} />
                  <Route path="/admin/fhir" element={<FHIRExplorer />} />
                  {/* Phase 2: Revenue & Clinical AI */}
                  <Route path="/admin/prior-auth" element={<PriorAuthDashboard />} />
                  <Route path="/admin/procurement" element={<ProcurementDashboard />} />
                  <Route path="/admin/auto-reorder" element={<AutoReorderEngine />} />
                  {/* Phase 3: Advanced Analytics & Operations */}
                  <Route path="/admin/predictive-analytics" element={<PredictiveAnalytics />} />
                  <Route path="/admin/population-health" element={<PopulationHealth />} />
                  <Route path="/admin/pathology" element={<AnatomicPathology />} />
                  {/* Phase 4: Enterprise Polish */}
                  <Route path="/admin/credit-debit-notes" element={<CreditDebitNotes />} />
                  <Route path="/admin/multi-payer" element={<MultiPayerSplit />} />
                  <Route path="/admin/hl7-adt" element={<HL7ADTFeed />} />
                  <Route path="/admin/nabh" element={<NABHCertification />} />
                  <Route path="/admin/white-label" element={<WhiteLabelSaaS />} />
                  {/* Phase 6: Clinical Depth (S-Tier) */}
                  <Route path="/admin/cpoe" element={<CPOEDashboard />} />
                  <Route path="/admin/cdi" element={<CDIDashboard />} />
                  <Route path="/admin/patient-safety" element={<PatientSafetyDashboard />} />
                  <Route path="/admin/emar" element={<EMARDashboard />} />
                  <Route path="/admin/closed-loop-med" element={<ClosedLoopMedication />} />
                  {/* Phase 7: AI & Intelligence Layer (S-Tier) */}
                  <Route path="/admin/clinical-ai" element={<ClinicalAIAssistant />} />
                  <Route path="/admin/smart-scheduling" element={<SmartScheduling />} />
                  <Route path="/admin/ews" element={<EarlyWarningScore />} />
                  <Route path="/admin/revenue-ai" element={<RevenueCycleAI />} />
                  <Route path="/admin/clinical-nlp" element={<ClinicalNLP />} />
                  {/* Phase 8: Patient Engagement & Telehealth (S-Tier) */}
                  <Route path="/admin/patient-portal" element={<PatientPortal />} />
                  <Route path="/admin/telehealth" element={<TelehealthConsole />} />
                  <Route path="/admin/patient-feedback" element={<PatientFeedback />} />
                  <Route path="/admin/health-education" element={<HealthEducation />} />
                  <Route path="/admin/rpm" element={<RemotePatientMonitoring />} />
                  {/* Phase 9: Compliance, Governance & Audit (S-Tier) */}
                  <Route path="/admin/hipaa-compliance" element={<HIPAACompliance />} />
                  <Route path="/admin/audit-trail" element={<AuditTrail />} />
                  <Route path="/admin/consent-management" element={<ConsentManagement />} />
                  <Route path="/admin/regulatory-reporting" element={<RegulatoryReporting />} />
                  <Route path="/admin/data-privacy" element={<DataPrivacy />} />
                  {/* Phase 10: Infrastructure, DevOps & Platform (S-Tier) */}
                  <Route path="/admin/system-config" element={<SystemConfiguration />} />
                  <Route path="/admin/integration-hub" element={<IntegrationHub />} />
                  <Route path="/admin/backup-dr" element={<BackupDisasterRecovery />} />
                  <Route path="/admin/performance" element={<PerformanceMonitoring />} />
                  <Route path="/admin/multi-tenant" element={<MultiTenantAdmin />} />
                  {/* Phase 11: Staff, HR & Workforce Management (S-Tier) */}
                  <Route path="/admin/staff-roster" element={<StaffRoster />} />
                  <Route path="/admin/credentialing" element={<Credentialing />} />
                  <Route path="/admin/training" element={<TrainingCompetency />} />
                  <Route path="/admin/payroll" element={<PayrollIntegration />} />
                  <Route path="/admin/workforce-analytics" element={<WorkforceAnalytics />} />
                  {/* Phase 12: Critical Backend Gap Closure (Deep Scan Audit Fix) */}
                  <Route path="/admin/emergency" element={<EmergencyCommandCenter />} />
                  <Route path="/admin/bed-transfer" element={<BedTransferManager />} />
                  <Route path="/admin/treatment-packages" element={<TreatmentPackageManager />} />
                  <Route path="/admin/tpa-admin" element={<TPAProviderAdmin />} />
                  <Route path="/admin/cloud-backup" element={<CloudBackupConsole />} />
                  {/* Phase 13: Remaining Gap Closure (Medium + Low) */}
                  <Route path="/admin/automation" element={<AutomationDashboard />} />
                  <Route path="/admin/specialist-referral" element={<SpecialistReferralManager />} />
                  <Route path="/admin/clinical-scales" element={<ClinicalScalesDashboard />} />
                  <Route path="/admin/pos" element={<POSTerminal />} />
                  <Route path="/admin/problem-list" element={<ProblemListManager />} />
                  <Route path="/admin/transition-planner" element={<TransitionPlanner />} />
                  <Route path="/admin/ward-pass" element={<WardPassManager />} />
                </Route>
              </Route>

              {/* Super Admin Only - Developer Dashboard (Multi-Tenant Platform) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin/superadmin" element={<SuperAdminPage />} />
                </Route>
              </Route>

              {/* Service Departments: Housekeeping */}
              <Route element={<ProtectedRoute allowedRoles={['housekeeping', 'nurse', 'ward_incharge', 'admin', 'administrator']} />}>
                <Route element={<DashboardLayout />}>
                    <Route path="/housekeeping" element={<HousekeepingDashboard />} />
                    <Route path="/dietary" element={<DietaryDashboard />} />
                </Route>
              </Route>


              {/* Security Command Center - Phase 7 */}
              <Route element={<ProtectedRoute allowedRoles={['security_guard', 'admin', 'administrator', 'security_manager']} />}>
                  <Route element={<DashboardLayout />}>
                      <Route path="/security" element={<GuardCommandCentre />} /> 
                      <Route path="/security/control" element={<GuardCommandCentre />} />
                      <Route path="/security/visitors" element={<VisitorManagement />} />
                      <Route path="/reception/visitors" element={<VisitorManagement />} />
                  </Route>
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ErrorBoundary>
        </SystemStatusProvider>
      </HospitalProfileProvider>
    </ThemeProvider>
  );
}

export default App;

