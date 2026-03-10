import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WardManagementScreen } from '../screens/ward/WardManagementScreen';
import { AdmissionScreen } from '../screens/ward/AdmissionScreen';
import { StaffRosterScreen } from '../screens/ward/StaffRosterScreen';
import { EmergencyScreen } from '../screens/ward/EmergencyScreen';
import { WardAdminScreen } from '../screens/ward/WardAdminScreen';
// Shared Screens (reused from nurse/shared)
import { BedTransferScreen } from '../screens/shared/BedTransferScreen';
import { EquipmentScreen } from '../screens/shared/EquipmentScreen';
import { HousekeepingScreen } from '../screens/shared/HousekeepingScreen';
import { DietaryScreen } from '../screens/shared/DietaryScreen';
// Phase 3 Screens
import { OTScheduleScreen } from '../screens/shared/OTScheduleScreen';
import { WardPassScreen } from '../screens/shared/WardPassScreen';
// Phase 4 Screens
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { VisitorScreen } from '../screens/shared/VisitorScreen';
import { BillingScreen } from '../screens/shared/BillingScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
// Phase 5 Screens
import { PreAuthScreen } from '../screens/shared/PreAuthScreen';
import { InsuranceClaimsScreen } from '../screens/shared/InsuranceClaimsScreen';
import { TreatmentPackagesScreen } from '../screens/shared/TreatmentPackagesScreen';
import { TransitionPlanningScreen } from '../screens/shared/TransitionPlanningScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type WardStackParamList = {
  WardDashboard: undefined;
  Admissions: undefined;
  StaffRoster: undefined;
  Emergency: { wardId?: string; wardName?: string };
  WardAdmin: undefined;
  // Phase 2 shared
  BedTransfer: undefined;
  Equipment: undefined;
  Housekeeping: undefined;
  Dietary: undefined;
  // Phase 3
  OTSchedule: undefined;
  WardPass: undefined;
  // Phase 4
  StaffChat: undefined;
  ClinicalAlerts: undefined;
  Visitors: undefined;
  Billing: undefined;
  SupportTickets: undefined;
  // Phase 5
  PreAuth: undefined;
  InsuranceClaims: undefined;
  TreatmentPackages: undefined;
  TransitionPlanning: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<WardStackParamList>();

export const WardStackNavigator = () => {
  return (
    <Stack.Navigator
      id="WardStack"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="WardDashboard" component={WardManagementScreen} />
      <Stack.Screen name="Admissions" component={AdmissionScreen} />
      <Stack.Screen name="StaffRoster" component={StaffRosterScreen} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} />
      <Stack.Screen name="WardAdmin" component={WardAdminScreen} />
      {/* Phase 2 shared */}
      <Stack.Screen name="BedTransfer" component={BedTransferScreen} />
      <Stack.Screen name="Equipment" component={EquipmentScreen} />
      <Stack.Screen name="Housekeeping" component={HousekeepingScreen} />
      <Stack.Screen name="Dietary" component={DietaryScreen} />
      {/* Phase 3 */}
      <Stack.Screen name="OTSchedule" component={OTScheduleScreen as any} />
      <Stack.Screen name="WardPass" component={WardPassScreen} />
      {/* Phase 4 */}
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="Visitors" component={VisitorScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      {/* Phase 5 */}
      <Stack.Screen name="PreAuth" component={PreAuthScreen} />
      <Stack.Screen name="InsuranceClaims" component={InsuranceClaimsScreen} />
      <Stack.Screen name="TreatmentPackages" component={TreatmentPackagesScreen} />
      <Stack.Screen name="TransitionPlanning" component={TransitionPlanningScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default WardStackNavigator;
