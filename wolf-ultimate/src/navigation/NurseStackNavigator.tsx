import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NurseHomeScreen } from '../screens/nurse/NurseHomeScreen';
import { VitalsScreen } from '../screens/nurse/VitalsScreen';
import { MedicationScreen } from '../screens/nurse/MedicationScreen';
import { IOChartScreen } from '../screens/nurse/IOChartScreen';
import { PainAssessmentScreen } from '../screens/nurse/PainAssessmentScreen';
import { IVManagementScreen } from '../screens/nurse/IVManagementScreen';
import { CarePlanScreen } from '../screens/nurse/CarePlanScreen';
import { RequestsScreen } from '../screens/nurse/RequestsScreen';
// Phase 2 Screens
import { ClinicalScalesScreen } from '../screens/nurse/ClinicalScalesScreen';
import { BloodBankScreen } from '../screens/nurse/BloodBankScreen';
import { ConsentFormScreen } from '../screens/nurse/ConsentFormScreen';
import { FileUploadScreen } from '../screens/nurse/FileUploadScreen';
import { CSSDScreen } from '../screens/nurse/CSSDScreen';
// Shared Screens
import { DietaryScreen } from '../screens/shared/DietaryScreen';
import { BedTransferScreen } from '../screens/shared/BedTransferScreen';
import { EquipmentScreen } from '../screens/shared/EquipmentScreen';
import { HousekeepingScreen } from '../screens/shared/HousekeepingScreen';
// Phase 3 Screens
import { OTScheduleScreen } from '../screens/shared/OTScheduleScreen';
import { PreOpScreen } from '../screens/shared/PreOpScreen';
import { IntraOpScreen } from '../screens/shared/IntraOpScreen';
import { PACUScreen } from '../screens/shared/PACUScreen';
import { WardPassScreen } from '../screens/shared/WardPassScreen';
// Phase 4 Screens
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
// Phase 5 Screens
import { TransitionPlanningScreen } from '../screens/shared/TransitionPlanningScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type NurseStackParamList = {
  NurseDashboard: undefined;
  Vitals: { admissionId: string; patientId: string; patientName: string; bedNumber?: string };
  Medications: { admissionId?: string };
  IOChart: { admissionId: string; patientName: string };
  PainAssessment: { admissionId: string; patientName: string };
  IVManagement: { admissionId: string; patientName: string };
  CarePlan: { admissionId: string; patientName: string; diagnosis?: string };
  Requests: { admissionId?: string; patientName?: string; wardId?: string };
  // Phase 2
  ClinicalScales: undefined;
  BloodBank: undefined;
  ConsentForms: undefined;
  FileUploads: undefined;
  CSSD: undefined;
  Dietary: undefined;
  BedTransfer: undefined;
  Equipment: undefined;
  Housekeeping: undefined;
  WardPass: undefined;
  // Phase 3
  OTSchedule: undefined;
  PreOp: undefined;
  IntraOp: undefined;
  PACU: undefined;
  // Phase 4
  StaffChat: undefined;
  ClinicalAlerts: undefined;
  SupportTickets: undefined;
  // Phase 5
  TransitionPlanning: undefined;
  // Future
  Emergency: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<NurseStackParamList>();

export const NurseStackNavigator = () => {
  return (
    <Stack.Navigator
      id="NurseStack"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Core */}
      <Stack.Screen name="NurseDashboard" component={NurseHomeScreen} />
      <Stack.Screen name="Vitals" component={VitalsScreen} />
      <Stack.Screen name="Medications" component={MedicationScreen} />
      <Stack.Screen name="IOChart" component={IOChartScreen} />
      <Stack.Screen name="PainAssessment" component={PainAssessmentScreen} />
      <Stack.Screen name="IVManagement" component={IVManagementScreen} />
      <Stack.Screen name="CarePlan" component={CarePlanScreen} />
      <Stack.Screen name="Requests" component={RequestsScreen} />
      {/* Phase 2 */}
      <Stack.Screen name="ClinicalScales" component={ClinicalScalesScreen} />
      <Stack.Screen name="BloodBank" component={BloodBankScreen} />
      <Stack.Screen name="ConsentForms" component={ConsentFormScreen} />
      <Stack.Screen name="FileUploads" component={FileUploadScreen} />
      <Stack.Screen name="CSSD" component={CSSDScreen} />
      <Stack.Screen name="Dietary" component={DietaryScreen} />
      <Stack.Screen name="BedTransfer" component={BedTransferScreen} />
      <Stack.Screen name="Equipment" component={EquipmentScreen} />
      <Stack.Screen name="Housekeeping" component={HousekeepingScreen} />
      {/* Phase 3 */}
      <Stack.Screen name="OTSchedule" component={OTScheduleScreen as any} />
      <Stack.Screen name="PreOp" component={PreOpScreen} />
      <Stack.Screen name="IntraOp" component={IntraOpScreen} />
      <Stack.Screen name="PACU" component={PACUScreen} />
      <Stack.Screen name="WardPass" component={WardPassScreen} />
      {/* Phase 4 */}
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      {/* Phase 5 */}
      <Stack.Screen name="TransitionPlanning" component={TransitionPlanningScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default NurseStackNavigator;
