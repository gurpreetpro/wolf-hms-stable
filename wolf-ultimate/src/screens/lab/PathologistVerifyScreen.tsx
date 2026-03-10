import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCcw,
  AlertTriangle, Clock, User, FileText,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import labService from '../../services/labService';

interface VerificationItem {
  id: number;
  sample_id: string;
  patient_name: string;
  patient_uhid: string;
  test_name: string;
  department: string;
  parameters: { name: string; value: string; unit: string; flag: string }[];
  resulted_by: string;
  resulted_at: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
}

// Mock pending verifications
const MOCK_PENDING: VerificationItem[] = [
  {
    id: 1, sample_id: 'LAB-260303-0046', patient_name: 'Suresh Yadav', patient_uhid: 'UHID-1005',
    test_name: 'HbA1c', department: 'Biochemistry', priority: 'ROUTINE',
    parameters: [{ name: 'HbA1c', value: '7.8', unit: '%', flag: 'HIGH' }],
    resulted_by: 'Tech Sunita', resulted_at: '2026-03-03T09:40:00Z',
  },
  {
    id: 2, sample_id: 'LAB-260303-0038', patient_name: 'Arun Mehta', patient_uhid: 'UHID-0997',
    test_name: 'Complete Blood Count', department: 'Hematology', priority: 'URGENT',
    parameters: [
      { name: 'Hemoglobin', value: '9.2', unit: 'g/dL', flag: 'LOW' },
      { name: 'WBC', value: '15400', unit: '/μL', flag: 'HIGH' },
      { name: 'Platelets', value: '195000', unit: '/μL', flag: 'NORMAL' },
    ],
    resulted_by: 'Tech Ravi', resulted_at: '2026-03-03T09:15:00Z',
  },
  {
    id: 3, sample_id: 'LAB-260303-0040', patient_name: 'Deepa Sharma', patient_uhid: 'UHID-0996',
    test_name: 'Liver Function Test', department: 'Biochemistry', priority: 'ROUTINE',
    parameters: [
      { name: 'Bilirubin (Total)', value: '2.8', unit: 'mg/dL', flag: 'HIGH' },
      { name: 'ALT', value: '85', unit: 'U/L', flag: 'HIGH' },
      { name: 'AST', value: '72', unit: 'U/L', flag: 'HIGH' },
      { name: 'ALP', value: '110', unit: 'U/L', flag: 'NORMAL' },
      { name: 'Albumin', value: '3.8', unit: 'g/dL', flag: 'NORMAL' },
    ],
    resulted_by: 'Tech Meena', resulted_at: '2026-03-03T09:30:00Z',
  },
  {
    id: 4, sample_id: 'LAB-260303-0050', patient_name: 'Vikram Singh', patient_uhid: 'UHID-1009',
    test_name: 'Thyroid Profile', department: 'Biochemistry', priority: 'ROUTINE',
    parameters: [
      { name: 'TSH', value: '8.5', unit: 'mIU/L', flag: 'HIGH' },
      { name: 'Free T4', value: '0.7', unit: 'ng/dL', flag: 'LOW' },
      { name: 'Free T3', value: '2.1', unit: 'pg/mL', flag: 'NORMAL' },
    ],
    resulted_by: 'Tech Sunita', resulted_at: '2026-03-03T10:00:00Z',
  },
  {
    id: 5, sample_id: 'LAB-260303-0051', patient_name: 'Neha Patel', patient_uhid: 'UHID-1010',
    test_name: 'Renal Function Test', department: 'Biochemistry', priority: 'STAT',
    parameters: [
      { name: 'Creatinine', value: '3.8', unit: 'mg/dL', flag: 'CRITICAL_HIGH' },
      { name: 'BUN', value: '52', unit: 'mg/dL', flag: 'HIGH' },
      { name: 'Uric Acid', value: '8.2', unit: 'mg/dL', flag: 'HIGH' },
    ],
    resulted_by: 'Tech Ravi', resulted_at: '2026-03-03T10:10:00Z',
  },
];

const FLAG_COLORS: Record<string, string> = {
  NORMAL: '#10b981', LOW: '#3b82f6', HIGH: '#f59e0b',
  CRITICAL_LOW: '#ef4444', CRITICAL_HIGH: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  STAT: '#ef4444', URGENT: '#f59e0b', ROUTINE: '#64748b',
};

