import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TestTubes, AlertTriangle, Settings, CheckCircle2, ClipboardList,
  ChevronRight, FlaskConical, MessageSquare, BarChart3,
  FileText, HelpCircle, Package, Microscope,
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

export const LabMoreScreen = ({ navigation }: any) => {
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
          <Text style={styles.sectionTitle}>Lab Operations</Text>
          <MenuItem icon={TestTubes} label="Sample Worklist" subtitle="View all pending & in-progress samples" color="#3b82f6"
            onPress={() => navigation.navigate('SampleWorklist')} />
          <MenuItem icon={ClipboardList} label="Result Entry" subtitle="Enter and submit test results" color="#10b981"
            onPress={() => navigation.navigate('ResultEntry', { sampleId: 'LAB-260303-0042', testName: 'CBC' })} />
          <MenuItem icon={CheckCircle2} label="Verification Queue" subtitle="Pathologist review & authorization" color="#8b5cf6"
            onPress={() => navigation.navigate('PathologistVerify')} />
          <MenuItem icon={AlertTriangle} label="Critical Values" subtitle="Active critical alerts & notifications" color="#ef4444"
            onPress={() => navigation.navigate('CriticalValues')} />
          <MenuItem icon={BarChart3} label="QC / Calibration" subtitle="Daily QC runs & equipment logs" color="#f59e0b"
            onPress={() => navigation.navigate('QCCalibration')} />
          <MenuItem icon={Package} label="Reagent Stock" subtitle="Inventory, lot tracking, expiry alerts" color="#06b6d4"
            onPress={() => navigation.navigate('ReagentStock')} />

          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>AI & Clinical</Text>
          <MenuItem icon={Microscope} label="Lab AI Assistant" subtitle="AI-powered result interpretation" color="#0ea5e9"
            onPress={() => navigation.navigate('LabAI')} />
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
