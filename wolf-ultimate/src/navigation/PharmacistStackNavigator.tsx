import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Phase 13A — Core Pharmacist Screens
import { PharmacistHomeScreen } from '../screens/pharmacist/PharmacistHomeScreen';
import { PrescriptionQueueScreen } from '../screens/pharmacist/PrescriptionQueueScreen';
import { DispensingScreen } from '../screens/pharmacist/DispensingScreen';
import { PharmacistMoreScreen } from '../screens/pharmacist/PharmacistMoreScreen';
// Phase 13B — Inventory & Controlled
import { DrugInventoryScreen } from '../screens/pharmacist/DrugInventoryScreen';
import { ControlledDrugScreen } from '../screens/pharmacist/ControlledDrugScreen';
import { DrugReturnScreen } from '../screens/pharmacist/DrugReturnScreen';
// Phase 13C — Clinical & AI
import { ClinicalPharmacyScreen } from '../screens/pharmacist/ClinicalPharmacyScreen';
import { PharmacyAIScreen } from '../screens/pharmacist/PharmacyAIScreen';
// Shared screens
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type PharmacistStackParamList = {
  PharmacistDashboard: undefined;
  PrescriptionQueue: undefined;
  Dispensing: { prescriptionId: string };
  PharmacistMore: undefined;
  // Phase 13B
  DrugInventory: undefined;
  ControlledDrug: undefined;
  DrugReturn: undefined;
  // Phase 13C
  ClinicalPharmacy: undefined;
  PharmacyAI: undefined;
  // Shared
  StaffChat: undefined;
  ClinicalAlerts: undefined;
  SupportTickets: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<PharmacistStackParamList>();

export const PharmacistStackNavigator = () => {
  return (
    <Stack.Navigator
      id="PharmacistStack"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Phase 13A — Core */}
      <Stack.Screen name="PharmacistDashboard" component={PharmacistHomeScreen} />
      <Stack.Screen name="PrescriptionQueue" component={PrescriptionQueueScreen} />
      <Stack.Screen name="Dispensing" component={DispensingScreen} />
      <Stack.Screen name="PharmacistMore" component={PharmacistMoreScreen} />
      {/* Phase 13B — Inventory & Controlled */}
      <Stack.Screen name="DrugInventory" component={DrugInventoryScreen} />
      <Stack.Screen name="ControlledDrug" component={ControlledDrugScreen} />
      <Stack.Screen name="DrugReturn" component={DrugReturnScreen} />
      {/* Phase 13C — Clinical & AI */}
      <Stack.Screen name="ClinicalPharmacy" component={ClinicalPharmacyScreen} />
      <Stack.Screen name="PharmacyAI" component={PharmacyAIScreen} />
      {/* Shared */}
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default PharmacistStackNavigator;
