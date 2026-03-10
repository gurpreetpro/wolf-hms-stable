import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Phase 18A — Core Diet Screens
import { DietHomeScreen } from '../screens/diet/DietHomeScreen';
import { MealPlanningScreen } from '../screens/diet/MealPlanningScreen';
import { KitchenOrdersScreen } from '../screens/diet/KitchenOrdersScreen';
import { DietMoreScreen } from '../screens/diet/DietMoreScreen';
// Phase 18B — Allergy Management
import { AllergyManagementScreen } from '../screens/diet/AllergyManagementScreen';
// Phase 18C — Nutrition Analytics
import { NutritionAnalyticsScreen } from '../screens/diet/NutritionAnalyticsScreen';
// Shared screens
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type DietStackParamList = {
  DietDashboard: undefined;
  MealPlanning: undefined;
  KitchenOrders: undefined;
  DietMore: undefined;
  AllergyManagement: undefined;
  NutritionAnalytics: undefined;
  StaffChat: undefined;
  ClinicalAlerts: undefined;
  SupportTickets: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<DietStackParamList>();

export const DietStackNavigator = () => {
  return (
    <Stack.Navigator
      id="DietStack"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="DietDashboard" component={DietHomeScreen} />
      <Stack.Screen name="MealPlanning" component={MealPlanningScreen} />
      <Stack.Screen name="KitchenOrders" component={KitchenOrdersScreen} />
      <Stack.Screen name="DietMore" component={DietMoreScreen} />
      <Stack.Screen name="AllergyManagement" component={AllergyManagementScreen} />
      <Stack.Screen name="NutritionAnalytics" component={NutritionAnalyticsScreen} />
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default DietStackNavigator;
