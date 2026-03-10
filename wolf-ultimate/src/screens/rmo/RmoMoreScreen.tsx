import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarClock, Phone, Settings, Shield, ClipboardList,
  Moon, Siren, ChevronRight, Stethoscope, MessageSquare,
  FileText, HelpCircle,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface MenuItemProps {
  icon: React.ComponentType<any>;
  label: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

export const RmoMoreScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const MenuItem = ({ icon: Icon, label, subtitle, color, onPress }: MenuItemProps) => (
    <TouchableOpacity onPress={onPress}>
      <GlassCard style={styles.menuItem}>
        <View style={[styles.menuIcon, { backgroundColor: color + '15' }]}>
          <Icon size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.menuLabel}>{label}</Text>
          <Text style={styles.menuSub}>{subtitle}</Text>
        </View>
        <ChevronRight size={18} color={COLORS.textMuted} />
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          <Text style={styles.sectionTitle}>RMO Tools</Text>
          <MenuItem icon={CalendarClock} label="Duty Roster" subtitle="View shifts & request swaps" color="#3b82f6"
            onPress={() => navigation.navigate('DutyRoster')} />
          <MenuItem icon={Phone} label="Consultant Status" subtitle="Check availability & contact" color="#10b981"
            onPress={() => navigation.navigate('ConsultantStatus')} />
          <MenuItem icon={Shield} label="Escalations" subtitle="View & manage escalations" color="#f59e0b"
            onPress={() => navigation.navigate('Escalation')} />
          <MenuItem icon={ClipboardList} label="Shift Handover" subtitle="SBAR handover notes" color="#8b5cf6"
            onPress={() => navigation.navigate('ShiftHandover')} />
          <MenuItem icon={Moon} label="Night Dashboard" subtitle="After-hours critical overview" color="#6366f1"
            onPress={() => navigation.navigate('NightDashboard')} />
          <MenuItem icon={Siren} label="Emergency" subtitle="First-response triage" color="#ef4444"
            onPress={() => navigation.navigate('RmoEmergency')} />

          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Clinical</Text>
          <MenuItem icon={Stethoscope} label="AI Clinical Assistant" subtitle="AI-powered clinical support" color="#0ea5e9"
            onPress={() => navigation.navigate('AIClinical')} />
          <MenuItem icon={FileText} label="Clinical Alerts" subtitle="View active alerts" color="#f97316"
            onPress={() => navigation.navigate('ClinicalAlerts')} />
          <MenuItem icon={MessageSquare} label="Staff Chat" subtitle="Team communication" color="#14b8a6"
            onPress={() => navigation.navigate('StaffChat')} />

          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>General</Text>
          <MenuItem icon={HelpCircle} label="Support" subtitle="Raise a ticket" color="#64748b"
            onPress={() => navigation.navigate('SupportTickets')} />
          <MenuItem icon={Settings} label="Settings" subtitle="App preferences" color="#94a3b8"
            onPress={() => navigation.navigate('Settings')} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.m,
    marginTop: SPACING.m,
  },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28 },
  sectionTitle: {
    fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 12,
    textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: SPACING.s,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: SPACING.m, marginBottom: 8, borderWidth: 0,
  },
  menuIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  menuSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 1 },
});
