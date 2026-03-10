import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  BarChart3, Activity, Clock, ChevronDown,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import type { QCRun } from '../../services/labService';

// Mock QC data
const MOCK_QC_RUNS: QCRun[] = [
  { id: 1, test_name: 'Hemoglobin', analyzer: 'Sysmex XN-1000', level: 'L1', result: 8.2, expected_mean: 8.1, sd: 0.3, status: 'ACCEPTED', run_by: 'Tech Ravi', run_at: '2026-03-03T07:30:00Z' },
  { id: 2, test_name: 'Hemoglobin', analyzer: 'Sysmex XN-1000', level: 'L2', result: 13.5, expected_mean: 13.4, sd: 0.4, status: 'ACCEPTED', run_by: 'Tech Ravi', run_at: '2026-03-03T07:32:00Z' },
  { id: 3, test_name: 'Glucose', analyzer: 'Vitros 5600', level: 'L1', result: 85, expected_mean: 82, sd: 3.5, status: 'ACCEPTED', run_by: 'Tech Sunita', run_at: '2026-03-03T07:35:00Z' },
  { id: 4, test_name: 'Glucose', analyzer: 'Vitros 5600', level: 'L2', result: 210, expected_mean: 200, sd: 6, status: 'WARNING', run_by: 'Tech Sunita', run_at: '2026-03-03T07:37:00Z' },
  { id: 5, test_name: 'Creatinine', analyzer: 'Vitros 5600', level: 'L1', result: 1.1, expected_mean: 1.0, sd: 0.08, status: 'ACCEPTED', run_by: 'Tech Sunita', run_at: '2026-03-03T07:40:00Z' },
  { id: 6, test_name: 'Creatinine', analyzer: 'Vitros 5600', level: 'L2', result: 5.8, expected_mean: 5.0, sd: 0.3, status: 'REJECTED', run_by: 'Tech Sunita', run_at: '2026-03-03T07:42:00Z' },
  { id: 7, test_name: 'PT/INR', analyzer: 'Stago STA-R', level: 'L1', result: 12.5, expected_mean: 12.3, sd: 0.5, status: 'ACCEPTED', run_by: 'Tech Ravi', run_at: '2026-03-03T08:00:00Z' },
  { id: 8, test_name: 'TSH', analyzer: 'Cobas e601', level: 'L1', result: 3.2, expected_mean: 3.0, sd: 0.25, status: 'ACCEPTED', run_by: 'Tech Meena', run_at: '2026-03-03T08:10:00Z' },
];

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  ACCEPTED: { color: '#10b981', label: 'Pass' },
  WARNING: { color: '#f59e0b', label: 'Warning' },
  REJECTED: { color: '#ef4444', label: 'Fail' },
};

export const QCCalibrationScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [runs] = useState<QCRun[]>(MOCK_QC_RUNS);
  const [filter, setFilter] = useState<'ALL' | 'ACCEPTED' | 'WARNING' | 'REJECTED'>('ALL');

  const filtered = filter === 'ALL' ? runs : runs.filter(r => r.status === filter);
  const accepted = runs.filter(r => r.status === 'ACCEPTED').length;
  const warnings = runs.filter(r => r.status === 'WARNING').length;
  const rejected = runs.filter(r => r.status === 'REJECTED').length;

  const getSDRange = (run: QCRun) => {
    const deviation = Math.abs(run.result - run.expected_mean) / run.sd;
    return deviation.toFixed(1);
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
            <Text style={styles.headerTitle}>QC / Calibration</Text>
            <Text style={styles.headerSub}>Daily Quality Control Runs</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <GlassCard style={[styles.summaryCard, { borderLeftColor: '#10b981', borderLeftWidth: 3 }]}>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>{accepted}</Text>
              <Text style={styles.summaryLabel}>Passed</Text>
            </GlassCard>
            <GlassCard style={[styles.summaryCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 3 }]}>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{warnings}</Text>
              <Text style={styles.summaryLabel}>Warning</Text>
            </GlassCard>
            <GlassCard style={[styles.summaryCard, { borderLeftColor: '#ef4444', borderLeftWidth: 3 }]}>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{rejected}</Text>
              <Text style={styles.summaryLabel}>Failed</Text>
            </GlassCard>
          </View>

          {/* Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 8 }}>
            {(['ALL', 'ACCEPTED', 'WARNING', 'REJECTED'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'ALL' ? 'All Runs' : STATUS_CONFIG[f].label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* QC Run Cards */}
          <Text style={styles.sectionTitle}>{filtered.length} QC Runs Today</Text>
          {filtered.map(run => {
            const cfg = STATUS_CONFIG[run.status];
            const sdRange = getSDRange(run);
            return (
              <GlassCard key={run.id} style={styles.qcCard}>
                <View style={styles.qcTop}>
                  <View>
                    <Text style={styles.qcTestName}>{run.test_name}</Text>
                    <Text style={styles.qcAnalyzer}>{run.analyzer}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                    {run.status === 'ACCEPTED' ? <CheckCircle2 size={14} color={cfg.color} /> :
                     run.status === 'REJECTED' ? <XCircle size={14} color={cfg.color} /> :
                     <AlertTriangle size={14} color={cfg.color} />}
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <View style={styles.qcBody}>
                  <View style={styles.qcMetric}>
                    <Text style={styles.qcMetricLabel}>Level</Text>
                    <Text style={styles.qcMetricValue}>{run.level}</Text>
                  </View>
                  <View style={styles.qcMetric}>
                    <Text style={styles.qcMetricLabel}>Result</Text>
                    <Text style={[styles.qcMetricValue, { color: cfg.color }]}>{run.result}</Text>
                  </View>
                  <View style={styles.qcMetric}>
                    <Text style={styles.qcMetricLabel}>Mean</Text>
                    <Text style={styles.qcMetricValue}>{run.expected_mean}</Text>
                  </View>
                  <View style={styles.qcMetric}>
                    <Text style={styles.qcMetricLabel}>±SD</Text>
                    <Text style={styles.qcMetricValue}>{run.sd}</Text>
                  </View>
                  <View style={styles.qcMetric}>
                    <Text style={styles.qcMetricLabel}>Dev</Text>
                    <Text style={[styles.qcMetricValue, { color: Number(sdRange) > 2 ? '#ef4444' : Number(sdRange) > 1 ? '#f59e0b' : '#10b981' }]}>
                      {sdRange}σ
                    </Text>
                  </View>
                </View>

                <View style={styles.qcFooter}>
                  <Text style={styles.qcFooterText}>{run.run_by}</Text>
                  <Text style={styles.qcFooterText}>
                    {new Date(run.run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
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
  // Summary
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.l },
  summaryCard: { flex: 1, padding: SPACING.m, alignItems: 'center', borderWidth: 0 },
  summaryValue: { fontFamily: FONTS.bold, fontSize: 28 },
  summaryLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  // Filter
  filterScroll: { marginBottom: SPACING.m, maxHeight: 42 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  filterChipText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterChipTextActive: { color: COLORS.primary },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.m },
  // QC Card
  qcCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  qcTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  qcTestName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  qcAnalyzer: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },
  qcBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  qcMetric: { alignItems: 'center' },
  qcMetricLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginBottom: 2 },
  qcMetricValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  qcFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  qcFooterText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
});
