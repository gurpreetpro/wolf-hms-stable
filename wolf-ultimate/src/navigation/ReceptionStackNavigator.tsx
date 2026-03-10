import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Phase 15A — Core Reception Screens
import { ReceptionHomeScreen } from '../screens/reception/ReceptionHomeScreen';
import { PatientRegistrationScreen } from '../screens/reception/PatientRegistrationScreen';
import { TokenQueueScreen } from '../screens/reception/TokenQueueScreen';
import { ReceptionMoreScreen } from '../screens/reception/ReceptionMoreScreen';
// Phase 15B — Appointments & Billing
import { AppointmentBookingScreen } from '../screens/reception/AppointmentBookingScreen';
import { BillingCounterScreen } from '../screens/reception/BillingCounterScreen';
import { DayEndReconciliationScreen } from '../screens/reception/DayEndReconciliationScreen';
// Phase 15C — Patient Search & Visitor
import { PatientSearchScreen } from '../screens/reception/PatientSearchScreen';
import { VisitorPassScreen } from '../screens/reception/VisitorPassScreen';
// Shared screens
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type ReceptionStackParamList = {
  ReceptionDashboard: undefined;
  PatientRegistration: undefined;
  TokenQueue: undefined;
  ReceptionMore: undefined;
  // Phase 15B
  AppointmentBooking: undefined;
  BillingCounter: undefined;
  DayEndReconciliation: undefined;
  // Phase 15C
  PatientSearch: undefined;
  VisitorPass: undefined;
  // Shared
  StaffChat: undefined;
  ClinicalAlerts: undefined;
  SupportTickets: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<ReceptionStackParamList>();

export const ReceptionStackNavigator = () => {
  return (
    <Stack.Navigator
      id="ReceptionStack"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      {/* Phase 15A — Core */}
      <Stack.Screen name="ReceptionDashboard" component={ReceptionHomeScreen} />
      <Stack.Screen name="PatientRegistration" component={PatientRegistrationScreen} />
      <Stack.Screen name="TokenQueue" component={TokenQueueScreen} />
      <Stack.Screen name="ReceptionMore" component={ReceptionMoreScreen} />
      {/* Phase 15B — Appointments & Billing */}
      <Stack.Screen name="AppointmentBooking" component={AppointmentBookingScreen} />
      <Stack.Screen name="BillingCounter" component={BillingCounterScreen} />
      <Stack.Screen name="DayEndReconciliation" component={DayEndReconciliationScreen} />
      {/* Phase 15C — Patient Search & Visitor */}
      <Stack.Screen name="PatientSearch" component={PatientSearchScreen} />
      <Stack.Screen name="VisitorPass" component={VisitorPassScreen} />
      {/* Shared */}
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default ReceptionStackNavigator;
