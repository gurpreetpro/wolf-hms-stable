import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BloodBankHomeScreen } from '../screens/bloodbank/BloodBankHomeScreen';
import { CrossMatchRequestsScreen } from '../screens/bloodbank/CrossMatchRequestsScreen';
import { DonationRecordsScreen } from '../screens/bloodbank/DonationRecordsScreen';
import { ComponentSeparationScreen } from '../screens/bloodbank/ComponentSeparationScreen';
import { TransfusionReactionsScreen } from '../screens/bloodbank/TransfusionReactionsScreen';
import { BloodBankMoreScreen } from '../screens/bloodbank/BloodBankMoreScreen';
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type BloodBankStackParamList = {
  BloodBankDashboard: undefined; CrossMatchRequests: undefined; DonationRecords: undefined;
  ComponentSeparation: undefined; TransfusionReactions: undefined; BloodBankMore: undefined;
  StaffChat: undefined; ClinicalAlerts: undefined; SupportTickets: undefined; Settings: undefined;
};

const Stack = createNativeStackNavigator<BloodBankStackParamList>();

export const BloodBankStackNavigator = () => (
  <Stack.Navigator id="BloodBankStack" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="BloodBankDashboard" component={BloodBankHomeScreen} />
    <Stack.Screen name="CrossMatchRequests" component={CrossMatchRequestsScreen} />
    <Stack.Screen name="DonationRecords" component={DonationRecordsScreen} />
    <Stack.Screen name="ComponentSeparation" component={ComponentSeparationScreen} />
    <Stack.Screen name="TransfusionReactions" component={TransfusionReactionsScreen} />
    <Stack.Screen name="BloodBankMore" component={BloodBankMoreScreen} />
    <Stack.Screen name="StaffChat" component={StaffChatScreen} />
    <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
    <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

export default BloodBankStackNavigator;
