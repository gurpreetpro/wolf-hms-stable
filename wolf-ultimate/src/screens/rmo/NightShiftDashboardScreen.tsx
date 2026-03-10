import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Moon, AlertTriangle, BedDouble, Activity, Phone,
  Sparkles, ChevronRight, Clock, Siren, FlaskConical,
  Heart, Droplets, Thermometer,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

// Risk levels for AI deterioration
type RiskLevel = 'critical' | 'high' | 'moderate' | 'stable';

interface NightPatient {
  id: string;
  name: string;
  ward: string;
  bed: string;
  diagnosis: string;
  risk: RiskLevel;
  aiRiskScore: number; // 0-100
  vitals: { hr: number; bp: string; spo2: number; temp: number };
  pendingLabs: boolean;
  pendingMeds: boolean;
  lastChecked: string;
}

const MOCK_PATIENTS: NightPatient[] = [
  { id: 'P001', name: 'Rajesh Kumar', ward: 'ICU', bed: '3', diagnosis: 'ARDS', risk: 'critical', aiRiskScore: 92, vitals: { hr: 115, bp: '88/55', spo2: 86, temp: 100.8 }, pendingLabs: true, pendingMeds: false, lastChecked: '20 min ago' },
  { id: 'P004', name: 'Meena Sharma', ward: 'ICU', bed: '5', diagnosis: 'Sepsis', risk: 'critical', aiRiskScore: 85, vitals: { hr: 120, bp: '82/50', spo2: 93, temp: 102.4 }, pendingLabs: false, pendingMeds: true, lastChecked: '35 min ago' },
  { id: 'P005', name: 'Sanjay Mehta', ward: 'Ward C', bed: '301', diagnosis: 'Acute Stroke', risk: 'high', aiRiskScore: 68, vitals: { hr: 90, bp: '165/95', spo2: 95, temp: 99.0 }, pendingLabs: true, pendingMeds: false, lastChecked: '1 hr ago' },
  { id: 'P002', name: 'Sunita Devi', ward: 'Ward B', bed: '204', diagnosis: 'AKI', risk: 'high', aiRiskScore: 62, vitals: { hr: 88, bp: '145/92', spo2: 96, temp: 98.6 }, pendingLabs: true, pendingMeds: true, lastChecked: '45 min ago' },
  { id: 'P003', name: 'Amit Patel', ward: 'Ward A', bed: '112', diagnosis: 'Post-op', risk: 'moderate', aiRiskScore: 35, vitals: { hr: 80, bp: '118/76', spo2: 97, temp: 100.6 }, pendingLabs: false, pendingMeds: true, lastChecked: '2 hrs ago' },
  { id: 'P006', name: 'Ravi Shankar', ward: 'Ward C', bed: '302', diagnosis: 'CAP', risk: 'stable', aiRiskScore: 15, vitals: { hr: 78, bp: '122/78', spo2: 96, temp: 99.2 }, pendingLabs: false, pendingMeds: false, lastChecked: '3 hrs ago' },
];

const MOCK_ON_CALL = [
  { name: 'Dr. Rao', dept: 'Anaesthesia / Critical Care', status: 'ON_CALL' },
  { name: 'Dr. Verma', dept: 'Cardiology', status: 'ON_CALL' },
  { name: 'Dr. Desai', dept: 'Gynaecology', status: 'AVAILABLE' },
];

const getRiskConfig = (risk: RiskLevel) => {
  switch (risk) {
    case 'critical': return { color: '#ef4444', emoji: '🔴', label: 'CRITICAL' };
    case 'high': return { color: '#f59e0b', emoji: '🟠', label: 'HIGH' };
    case 'moderate': return { color: '#3b82f6', emoji: '🟡', label: 'MODERATE' };
    case 'stable': return { color: '#22c55e', emoji: '🟢', label: 'STABLE' };
  }
};

