import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, AlertTriangle, Phone, CheckCircle2, Clock } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface CriticalFinding {
  id: number; accession_no: string; patient_name: string; patient_uhid: string;
  modality: string; study: string; finding: string;
  ordering_doctor: string; ordering_doctor_phone: string;
  reported_by: string; reported_at: string;
  status: 'PENDING_COMM' | 'COMMUNICATED' | 'ACKNOWLEDGED';
  communicated_to?: string; communicated_at?: string;
  sla_min: number; elapsed_min: number;
}

const MOCK_FINDINGS: CriticalFinding[] = [
  {
    id: 1, accession_no: 'RAD-260305-003', patient_name: 'Vijay Singh', patient_uhid: 'UHID-5003',
    modality: 'MRI', study: 'MRI Brain with Contrast',
    finding: '2.3 cm ring-enhancing lesion in right temporal lobe with surrounding edema and mass effect. Differential: primary CNS neoplasm vs metastasis vs abscess. Urgent neurosurgery consultation recommended.',
    ordering_doctor: 'Dr. Reddy', ordering_doctor_phone: '+91-9876500010',
    reported_by: 'Dr. Mehta (R2)', reported_at: '2026-03-05T10:00:00Z',
    status: 'PENDING_COMM', sla_min: 30, elapsed_min: 12,
  },
  {
    id: 2, accession_no: 'RAD-260304-015', patient_name: 'Geeta Devi', patient_uhid: 'UHID-4008',
    modality: 'CT', study: 'CT Abdomen with Contrast',
    finding: 'Large retroperitoneal hematoma (8 x 6 cm) with active contrast extravasation suggesting ongoing hemorrhage. Recommend emergent IR consultation for embolization.',
    ordering_doctor: 'Dr. Patel', ordering_doctor_phone: '+91-9876500011',
    reported_by: 'Dr. Agarwal (R3)', reported_at: '2026-03-04T22:30:00Z',
    status: 'COMMUNICATED', communicated_to: 'Dr. Patel (by phone)', communicated_at: '2026-03-04T22:42:00Z',
    sla_min: 30, elapsed_min: 12,
  },
  {
    id: 3, accession_no: 'RAD-260304-012', patient_name: 'Arun Mehta', patient_uhid: 'UHID-5006',
    modality: 'X-RAY', study: 'Chest X-Ray',
    finding: 'Large left-sided pneumothorax with mediastinal shift to the right. Tension pneumothorax — urgent chest tube insertion required.',
    ordering_doctor: 'Dr. Sharma', ordering_doctor_phone: '+91-9876500012',
    reported_by: 'Dr. Mehta (R2)', reported_at: '2026-03-04T18:15:00Z',
    status: 'ACKNOWLEDGED', communicated_to: 'Dr. Sharma (in person)', communicated_at: '2026-03-04T18:18:00Z',
    sla_min: 30, elapsed_min: 3,
  },
];

const STATUS_CFG: Record<string, { color: string; label: string; icon: any }> = {
  PENDING_COMM: { color: '#ef4444', label: '⏰ Pending', icon: AlertTriangle },
  COMMUNICATED: { color: '#f59e0b', label: 'Communicated', icon: Phone },
  ACKNOWLEDGED: { color: '#10b981', label: 'Acknowledged', icon: CheckCircle2 },
};

export const CriticalFindingScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [findings, setFindings] = useState(MOCK_FINDINGS);

  const handleCommunicate = (item: CriticalFinding) => {
    Alert.alert('Communicate Critical Finding', `Call ${item.ordering_doctor} at ${item.ordering_doctor_phone}?\n\nFinding: ${item.finding.substring(0, 80)}...`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Communicated', onPress: () => {
        setFindings(prev => prev.map(f => f.id === item.id
          ? { ...f, status: 'COMMUNICATED' as const, communicated_to: `${item.ordering_doctor} (by phone)`, communicated_at: new Date().toISOString() }
          : f));
        Alert.alert('✅ Communicated', `${item.ordering_doctor} has been notified. Read-back confirmed.`);
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Critical Findings</Text>
            <Text style={styles.headerSub}>{findings.filter(f => f.status === 'PENDING_COMM').length} pending communication</Text>
          </View>
        </View>

        {/* SLA Banner */}
        <LinearGradient colors={['#7f1d1d', '#450a0a']} style={styles.slaBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <Text style={styles.slaText}>Critical findings must be communicated within <Text style={{ fontFamily: FONTS.bold }}>30 minutes</Text> of detection (NABH/NABL mandate)</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {findings.map(item => {
            const st = STATUS_CFG[item.status];
            const isOverdue = item.status === 'PENDING_COMM' && item.elapsed_min > item.sla_min;
            return (
              <GlassCard key={item.id} style={[styles.findingCard, item.status === 'PENDING_COMM' && { borderColor: '#ef444440', borderWidth: 1 }]}>
                <View style={styles.findingTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.findingPatient}>{item.patient_name}</Text>
                    <Text style={styles.findingMeta}>{item.accession_no} • {item.modality} • {item.study}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={styles.findingBox}>
                  <Text style={styles.findingText}>{item.finding}</Text>
                </View>

                <View style={styles.findingFooter}>
                  <Text style={styles.footerText}>Reported by: {item.reported_by}</Text>
                  <Text style={styles.footerText}>To: {item.ordering_doctor}</Text>
                  {item.status === 'PENDING_COMM' && (
                    <View style={[styles.slaBadge, isOverdue && { backgroundColor: '#ef444420' }]}>
                      <Clock size={12} color={isOverdue ? '#ef4444' : '#f59e0b'} />
                      <Text style={[styles.slaTime, { color: isOverdue ? '#ef4444' : '#f59e0b' }]}>{item.elapsed_min}m / {item.sla_min}m SLA</Text>
                    </View>
                  )}
                  {item.communicated_to && (
                    <Text style={[styles.footerText, { color: '#10b981' }]}>✅ {item.communicated_to} at {new Date(item.communicated_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  )}
                </View>

                {item.status === 'PENDING_COMM' && (
                  <TouchableOpacity style={styles.commBtn} onPress={() => handleCommunicate(item)}>
                    <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.commGrad}>
                      <Phone size={18} color="#fff" /><Text style={styles.commText}>📞 Call {item.ordering_doctor} Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </GlassCard>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  slaBanner: { marginHorizontal: SPACING.m, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.s },
  slaText: { fontFamily: FONTS.regular, color: '#fca5a5', fontSize: 12, flex: 1, lineHeight: 18 },
  findingCard: { padding: SPACING.m, marginBottom: 14, borderWidth: 0 },
  findingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  findingPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  findingMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  findingBox: { backgroundColor: '#ef444408', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ef444420', marginBottom: 8 },
  findingText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13, lineHeight: 20 },
  findingFooter: { gap: 4, marginBottom: 8 },
  footerText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  slaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#f59e0b15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 2 },
  slaTime: { fontFamily: FONTS.bold, fontSize: 11 },
  commBtn: { borderRadius: 14, overflow: 'hidden' },
  commGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  commText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
});
