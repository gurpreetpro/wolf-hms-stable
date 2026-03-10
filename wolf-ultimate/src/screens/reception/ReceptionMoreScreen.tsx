import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  UserPlus, ListOrdered, CalendarPlus, Search,
  CreditCard, Users, Settings, MessageSquare,
  HelpCircle, BarChart3, ClipboardList,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const SECTIONS = [
  {
    title: 'Registration & Queue',
    items: [
      { icon: UserPlus, label: 'New Registration', screen: 'PatientRegistration', color: '#3b82f6' },
      { icon: ListOrdered, label: 'Token Queue', screen: 'TokenQueue', color: '#10b981' },
      { icon: Search, label: 'Patient Search', screen: 'PatientSearch', color: '#f59e0b' },
      { icon: CalendarPlus, label: 'Book Appointment', screen: 'AppointmentBooking', color: '#8b5cf6' },
    ],
  },
  {
    title: 'Billing & Finance',
    items: [
      { icon: CreditCard, label: 'Billing Counter', screen: 'BillingCounter', color: '#ec4899' },
      { icon: BarChart3, label: 'Day-End Reconciliation', screen: 'DayEndReconciliation', color: '#14b8a6' },
      { icon: ClipboardList, label: 'Visitor Pass', screen: 'VisitorPass', color: '#6366f1' },
    ],
  },
  {
    title: 'General',
    items: [
      { icon: MessageSquare, label: 'Staff Chat', screen: 'StaffChat', color: '#6366f1' },
      { icon: Users, label: 'Doctor Directory', screen: 'Settings', color: '#0ea5e9' },
      { icon: HelpCircle, label: 'Support', screen: 'SupportTickets', color: '#64748b' },
      { icon: Settings, label: 'Settings', screen: 'Settings', color: '#94a3b8' },
    ],
  },
];

export const ReceptionMoreScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}><Text style={styles.headerTitle}>More</Text></View>
        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {SECTIONS.map((section, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <GlassCard style={styles.sectionCard}>
                {section.items.map((item, j) => (
                  <TouchableOpacity key={j} style={styles.menuItem} onPress={() => navigation.navigate(item.screen)}>
                    <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}><item.icon size={22} color={item.color} /></View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </GlassCard>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28 },
  section: { marginBottom: SPACING.l },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' as any, marginBottom: 8, marginLeft: 4 },
  sectionCard: { padding: 4, borderWidth: 0 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 12 },
  menuIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 15 },
});
