import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  ArrowUp, ArrowDown, Minus, Send, FlaskConical,
  TrendingUp, TrendingDown,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import labService, { TestResult, TestParameter } from '../../services/labService';

const FLAG_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  NORMAL: { color: '#10b981', icon: Minus, label: 'Normal' },
  LOW: { color: '#3b82f6', icon: ArrowDown, label: 'Low' },
  HIGH: { color: '#f59e0b', icon: ArrowUp, label: 'High' },
  CRITICAL_LOW: { color: '#ef4444', icon: ArrowDown, label: 'Critical Low' },
  CRITICAL_HIGH: { color: '#ef4444', icon: ArrowUp, label: 'Critical High' },
};

export const ResultEntryScreen = ({ navigation, route }: any) => {
  const { sampleId, testName } = route?.params || { sampleId: 'LAB-260303-0042', testName: 'Complete Blood Count' };
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [result, setResult] = useState<TestResult | null>(null);
  const [editableParams, setEditableParams] = useState<TestParameter[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await labService.getResult(sampleId);
        setResult(data);
        setEditableParams(data.parameters.map(p => ({ ...p })));
      } catch (error) {
        console.error('Failed to load result:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sampleId]);

  const updateParamValue = (index: number, value: string) => {
    setEditableParams(prev => {
      const next = [...prev];
      next[index] = { ...next[index], value };
      // Auto-flag
      const numVal = parseFloat(value);
      if (!isNaN(numVal) && next[index].reference_low !== undefined && next[index].reference_high !== undefined) {
        const low = next[index].reference_low!;
        const high = next[index].reference_high!;
        if (numVal < low * 0.5) next[index].flag = 'CRITICAL_LOW';
        else if (numVal > high * 2) next[index].flag = 'CRITICAL_HIGH';
        else if (numVal < low) next[index].flag = 'LOW';
        else if (numVal > high) next[index].flag = 'HIGH';
        else next[index].flag = 'NORMAL';
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const hasCritical = editableParams.some(p => p.flag === 'CRITICAL_LOW' || p.flag === 'CRITICAL_HIGH');

    if (hasCritical) {
      Alert.alert(
        '⚠️ Critical Values Detected',
        'This result contains critical values. The ordering physician will be notified immediately upon submission.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit & Notify',
            style: 'destructive',
            onPress: async () => {
              setSubmitting(true);
              try {
                await labService.submitResult(sampleId, editableParams, notes);
                Alert.alert('✅ Result Submitted', 'Result sent for pathologist verification.');
                navigation.goBack();
              } catch { Alert.alert('Error', 'Failed to submit result'); }
              finally { setSubmitting(false); }
            },
          },
        ],
      );
    } else {
      setSubmitting(true);
      try {
        await labService.submitResult(sampleId, editableParams, notes);
        Alert.alert('✅ Result Submitted', 'Result sent for pathologist verification.');
        navigation.goBack();
      } catch { Alert.alert('Error', 'Failed to submit result'); }
      finally { setSubmitting(false); }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Result Entry</Text>
            <Text style={styles.headerSub}>{sampleId} • {testName}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Parameter Table */}
          <Text style={styles.sectionTitle}>Test Parameters</Text>
          {editableParams.map((param, index) => {
            const flagInfo = FLAG_CONFIG[param.flag || 'NORMAL'];
            const FlagIcon = flagInfo.icon;
            return (
              <GlassCard key={index} style={styles.paramCard}>
                <View style={styles.paramHeader}>
                  <Text style={styles.paramName}>{param.name}</Text>
                  <View style={[styles.flagBadge, { backgroundColor: flagInfo.color + '20' }]}>
                    <FlagIcon size={12} color={flagInfo.color} />
                    <Text style={[styles.flagText, { color: flagInfo.color }]}>{flagInfo.label}</Text>
                  </View>
                </View>

                <View style={styles.paramBody}>
                  <View style={styles.valueBox}>
                    <TextInput
                      style={styles.valueInput}
                      value={param.value}
                      onChangeText={(v) => updateParamValue(index, v)}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    <Text style={styles.unitText}>{param.unit}</Text>
                  </View>

                  <View style={styles.refBox}>
                    <Text style={styles.refLabel}>Ref:</Text>
                    <Text style={styles.refValue}>
                      {param.reference_low !== undefined && param.reference_high !== undefined
                        ? `${param.reference_low} — ${param.reference_high}`
                        : param.reference_text || '—'}
                    </Text>
                  </View>

                  {param.previous_value && (
                    <View style={styles.deltaBox}>
                      <Text style={styles.deltaLabel}>Previous:</Text>
                      <Text style={styles.deltaValue}>{param.previous_value} {param.unit}</Text>
                      {parseFloat(param.value) > parseFloat(param.previous_value)
                        ? <TrendingUp size={14} color="#f59e0b" />
                        : <TrendingDown size={14} color="#10b981" />}
                    </View>
                  )}
                </View>
              </GlassCard>
            );
          })}

          {/* Notes */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Notes / Comments</Text>
          <GlassCard style={styles.notesCard}>
            <TextInput
              style={styles.notesInput}
              placeholder="Add clinical notes, observations..."
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </GlassCard>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Send size={20} color="#fff" />
              <Text style={styles.submitText}>
                {submitting ? 'Submitting...' : 'Submit for Verification'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  // Param Card
  paramCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  paramHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  paramName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  flagBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  flagText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  paramBody: { gap: 8 },
  valueBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueInput: {
    flex: 1, fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20,
    backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  unitText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 14, minWidth: 50 },
  refBox: { flexDirection: 'row', gap: 6 },
  refLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  refValue: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  deltaBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deltaLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  deltaValue: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  // Notes
  notesCard: { padding: SPACING.m, borderWidth: 0 },
  notesInput: {
    fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    minHeight: 80, textAlignVertical: 'top',
  },
  // Submit
  submitBtn: { marginTop: SPACING.l, borderRadius: 20, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 20,
  },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16 },
});