export const NightShiftDashboardScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [refreshing, setRefreshing] = useState(false);

  const criticalCount = MOCK_PATIENTS.filter(p => p.risk === 'critical').length;
  const highCount = MOCK_PATIENTS.filter(p => p.risk === 'high').length;
  const pendingLabsCount = MOCK_PATIENTS.filter(p => p.pendingLabs).length;
  const pendingMedsCount = MOCK_PATIENTS.filter(p => p.pendingMeds).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0c0a1d', '#1a1333']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Moon size={24} color="#a78bfa" />
            <View>
              <Text style={styles.headerTitle}>Night Dashboard</Text>
              <Text style={styles.headerSub}>After-hours critical overview</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('RmoEmergency')} style={styles.emergencyBtn}>
            <Siren size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor="#a78bfa" />}
        >
          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.qStat}>
              <Text style={[styles.qStatValue, { color: '#ef4444' }]}>{criticalCount}</Text>
              <Text style={styles.qStatLabel}>Critical</Text>
            </View>
            <View style={styles.qStatDivider} />
            <View style={styles.qStat}>
              <Text style={[styles.qStatValue, { color: '#f59e0b' }]}>{highCount}</Text>
              <Text style={styles.qStatLabel}>High Risk</Text>
            </View>
            <View style={styles.qStatDivider} />
            <View style={styles.qStat}>
              <Text style={[styles.qStatValue, { color: '#3b82f6' }]}>{pendingLabsCount}</Text>
              <Text style={styles.qStatLabel}>Pending Labs</Text>
            </View>
            <View style={styles.qStatDivider} />
            <View style={styles.qStat}>
              <Text style={[styles.qStatValue, { color: '#8b5cf6' }]}>{pendingMedsCount}</Text>
              <Text style={styles.qStatLabel}>Due Meds</Text>
            </View>
          </View>

          {/* AI Deterioration Alert */}
          {MOCK_PATIENTS.filter(p => p.aiRiskScore > 80).length > 0 && (
            <LinearGradient colors={['#7f1d1d', '#450a0a']} style={styles.aiAlertBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="#fca5a5" />
                <Text style={styles.aiAlertTitle}>AI Deterioration Alert</Text>
              </View>
              <Text style={styles.aiAlertText}>
                {MOCK_PATIENTS.filter(p => p.aiRiskScore > 80).length} patient(s) have &gt;80% deterioration risk. ICU transfer may be needed within 6 hours.
              </Text>
            </LinearGradient>
          )}

          {/* Patient Cards — sorted by risk */}
          <Text style={styles.sectionTitle}>All Patients (by risk)</Text>
          {MOCK_PATIENTS.map(patient => {
            const riskConfig = getRiskConfig(patient.risk);
            return (
              <GlassCard key={patient.id} style={[styles.patientCard, { borderLeftWidth: 3, borderLeftColor: riskConfig.color }]}>
                <View style={styles.patientTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.patientMeta}>{patient.ward} • Bed {patient.bed} • {patient.diagnosis}</Text>
                  </View>
                  {/* AI Risk Score */}
                  <View style={[styles.riskBadge, { backgroundColor: riskConfig.color + '20' }]}>
                    <Sparkles size={10} color={riskConfig.color} />
                    <Text style={[styles.riskScore, { color: riskConfig.color }]}>{patient.aiRiskScore}%</Text>
                  </View>
                </View>

                {/* Vitals inline */}
                <View style={styles.vitalsRow}>
                  <View style={styles.vitalChip}>
                    <Heart size={10} color={patient.vitals.hr > 100 ? '#ef4444' : '#64748b'} />
                    <Text style={[styles.vitalText, patient.vitals.hr > 100 && { color: '#ef4444' }]}>{patient.vitals.hr}</Text>
                  </View>
                  <View style={styles.vitalChip}>
                    <Activity size={10} color="#64748b" />
                    <Text style={styles.vitalText}>{patient.vitals.bp}</Text>
                  </View>
                  <View style={styles.vitalChip}>
                    <Droplets size={10} color={patient.vitals.spo2 < 92 ? '#ef4444' : '#64748b'} />
                    <Text style={[styles.vitalText, patient.vitals.spo2 < 92 && { color: '#ef4444' }]}>{patient.vitals.spo2}%</Text>
                  </View>
                  <View style={styles.vitalChip}>
                    <Thermometer size={10} color={patient.vitals.temp > 100 ? '#f59e0b' : '#64748b'} />
                    <Text style={[styles.vitalText, patient.vitals.temp > 100 && { color: '#f59e0b' }]}>{patient.vitals.temp}°</Text>
                  </View>
                </View>

                {/* Flags */}
                <View style={styles.flagsRow}>
                  {patient.pendingLabs && (
                    <View style={styles.flag}>
                      <FlaskConical size={10} color="#3b82f6" />
                      <Text style={styles.flagText}>Labs pending</Text>
                    </View>
                  )}
                  {patient.pendingMeds && (
                    <View style={styles.flag}>
                      <Clock size={10} color="#8b5cf6" />
                      <Text style={styles.flagText}>Meds due</Text>
                    </View>
                  )}
                  <Text style={styles.lastChecked}>Checked {patient.lastChecked}</Text>
                </View>
              </GlassCard>
            );
          })}

          {/* On-Call Consultants */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>On-Call Consultants</Text>
          {MOCK_ON_CALL.map((doc, i) => (
            <GlassCard key={i} style={styles.onCallCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.onCallName}>{doc.name}</Text>
                <Text style={styles.onCallDept}>{doc.dept}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn}>
                <Phone size={16} color="#22c55e" />
              </TouchableOpacity>
            </GlassCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0a1d' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.m, marginTop: SPACING.s,
  },
  headerTitle: { fontFamily: FONTS.bold, color: '#e2e8f0', fontSize: 20 },
  headerSub: { fontFamily: FONTS.regular, color: '#64748b', fontSize: 12 },
  emergencyBtn: {
    padding: 12, backgroundColor: '#ef4444', borderRadius: 16,
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  // Quick Stats
  quickStats: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16,
    marginBottom: SPACING.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  qStat: { alignItems: 'center' },
  qStatValue: { fontFamily: FONTS.bold, fontSize: 22 },
  qStatLabel: { fontFamily: FONTS.medium, color: '#64748b', fontSize: 10, marginTop: 2 },
  qStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },
  // AI Alert
  aiAlertBanner: {
    borderRadius: 16, padding: 14, marginBottom: SPACING.m,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  aiAlertTitle: { fontFamily: FONTS.bold, color: '#fca5a5', fontSize: 13 },
  aiAlertText: { fontFamily: FONTS.regular, color: '#fca5a580', fontSize: 12, marginTop: 6, lineHeight: 18 },
  sectionTitle: { fontFamily: FONTS.bold, color: '#94a3b8', fontSize: 13, marginBottom: SPACING.s, textTransform: 'uppercase' as any, letterSpacing: 1 },
  // Patient Cards
  patientCard: { marginBottom: 10, padding: 14, borderWidth: 0, backgroundColor: 'rgba(255,255,255,0.03)' },
  patientTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  patientName: { fontFamily: FONTS.bold, color: '#e2e8f0', fontSize: 15 },
  patientMeta: { fontFamily: FONTS.medium, color: '#64748b', fontSize: 12, marginTop: 2 },
  riskBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  riskScore: { fontFamily: FONTS.bold, fontSize: 12 },
  // Vitals
  vitalsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  vitalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  vitalText: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 11 },
  // Flags
  flagsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flagText: { fontFamily: FONTS.medium, color: '#64748b', fontSize: 10 },
  lastChecked: { fontFamily: FONTS.regular, color: '#475569', fontSize: 10, marginLeft: 'auto' },
  // On-Call
  onCallCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8,
    borderWidth: 0, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  onCallName: { fontFamily: FONTS.bold, color: '#e2e8f0', fontSize: 14 },
  onCallDept: { fontFamily: FONTS.medium, color: '#64748b', fontSize: 12, marginTop: 2 },
  callBtn: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#22c55e15',
  },
});
