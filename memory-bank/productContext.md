# Product Context — User Roles, Workflows & Frontend Pages

## Core User Personas & Their Dashboards

### Admin / Super Admin
- **Pages**: Dashboard.jsx, SuperAdminPage.jsx, AdminSettings.jsx, MultiTenantAdmin.jsx, SystemConfiguration.jsx, StaffManagement.jsx, PlatformDashboard.jsx, AdminRecoveryConsole.jsx
- **Workflows**: Hospital onboarding, staff CRUD, role/permission assignment, hospital profile branding, license activation, system configuration, feature flags, data governance, backup/disaster recovery

### Doctor / Consultant
- **Pages**: DoctorDashboard.jsx, CPOEDashboard.jsx, ClinicalAIAssistant.jsx, ClinicalPathwaysDashboard.jsx, ClinicalScalesDashboard.jsx, SmartScheduling.jsx, SpecialistReferralManager.jsx
- **Workflows**: OPD queue management, CPOE (Computerized Physician Order Entry), SOAP note writing, e-prescriptions, IPD round notes, clinical AI chat, differential diagnosis, drug interaction alerts, discharge summaries, referral letters
- **Mobile (Wolf Ultimate)**: DoctorHomeScreen, OPDQueueScreen, PrescriptionScreen, ClinicalNotesScreen, PatientHubScreen, AppointmentBookingScreen, OrderSetScreen, DischargeSummaryScreen

### Nurse / Ward Staff
- **Pages**: WardDashboard.jsx, WardManagement.jsx, EMARDashboard.jsx, EarlyWarningScore.jsx, ClosedLoopMedication.jsx, NeonatalDashboard.jsx, InfectionControlDashboard.jsx, PatientSafetyDashboard.jsx
- **Components**: eMAR.jsx, NursePatientProfile.jsx, VitalsChart.jsx, NEWSScore.jsx, SBARHandoffPanel.jsx, WoundAssessmentTab.jsx, FallRiskAssessmentTab.jsx, CareTaskBoard.jsx, NursingInstructionsModal.jsx
- **Mobile (Wolf Ultimate)**: NurseHomeScreen, NurseWardScreen, NurseTaskHubScreen, NurseToolsScreen, VitalsScreen, MedicationScreen, ShiftHandoverScreen, IOChartScreen, IVManagementScreen, PainAssessmentScreen

### Lab Technician
- **Pages**: LabDashboard.jsx, AnatomicPathology.jsx
- **Components**: LabEntryForm.jsx, LabQueueTab.jsx, LabReportPrint.jsx, LabHistoryTab.jsx, LabPaymentsTab.jsx, LabBarcodeDisplay.jsx, LabPackageBuilder.jsx, LabTestParamsAdmin.jsx, LabTrendView.jsx, LabRevenueChart.jsx, LabAuditLog.jsx, TATAnalyticsChart.jsx, VerifyResultModal.jsx, QCDashboard.jsx, ReagentInventory.jsx
- **Mobile (Wolf Ultimate)**: LabHomeScreen, ResultEntryScreen, SampleWorklistScreen, QCCalibrationScreen, CriticalValueScreen, PathologistVerifyScreen, ReagentStockScreen, LabAIScreen

### Pharmacist
- **Pages**: PharmacyDashboard.jsx
- **Components**: PharmacyIPDOrdersPanel.jsx, PharmacyReceiptPrint.jsx, PharmacyReports.jsx, PharmacyRequestModal.jsx, AddDrugModal.jsx, DrugInteractionAlert.jsx, MedicationReconciliation.jsx
- **Mobile (Wolf Ultimate)**: PharmacistHomeScreen, DispensingScreen, PrescriptionQueueScreen, DrugInventoryScreen, DrugReturnScreen, ControlledDrugScreen, DrugInteractionScreen, ClinicalPharmacyScreen, PharmacyAIScreen

### Radiologist
- **Pages**: RadiologyDashboard.jsx
- **Components**: OHIFViewer.jsx (DICOM viewer)
- **Mobile (Wolf Ultimate)**: RadiologyHomeScreen, ImagingWorklistScreen, ScanPerformScreen, RadiologyReportScreen, RadiologyOrderScreen, RadiologyAIScreen, RadiationDoseScreen

### Blood Bank
- **Pages**: BloodBankDashboard.jsx
- **Components**: BloodRequestModal.jsx, EmergencyBloodRelease.jsx, IPDBloodRequestModal.jsx, PatientBloodCard.jsx, PreTransfusionTestPanel.jsx, SurgicalBloodOrderModal.jsx, TransfusionMonitor.jsx, TransfusionScanner.jsx, WardBloodSummary.jsx, WardBloodTransfusionsPanel.jsx, PreOpBloodChecklist.jsx
- **Mobile (Wolf Ultimate)**: BloodBankHomeScreen, CrossMatchRequestsScreen, ComponentSeparationScreen, DonationRecordsScreen, TransfusionReactionsScreen

