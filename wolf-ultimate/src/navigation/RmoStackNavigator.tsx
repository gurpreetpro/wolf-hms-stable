import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RmoHomeScreen } from '../screens/rmo/RmoHomeScreen';
import { DutyRosterScreen } from '../screens/rmo/DutyRosterScreen';
import { ConsultantStatusScreen } from '../screens/rmo/ConsultantStatusScreen';
// Phase 12B
import { ShiftHandoverScreen } from '../screens/rmo/ShiftHandoverScreen';
import { EscalationScreen } from '../screens/rmo/EscalationScreen';
import { EscalationHistoryScreen } from '../screens/rmo/EscalationHistoryScreen';
// Phase 12C
import { RmoWardRoundScreen } from '../screens/rmo/RmoWardRoundScreen';
import { RmoProgressNoteScreen } from '../screens/rmo/RmoProgressNoteScreen';
import { RmoProcedureLogScreen } from '../screens/rmo/RmoProcedureLogScreen';
// Phase 12D
import { NightShiftDashboardScreen } from '../screens/rmo/NightShiftDashboardScreen';
import { RmoEmergencyScreen } from '../screens/rmo/RmoEmergencyScreen';
// Phase 12E
import { RmoClinicalAssistantScreen } from '../screens/rmo/RmoClinicalAssistantScreen';
// Shared screens (reuse from Doctor/Nurse stacks)
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { AIClinicalScreen } from '../screens/shared/AIClinicalScreen';
import { BillingScreen } from '../screens/shared/BillingScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type RmoStackParamList = {
  // Phase 12A — Core
  RmoDashboard: undefined;
  DutyRoster: undefined;
  ConsultantStatus: undefined;
  // Phase 12B — Handover & Escalation
  ShiftHandover: undefined;
  Escalation: undefined;
  EscalationHistory: undefined;
  // Phase 12C — Ward Rounds & Clinical
  RmoWardRound: undefined;
  RmoProgressNote: { patientId?: string };
  RmoProcedureLog: undefined;
  // Phase 12D — Emergency & Night
  NightDashboard: undefined;
  RmoEmergency: undefined;
  // Phase 12E — AI Co-Pilot
  RmoClinicalAssistant: undefined;
  // Shared (already exist)
  StaffChat: undefined;
  ClinicalAlerts: undefined;
  AIClinical: undefined;
  Billing: undefined;
  SupportTickets: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RmoStackParamList>();

export const RmoStackNavigator = () => {
  return (
    <Stack.Navigator
      id="RmoStack"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Phase 12A — Core */}
      <Stack.Screen name="RmoDashboard" component={RmoHomeScreen} />
      <Stack.Screen name="DutyRoster" component={DutyRosterScreen} />
      <Stack.Screen name="ConsultantStatus" component={ConsultantStatusScreen} />
      {/* Phase 12B — Handover & Escalation */}
      <Stack.Screen name="ShiftHandover" component={ShiftHandoverScreen} />
      <Stack.Screen name="Escalation" component={EscalationScreen} />
      <Stack.Screen name="EscalationHistory" component={EscalationHistoryScreen} />
      {/* Phase 12C — Ward Rounds & Clinical */}
      <Stack.Screen name="RmoWardRound" component={RmoWardRoundScreen} />
      <Stack.Screen name="RmoProgressNote" component={RmoProgressNoteScreen} />
      <Stack.Screen name="RmoProcedureLog" component={RmoProcedureLogScreen} />
      {/* Phase 12D — Night & Emergency */}
      <Stack.Screen name="NightDashboard" component={NightShiftDashboardScreen} />
      <Stack.Screen name="RmoEmergency" component={RmoEmergencyScreen} />
      {/* Phase 12E — AI Co-Pilot */}
      <Stack.Screen name="RmoClinicalAssistant" component={RmoClinicalAssistantScreen} />
      {/* Shared Screens */}
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="AIClinical" component={AIClinicalScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default RmoStackNavigator;
