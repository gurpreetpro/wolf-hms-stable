import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HIMHomeScreen } from '../screens/him/HIMHomeScreen';
import { RecordRequestsScreen } from '../screens/him/RecordRequestsScreen';
import { ICDCodingScreen } from '../screens/him/ICDCodingScreen';
import { MLCCasesScreen } from '../screens/him/MLCCasesScreen';
import { AuditTrailScreen } from '../screens/him/AuditTrailScreen';
import { HIMMoreScreen } from '../screens/him/HIMMoreScreen';
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type HIMStackParamList = {
  HIMDashboard: undefined; RecordRequests: undefined; ICDCoding: undefined;
  MLCCases: undefined; AuditTrail: undefined; HIMMore: undefined;
  StaffChat: undefined; ClinicalAlerts: undefined; SupportTickets: undefined; Settings: undefined;
};

const Stack = createNativeStackNavigator<HIMStackParamList>();

export const HIMStackNavigator = () => (
  <Stack.Navigator id="HIMStack" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="HIMDashboard" component={HIMHomeScreen} />
    <Stack.Screen name="RecordRequests" component={RecordRequestsScreen} />
    <Stack.Screen name="ICDCoding" component={ICDCodingScreen} />
    <Stack.Screen name="MLCCases" component={MLCCasesScreen} />
    <Stack.Screen name="AuditTrail" component={AuditTrailScreen} />
    <Stack.Screen name="HIMMore" component={HIMMoreScreen} />
    <Stack.Screen name="StaffChat" component={StaffChatScreen} />
    <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
    <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

export default HIMStackNavigator;