### Receptionist / Front Desk
- **Pages**: OPDReception.jsx, QueueDisplay.jsx
- **Components**: PatientRegistrationModal.jsx, RapidTriageRegistration.jsx, AppointmentSlip.jsx, RegistrationReceipt.jsx
- **Mobile (Wolf Ultimate)**: ReceptionHomeScreen, PatientRegistrationScreen, TokenQueueScreen, ConsultantStatusScreen

### Finance / Billing
- **Pages**: BillingDashboard.jsx, FinanceDashboard.jsx, POSTerminal.jsx, PriceApprovals.jsx, CreditDebitNotes.jsx, RevenueCycleAI.jsx, MultiPayerSplit.jsx, PayrollIntegration.jsx
- **Components**: BillingWorkspace.jsx, InvoicePrint.jsx, PaymentModal.jsx, BillingLeakageTracker.jsx, BillingOptimizer.jsx, BillingKPIs.jsx, DailyRevenueReport.jsx, AgedTrialBalance.jsx, RevenueChart.jsx

### Insurance / TPA
- **Pages**: InsuranceCommandCenter.jsx, PriorAuthDashboard.jsx, TPAProviderAdmin.jsx
- **Components**: InsuranceVerificationModal.jsx, ClaimsDashboard.jsx, EligibilityVerification.jsx, PreauthDashboard.jsx, PreAuthForm.jsx, PMJAYClaimBuilder.jsx, PMJAYPackageSelector.jsx, PMJAYAnalytics.jsx

### Security Guard (Wolf Guard Mobile)
- **Screens**: PatrolScreen, ParkingScreen, VisitorEntryScreen, DispatchScreen, VehicleInspectionScreen, ReportIncidentScreen, CommsScreen, LogisticsScreen, ShiftHandoverScreen, QRScannerScreen
- **Services**: Geofencing, Location tracking, SOS hardware button, HIPS, Voice commands, AI assistance

### Patient (Wolf Care App)
- **Screens**: Login (OTP), Appointments, Orders (home lab), Records, Profile, Video Call
- **Features**: Appointment booking, home lab packages, telehealth video, medical records viewer

### Surgical / OT Team
- **Pages**: OTDashboard.jsx, AnaesthesiaConsole.jsx, AnaesthesiaDashboard.jsx, PACDashboard.jsx, PACUDashboard.jsx
- **Components**: WHOChecklistModal.jsx, PACAssessmentForm.jsx, PACForm.jsx
- **Mobile (Wolf Ultimate)**: AnaesthesiaScreen, PreOpScreen, IntraOpScreen, PACUScreen, OTScheduleScreen, ProcedureLogScreen

### Housekeeping / Dietary / Support
- **Pages**: HousekeepingDashboard.jsx, DietaryDashboard.jsx, LaundryDashboard.jsx, WasteManagementDashboard.jsx, AssetDashboard.jsx, CSSDDashboard.jsx
- **Mobile (Wolf Ultimate)**: HousekeepingScreen, DietaryScreen, CSSDHomeScreen, EquipmentScreen, BiomedHomeScreen

### RMO (Resident Medical Officer)
- **Mobile (Wolf Ultimate)**: RmoHomeScreen, RmoEmergencyScreen, RmoClinicalAssistantScreen, RmoWardRoundScreen, RmoProgressNoteScreen, RmoProcedureLogScreen

## Compliance & Regulatory Pages
- NABHCertification.jsx, HIPAACompliance.jsx, DataPrivacy.jsx, RegulatoryReporting.jsx, PopulationHealth.jsx, QualityDashboard.jsx

## AI/Advanced Pages
- AIDemoPage.jsx, EnterpriseAIDashboard.jsx, ClinicalAIAssistant.jsx, ClinicalNLP.jsx, PredictiveAnalytics.jsx, RevenueCycleAI.jsx, SmartScheduling.jsx

## Communication / Telehealth Pages
- TelehealthConsole.jsx, CommsDashboard.jsx, RemotePatientMonitoring.jsx
- Components: VideoCall.jsx, VideoRoom.jsx, WebRTCVideoRoom.jsx, JitsiVideoRoom.jsx, VoiceChannelBar.jsx, VoiceCommandButton.jsx, VoiceDictation.jsx, AmbientListening.jsx

## Integration Pages
- FHIRExplorer.jsx, HL7ADTFeed.jsx, IntegrationHub.jsx
