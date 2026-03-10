import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DoctorHomeScreen } from '../screens/doctor/DoctorHomeScreen';
import { PrescriptionScreen } from '../screens/doctor/PrescriptionScreen';
import { LabOrderScreen } from '../screens/doctor/LabOrderScreen';
import { ClinicalNotesScreen } from '../screens/doctor/ClinicalNotesScreen';
import { AppointmentsScreen } from '../screens/doctor/AppointmentsScreen';
import { PatientDetailModal } from '../screens/doctor/PatientDetailModal';
import { ChemoTrackingScreen } from '../screens/doctor/specialty/ChemoTrackingScreen';
import { DialysisMonitoringScreen } from '../screens/doctor/specialty/DialysisMonitoringScreen';
// Phase 1 Screens
import { OPDQueueScreen } from '../screens/doctor/OPDQueueScreen';
import { RadiologyOrderScreen } from '../screens/doctor/RadiologyOrderScreen';
import { DischargeSummaryScreen } from '../screens/doctor/DischargeSummaryScreen';
import { DrugInteractionScreen } from '../screens/doctor/DrugInteractionScreen';
import { OrderSetScreen } from '../screens/doctor/OrderSetScreen';
import { PatientSearchScreen } from '../screens/doctor/PatientSearchScreen';
import { ProblemListScreen } from '../screens/doctor/ProblemListScreen';
import { ProcedureLogScreen } from '../screens/doctor/ProcedureLogScreen';
import { ReferralScreen } from '../screens/doctor/ReferralScreen';
import { AnalyticsScreen } from '../screens/doctor/AnalyticsScreen';
// Phase 3 Screens
import { OTScheduleScreen } from '../screens/shared/OTScheduleScreen';
import { PreOpScreen } from '../screens/shared/PreOpScreen';
import { IntraOpScreen } from '../screens/shared/IntraOpScreen';
import { AnaesthesiaScreen } from '../screens/shared/AnaesthesiaScreen';
// Phase 4 Screens
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { TelehealthScreen } from '../screens/shared/TelehealthScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { AIClinicalScreen } from '../screens/shared/AIClinicalScreen';
import { BillingScreen } from '../screens/shared/BillingScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
// Phase 5 Screens
import { PreAuthScreen } from '../screens/shared/PreAuthScreen';
import { InsuranceClaimsScreen } from '../screens/shared/InsuranceClaimsScreen';
import { TreatmentPackagesScreen } from '../screens/shared/TreatmentPackagesScreen';
import { ABDMScreen } from '../screens/shared/ABDMScreen';
import { TransitionPlanningScreen } from '../screens/shared/TransitionPlanningScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type DoctorStackParamList = {
  DoctorDashboard: undefined;
  PatientDetail: { patientId: string; patientName: string };
  Prescriptions: { patientId: string; patientName: string; visitId?: string };
  LabOrders: { patientId: string; patientName: string; visitId?: string };
  ClinicalNotes: { patientId: string; patientName: string; visitId?: string };
  Appointments: { doctorId?: string };
  ChemoTracking: undefined;
  DialysisMonitoring: undefined;
  // Phase 1
  OPDQueue: undefined;
  RadiologyOrders: undefined;
  DischargeSummary: { patientName?: string };
  DrugInteraction: undefined;
  OrderSets: undefined;
  PatientSearch: undefined;
  ProblemList: undefined;
  ProcedureLog: undefined;
  Referrals: undefined;
  DoctorAnalytics: undefined;
  // Phase 3
  OTSchedule: undefined;
  PreOp: undefined;
  IntraOp: undefined;
  Anaesthesia: undefined;
  // Phase 4
  StaffChat: undefined;
  Telehealth: undefined;
  ClinicalAlerts: undefined;
  AIClinical: undefined;
  Billing: undefined;
  SupportTickets: undefined;
  // Phase 5
  PreAuth: undefined;
  InsuranceClaims: undefined;
  TreatmentPackages: undefined;
  ABDM: undefined;
  TransitionPlanning: undefined;
  // Future
  ClinicalScales: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<DoctorStackParamList>();

export const DoctorStackNavigator = () => {
  return (
    <Stack.Navigator
      id="DoctorStack"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Core */}
      <Stack.Screen name="DoctorDashboard" component={DoctorHomeScreen} />
      <Stack.Screen name="PatientDetail" component={PatientDetailModal as any} />
      <Stack.Screen name="Prescriptions" component={PrescriptionScreen} />
      <Stack.Screen name="LabOrders" component={LabOrderScreen} />
      <Stack.Screen name="ClinicalNotes" component={ClinicalNotesScreen} />
      <Stack.Screen name="Appointments" component={AppointmentsScreen} />
      <Stack.Screen name="ChemoTracking" component={ChemoTrackingScreen} />
      <Stack.Screen name="DialysisMonitoring" component={DialysisMonitoringScreen} />
      {/* Phase 1 */}
      <Stack.Screen name="OPDQueue" component={OPDQueueScreen} />
      <Stack.Screen name="RadiologyOrders" component={RadiologyOrderScreen} />
      <Stack.Screen name="DischargeSummary" component={DischargeSummaryScreen} />
      <Stack.Screen name="DrugInteraction" component={DrugInteractionScreen} />
      <Stack.Screen name="OrderSets" component={OrderSetScreen} />
      <Stack.Screen name="PatientSearch" component={PatientSearchScreen} />
      <Stack.Screen name="ProblemList" component={ProblemListScreen} />
      <Stack.Screen name="ProcedureLog" component={ProcedureLogScreen} />
      <Stack.Screen name="Referrals" component={ReferralScreen} />
      <Stack.Screen name="DoctorAnalytics" component={AnalyticsScreen} />
      {/* Phase 3 */}
      <Stack.Screen name="OTSchedule" component={OTScheduleScreen} />
      <Stack.Screen name="PreOp" component={PreOpScreen} />
      <Stack.Screen name="IntraOp" component={IntraOpScreen} />
      <Stack.Screen name="Anaesthesia" component={AnaesthesiaScreen} />
      {/* Phase 4 */}
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="Telehealth" component={TelehealthScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="AIClinical" component={AIClinicalScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      {/* Phase 5 */}
      <Stack.Screen name="PreAuth" component={PreAuthScreen} />
      <Stack.Screen name="InsuranceClaims" component={InsuranceClaimsScreen} />
      <Stack.Screen name="TreatmentPackages" component={TreatmentPackagesScreen} />
      <Stack.Screen name="ABDM" component={ABDMScreen} />
      <Stack.Screen name="TransitionPlanning" component={TransitionPlanningScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default DoctorStackNavigator;
