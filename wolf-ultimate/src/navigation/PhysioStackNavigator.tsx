import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Phase 17A — Core PT Screens
import { PhysioHomeScreen } from '../screens/physio/PhysioHomeScreen';
import { ExercisePrescriptionScreen } from '../screens/physio/ExercisePrescriptionScreen';
import { SessionLogScreen } from '../screens/physio/SessionLogScreen';
import { PhysioMoreScreen } from '../screens/physio/PhysioMoreScreen';
// Phase 17B — Assessment & Outcomes
import { ADLAssessmentScreen } from '../screens/physio/ADLAssessmentScreen';
import { OutcomeScoringScreen } from '../screens/physio/OutcomeScoringScreen';
// Phase 17C — Rehab AI & Home Exercise
import { RehabProgressScreen } from '../screens/physio/RehabProgressScreen';
import { HomeExerciseScreen } from '../screens/physio/HomeExerciseScreen';
// Shared screens
import { StaffChatScreen } from '../screens/shared/StaffChatScreen';
import { ClinicalAlertsScreen } from '../screens/shared/ClinicalAlertsScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

export type PhysioStackParamList = {
  PhysioDashboard: undefined;
  ExercisePrescription: undefined;
  SessionLog: undefined;
  PhysioMore: undefined;
  // Phase 17B
  ADLAssessment: undefined;
  OutcomeScoring: undefined;
  // Phase 17C
  RehabProgress: undefined;
  HomeExercise: undefined;
  // Shared
  StaffChat: undefined;
  ClinicalAlerts: undefined;
  SupportTickets: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<PhysioStackParamList>();

export const PhysioStackNavigator = () => {
  return (
    <Stack.Navigator
      id="PhysioStack"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      {/* Phase 17A — Core */}
      <Stack.Screen name="PhysioDashboard" component={PhysioHomeScreen} />
      <Stack.Screen name="ExercisePrescription" component={ExercisePrescriptionScreen} />
      <Stack.Screen name="SessionLog" component={SessionLogScreen} />
      <Stack.Screen name="PhysioMore" component={PhysioMoreScreen} />
      {/* Phase 17B — Assessment & Outcomes */}
      <Stack.Screen name="ADLAssessment" component={ADLAssessmentScreen} />
      <Stack.Screen name="OutcomeScoring" component={OutcomeScoringScreen} />
      {/* Phase 17C — Rehab & Home Exercise */}
      <Stack.Screen name="RehabProgress" component={RehabProgressScreen} />
      <Stack.Screen name="HomeExercise" component={HomeExerciseScreen} />
      {/* Shared */}
      <Stack.Screen name="StaffChat" component={StaffChatScreen} />
      <Stack.Screen name="ClinicalAlerts" component={ClinicalAlertsScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default PhysioStackNavigator;
