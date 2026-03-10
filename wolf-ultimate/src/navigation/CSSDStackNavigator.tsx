import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CSSDHomeScreen } from '../screens/cssd/CSSDHomeScreen';
import { SterilizationCyclesScreen } from '../screens/cssd/SterilizationCyclesScreen';
import { InstrumentTrackingScreen } from '../screens/cssd/InstrumentTrackingScreen';
import { LoadLogsScreen } from '../screens/cssd/LoadLogsScreen';
import { BioIndicatorScreen } from '../screens/cssd/BioIndicatorScreen';
import { CSSDMoreScreen } from '../screens/cssd/CSSDMoreScreen';
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type CSSDStackParamList = {
  CSSDDashboard: undefined; SterilizationCycles: undefined; InstrumentTracking: undefined;
  LoadLogs: undefined; BioIndicator: undefined; CSSDMore: undefined;
  StaffChat: undefined; ClinicalAlerts: undefined; SupportTickets: undefined; Settings: undefined;
};

const Stack = createNativeStackNavigator<CSSDStackParamList>();

export const CSSDStackNavigator = () => (
  <Stack.Navigator id="CSSDStack" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="CSSDDashboard" component={CSSDHomeScreen} />
    <Stack.Screen name="SterilizationCycles" component={SterilizationCyclesScreen} />
    <Stack.Screen name="InstrumentTracking" component={InstrumentTrackingScreen} />
    <Stack.Screen name="LoadLogs" component={LoadLogsScreen} />
    <Stack.Screen name="BioIndicator" component={BioIndicatorScreen} />
    <Stack.Screen name="CSSDMore" component={CSSDMoreScreen} />
    <Stack.Screen name="StaffChat" component={StaffChatScreen} />
    <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
    <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

export default CSSDStackNavigator;
