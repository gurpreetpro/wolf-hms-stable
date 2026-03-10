import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Phase 14A — Core Lab Screens
import { LabHomeScreen } from '../screens/lab/LabHomeScreen';
import { SampleWorklistScreen } from '../screens/lab/SampleWorklistScreen';
import { ResultEntryScreen } from '../screens/lab/ResultEntryScreen';
import { LabMoreScreen } from '../screens/lab/LabMoreScreen';
// Phase 14B — QC, Verification, Critical Values
import { QCCalibrationScreen } from '../screens/lab/QCCalibrationScreen';
import { PathologistVerifyScreen } from '../screens/lab/PathologistVerifyScreen';
import { CriticalValueScreen } from '../screens/lab/CriticalValueScreen';
// Phase 14C — AI & Reagent
import { LabAIScreen } from '../screens/lab/LabAIScreen';
import { ReagentStockScreen } from '../screens/lab/ReagentStockScreen';
// Shared screens
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type LabStackParamList = {
  LabDashboard: undefined;
  SampleWorklist: undefined;
  ResultEntry: { sampleId: string; testName: string };
  LabMore: undefined;
  // Phase 14B
  QCCalibration: undefined;
  PathologistVerify: undefined;
  CriticalValues: undefined;
  // Phase 14C
  LabAI: undefined;
  ReagentStock: undefined;
  // Shared
  StaffChat: undefined;
  ClinicalAlerts: undefined;
  SupportTickets: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<LabStackParamList>();

export const LabStackNavigator = () => {
  return (
    <Stack.Navigator
      id="LabStack"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Phase 14A — Core */}
      <Stack.Screen name="LabDashboard" component={LabHomeScreen} />
      <Stack.Screen name="SampleWorklist" component={SampleWorklistScreen} />
      <Stack.Screen name="ResultEntry" component={ResultEntryScreen} />
      <Stack.Screen name="LabMore" component={LabMoreScreen} />
      {/* Phase 14B — QC, Verification, Critical Values */}
      <Stack.Screen name="QCCalibration" component={QCCalibrationScreen} />
      <Stack.Screen name="PathologistVerify" component={PathologistVerifyScreen} />
      <Stack.Screen name="CriticalValues" component={CriticalValueScreen} />
      {/* Phase 14C — AI & Reagent Stock */}
      <Stack.Screen name="LabAI" component={LabAIScreen} />
      <Stack.Screen name="ReagentStock" component={ReagentStockScreen} />
      {/* Shared */}
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default LabStackNavigator;
