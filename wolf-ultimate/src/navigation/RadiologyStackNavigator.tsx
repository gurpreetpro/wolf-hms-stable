import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Phase 16A — Core Radiology Screens
import { RadiologyHomeScreen } from '../screens/radiology/RadiologyHomeScreen';
import { ImagingWorklistScreen } from '../screens/radiology/ImagingWorklistScreen';
import { ScanPerformScreen } from '../screens/radiology/ScanPerformScreen';
import { RadiologyMoreScreen } from '../screens/radiology/RadiologyMoreScreen';
// Phase 16B — Reporting & Authorization
import { RadiologyReportScreen } from '../screens/radiology/RadiologyReportScreen';
import { ReportAuthorizationScreen } from '../screens/radiology/ReportAuthorizationScreen';
import { CriticalFindingScreen } from '../screens/radiology/CriticalFindingScreen';
// Phase 16C — AI & Dose Tracking
import { RadiologyAIScreen } from '../screens/radiology/RadiologyAIScreen';
import { RadiationDoseScreen } from '../screens/radiology/RadiationDoseScreen';
// Shared screens
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type RadiologyStackParamList = {
  RadiologyDashboard: undefined;
  ImagingWorklist: undefined;
  ScanPerform: { orderId?: number };
  RadiologyMore: undefined;
  // Phase 16B
  RadiologyReport: undefined;
  ReportAuthorization: undefined;
  CriticalFinding: undefined;
  // Phase 16C
  RadiologyAI: undefined;
  RadiationDose: undefined;
  // Shared
  StaffChat: undefined;
  ClinicalAlerts: undefined;
  SupportTickets: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RadiologyStackParamList>();

export const RadiologyStackNavigator = () => {
  return (
    <Stack.Navigator
      id="RadiologyStack"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      {/* Phase 16A — Core */}
      <Stack.Screen name="RadiologyDashboard" component={RadiologyHomeScreen} />
      <Stack.Screen name="ImagingWorklist" component={ImagingWorklistScreen} />
      <Stack.Screen name="ScanPerform" component={ScanPerformScreen} />
      <Stack.Screen name="RadiologyMore" component={RadiologyMoreScreen} />
      {/* Phase 16B — Reporting & Authorization */}
      <Stack.Screen name="RadiologyReport" component={RadiologyReportScreen} />
      <Stack.Screen name="ReportAuthorization" component={ReportAuthorizationScreen} />
      <Stack.Screen name="CriticalFinding" component={CriticalFindingScreen} />
      {/* Phase 16C — AI & Dose Tracking */}
      <Stack.Screen name="RadiologyAI" component={RadiologyAIScreen} />
      <Stack.Screen name="RadiationDose" component={RadiationDoseScreen} />
      {/* Shared */}
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default RadiologyStackNavigator;
