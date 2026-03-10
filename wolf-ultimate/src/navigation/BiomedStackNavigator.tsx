import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BiomedHomeScreen } from '../screens/biomed/BiomedHomeScreen';
import { BreakdownTicketsScreen } from '../screens/biomed/BreakdownTicketsScreen';
import { MaintenanceScheduleScreen } from '../screens/biomed/MaintenanceScheduleScreen';
import { CalibrationLogsScreen } from '../screens/biomed/CalibrationLogsScreen';
import { AMCDashboardScreen } from '../screens/biomed/AMCDashboardScreen';
import { BiomedMoreScreen } from '../screens/biomed/BiomedMoreScreen';
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type BiomedStackParamList = {
  BiomedDashboard: undefined; BreakdownTickets: undefined; MaintenanceSchedule: undefined;
  CalibrationLogs: undefined; AMCDashboard: undefined; BiomedMore: undefined;
  StaffChat: undefined; ClinicalAlerts: undefined; SupportTickets: undefined; Settings: undefined;
};

const Stack = createNativeStackNavigator<BiomedStackParamList>();

export const BiomedStackNavigator = () => (
  <Stack.Navigator id="BiomedStack" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="BiomedDashboard" component={BiomedHomeScreen} />
    <Stack.Screen name="BreakdownTickets" component={BreakdownTicketsScreen} />
    <Stack.Screen name="MaintenanceSchedule" component={MaintenanceScheduleScreen} />
    <Stack.Screen name="CalibrationLogs" component={CalibrationLogsScreen} />
    <Stack.Screen name="AMCDashboard" component={AMCDashboardScreen} />
    <Stack.Screen name="BiomedMore" component={BiomedMoreScreen} />
    <Stack.Screen name="StaffChat" component={StaffChatScreen} />
    <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
    <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

export default BiomedStackNavigator;