export const PathologistVerifyScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [items, setItems] = useState<VerificationItem[]>(MOCK_PENDING);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleApprove = (id: number) => {
    Alert.alert('✅ Approved', 'Result verified and released to patient record.', [
      { text: 'OK', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) },
    ]);
  };

  const handleReject = (id: number) => {
    if (selectedId === id) {
      Alert.alert('❌ Rejected', 'Result sent back for repeat testing.', [
        { text: 'OK', onPress: () => { setItems(prev => prev.filter(i => i.id !== id)); setSelectedId(null); setRejectNotes(''); } },
      ]);
    } else {
      setSelectedId(id);
    }
  };

  const handleRepeat = (id: number) => {
    Alert.alert('🔄 Repeat Requested', 'Sample flagged for repeat testing.', [
      { text: 'OK', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Verification Queue</Text>
            <Text style={styles.headerSub}>{items.length} results awaiting pathologist review</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {items.map(item => {
            const hasCritical = item.parameters.some(p => p.flag === 'CRITICAL_HIGH' || p.flag === 'CRITICAL_LOW');
            return (
              <GlassCard key={item.id} style={[styles.verifyCard, hasCritical && styles.criticalBorder]}>
                {/* Header */}
                <View style={styles.vTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.vTitleRow}>
                      <Text style={styles.vTestName}>{item.test_name}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] + '20' }]}>
                        <Text style={[styles.priorityText, { color: PRIORITY_COLORS[item.priority] }]}>{item.priority}</Text>
                      </View>
                    </View>
                    <Text style={styles.vPatient}>{item.patient_name} • {item.patient_uhid}</Text>
                    <Text style={styles.vMeta}>{item.sample_id} • {item.department}</Text>
                  </View>
                </View>

                {/* Parameters Table */}
                <View style={styles.paramTable}>
                  <View style={styles.paramHeaderRow}>
                    <Text style={[styles.paramHeaderText, { flex: 2 }]}>Parameter</Text>
                    <Text style={[styles.paramHeaderText, { flex: 1 }]}>Value</Text>
                    <Text style={[styles.paramHeaderText, { flex: 1 }]}>Flag</Text>
                  </View>
                  {item.parameters.map((p, idx) => (
                    <View key={idx} style={styles.paramRow}>
                      <Text style={[styles.paramName, { flex: 2 }]}>{p.name}</Text>
                      <Text style={[styles.paramValue, { flex: 1, color: FLAG_COLORS[p.flag] || COLORS.text }]}>
                        {p.value} {p.unit}
                      </Text>
                      <View style={[styles.flagChip, { backgroundColor: (FLAG_COLORS[p.flag] || '#64748b') + '20', flex: 1 }]}>
                        <Text style={[styles.flagText, { color: FLAG_COLORS[p.flag] || '#64748b' }]}>
                          {p.flag.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Resulted By */}
                <View style={styles.vFooterInfo}>
                  <User size={12} color={COLORS.textMuted} />
                  <Text style={styles.vFooterText}>{item.resulted_by}</Text>
                  <Clock size={12} color={COLORS.textMuted} />
                  <Text style={styles.vFooterText}>
                    {new Date(item.resulted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* Reject notes */}
                {selectedId === item.id && (
                  <TextInput
                    style={styles.rejectInput}
                    placeholder="Reason for rejection..."
                    placeholderTextColor={COLORS.textMuted}
                    value={rejectNotes}
                    onChangeText={setRejectNotes}
                    multiline
                  />
                )}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item.id)}>
                    <CheckCircle2 size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.repeatBtn]} onPress={() => handleRepeat(item.id)}>
                    <RotateCcw size={16} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Repeat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.id)}>
                    <XCircle size={16} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          })}

          {items.length === 0 && (
            <View style={styles.emptyState}>
              <CheckCircle2 size={48} color="#10b981" />
              <Text style={styles.emptyText}>All Clear!</Text>
              <Text style={styles.emptySubtext}>No results pending verification</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m,
  },
  backBtn: {
    padding: 10, backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  // Verify Card
  verifyCard: { padding: SPACING.m, marginBottom: 14, borderWidth: 0 },
  criticalBorder: { borderWidth: 1, borderColor: '#ef444440' },
  vTop: { flexDirection: 'row', marginBottom: 10 },
  vTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vTestName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priorityText: { fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.5 },
  vPatient: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13, marginTop: 4 },
  vMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  // Param Table
  paramTable: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 10, marginBottom: 10 },
  paramHeaderRow: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 6 },
  paramHeaderText: { fontFamily: FONTS.bold, color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  paramRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  paramName: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13 },
  paramValue: { fontFamily: FONTS.bold, fontSize: 13 },
  flagChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignItems: 'center' },
  flagText: { fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.3 },
  // Footer
  vFooterInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  vFooterText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  // Reject input
  rejectInput: {
    fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#ef444440', marginBottom: 10, minHeight: 50,
  },
  // Action Row
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
  },
  approveBtn: { backgroundColor: '#10b981' },
  repeatBtn: { backgroundColor: '#f59e0b20', borderWidth: 1, borderColor: '#f59e0b40' },
  rejectBtn: { backgroundColor: '#ef444420', borderWidth: 1, borderColor: '#ef444440' },
  actionBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 12 },
  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22, marginTop: 16 },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
});
