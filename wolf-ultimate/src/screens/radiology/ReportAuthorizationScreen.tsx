import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, FileText, Clock } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface PendingReport {
  id: number; accession_no: string; patient_name: string; modality: string;
  study: string; reported_by: string; reported_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  findings_preview: string; critical: boolean;
}

const MOCK_REPORTS: PendingReport[] = [
  { id: 1, accession_no: 'RAD-260305-001', patient_name: 'Rakesh Kumar', modality: 'CT', study: 'CT Chest with Contrast', reported_by: 'Dr. Mehta (R2)', reported_at: '2026-03-05T09:45:00Z', status: 'PENDING', findings_preview: 'No pulmonary embolism identified. Lung parenchyma is clear bilaterally...', critical: false },
  { id: 2, accession_no: 'RAD-260305-003', patient_name: 'Vijay Singh', modality: 'MRI', study: 'MRI Brain with Contrast', reported_by: 'Dr. Mehta (R2)', reported_at: '2026-03-05T10:00:00Z', status: 'PENDING', findings_preview: 'A 2.3 cm ring-enhancing lesion in the right temporal lobe with surrounding edema...', critical: true },
  { id: 3, accession_no: 'RAD-260305-005', patient_name: 'Mohan Lal', modality: 'X-RAY', study: 'X-Ray Knee AP/Lat', reported_by: 'Dr. Agarwal (R3)', reported_at: '2026-03-05T09:30:00Z', status: 'APPROVED', findings_preview: 'Mild medial joint space narrowing. No fracture. Small osteophytes noted...', critical: false },
];

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  PENDING: { color: '#f59e0b', label: 'Pending' },
  APPROVED: { color: '#10b981', label: 'Approved' },
  REJECTED: { color: '#ef4444', label: 'Rejected' },
};

export const ReportAuthorizationScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [filter, setFilter] = useState('PENDING');

  const filtered = reports.filter(r => filter === 'ALL' || r.status === filter);
  const pendingCount = reports.filter(r => r.status === 'PENDING').length;

  const handleAction = (report: PendingReport, action: 'APPROVED' | 'REJECTED') => {
    const label = action === 'APPROVED' ? 'Approve' : 'Reject';
    Alert.alert(`${label} Report`, `${label} ${report.patient_name}'s ${report.study} report?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: action === 'REJECTED' ? 'destructive' : 'default', onPress: () => {
        setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: action } : r));
        Alert.alert(action === 'APPROVED' ? '✅ Approved' : '❌ Rejected',
          action === 'APPROVED' ? 'Report finalized and released.' : 'Sent back to reporting radiologist.');
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
            <Text style={styles.headerTitle}>Report Authorization</Text>
            <Text style={styles.headerSub}>{pendingCount} reports awaiting approval</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {[{ key: 'PENDING', label: 'Pending' }, { key: 'APPROVED', label: 'Approved' }, { key: 'REJECTED', label: 'Rejected' }, { key: 'ALL', label: 'All' }].map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {filtered.map(report => {
            const st = STATUS_CFG[report.status];
            return (
              <GlassCard key={report.id} style={styles.reportCard}>
                <View style={styles.reportTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.reportPatient}>{report.patient_name}</Text>
                      {report.critical && <View style={styles.critBadge}><Text style={styles.critText}>⚠️ CRITICAL</Text></View>}
                    </View>
                    <Text style={styles.reportMeta}>{report.accession_no} • {report.modality} • {report.study}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={styles.findingsBox}>
                  <Text style={styles.findingsPreview}>{report.findings_preview}</Text>
                </View>

                <View style={styles.reportFooter}>
                  <View style={styles.reporterRow}>
                    <FileText size={12} color={COLORS.textMuted} />
                    <Text style={styles.reporterText}>By: {report.reported_by}</Text>
                  </View>
                  <View style={styles.reporterRow}>
                    <Clock size={12} color={COLORS.textMuted} />
                    <Text style={styles.reporterText}>{new Date(report.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </View>

                {report.status === 'PENDING' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleAction(report, 'APPROVED')}>
                      <CheckCircle2 size={16} color="#10b981" /><Text style={styles.approveText}>Approve & Release</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(report, 'REJECTED')}>
                      <XCircle size={16} color="#ef4444" /><Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
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
  filterScroll: { marginBottom: 4, maxHeight: 42 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: '#3b82f620', borderColor: '#3b82f6' },
  filterText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterTextActive: { color: '#3b82f6' },
  reportCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  reportTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  critBadge: { backgroundColor: '#ef444420', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  critText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 9 },
  reportMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  findingsBox: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  findingsPreview: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  reportFooter: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reporterText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#10b98115', borderWidth: 1, borderColor: '#10b98130' },
  approveText: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 12 },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430' },
  rejectText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 12 },
});
