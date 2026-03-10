import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const REACTIONS = [
  { id: 1, patient: 'Meera Iyer', uhid: 'UHID-3102', ward: 'Med-A', bag: 'BB-2026-0007', blood_group: 'A+', component: 'PRBC', type: 'FEBRILE', severity: 'MILD', onset_min: 25, symptoms: ['Temperature rise ≥1°C', 'Chills', 'Mild headache'], managed_by: 'Dr. Patel', outcome: 'RESOLVED', date: '2026-03-02' },
  { id: 2, patient: 'Gopal Rao', uhid: 'UHID-4011', ward: 'Surg-B', bag: 'BB-2026-0005', blood_group: 'O-', component: 'FFP', type: 'ALLERGIC', severity: 'MODERATE', onset_min: 15, symptoms: ['Urticaria', 'Pruritus', 'Wheezing'], managed_by: 'Dr. Sharma', outcome: 'RESOLVED', date: '2026-02-28' },
];

const SEVERITY_COLORS = { MILD: '#f59e0b', MODERATE: '#ef4444', SEVERE: '#dc2626', LIFE_THREATENING: '#7f1d1d' };
const TYPE_LABELS: Record<string, string> = { FEBRILE: '🌡️ Febrile Non-Hemolytic', ALLERGIC: '🤧 Allergic', HEMOLYTIC: '💉 Hemolytic', TRALI: '🫁 TRALI', TACO: '💧 TACO' };

// Summary stats
const SUMMARY = { total_transfusions: 142, reactions: 2, reaction_rate: '1.4%', last_30_days: { febrile: 1, allergic: 1, hemolytic: 0 } };

export const TransfusionReactionsScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Transfusion Reactions</Text>
            <Text style={styles.headerSub}>Hemovigilance Report</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <GlassCard style={styles.sumCard}><Text style={[styles.sumValue, { color: '#3b82f6' }]}>{SUMMARY.total_transfusions}</Text><Text style={styles.sumLabel}>Transfusions</Text></GlassCard>
            <GlassCard style={styles.sumCard}><Text style={[styles.sumValue, { color: '#ef4444' }]}>{SUMMARY.reactions}</Text><Text style={styles.sumLabel}>Reactions</Text></GlassCard>
            <GlassCard style={styles.sumCard}><Text style={[styles.sumValue, { color: '#f59e0b' }]}>{SUMMARY.reaction_rate}</Text><Text style={styles.sumLabel}>Rate</Text></GlassCard>
          </View>

          {/* Safety Banner */}
          <LinearGradient colors={['#064e3b', '#022c22']} style={styles.safeBanner}>
            <CheckCircle2 size={14} color="#10b981" />
            <Text style={styles.safeText}>No hemolytic reactions in last 90 days. Hemovigilance compliance: 100%</Text>
          </LinearGradient>

          {/* Reaction Records */}
          <Text style={styles.secTitle}>Reported Reactions</Text>
          {REACTIONS.map(rx => {
            const sevColor = SEVERITY_COLORS[rx.severity as keyof typeof SEVERITY_COLORS];
            return (
              <GlassCard key={rx.id} style={[styles.rxCard, rx.severity !== 'MILD' && { borderColor: sevColor + '40', borderWidth: 1 }]}>
                <View style={styles.rxTop}>
                  <AlertTriangle size={16} color={sevColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rxPatient}>{rx.patient}</Text>
                    <Text style={styles.rxMeta}>{rx.uhid} • {rx.ward} • {rx.date}</Text>
                  </View>
                  <View style={[styles.sevBadge, { backgroundColor: sevColor + '20' }]}>
                    <Text style={[styles.sevText, { color: sevColor }]}>{rx.severity}</Text>
                  </View>
                </View>
                <Text style={styles.rxType}>{TYPE_LABELS[rx.type] || rx.type}</Text>
                <View style={styles.rxGrid}>
                  <View style={styles.rxItem}><Text style={styles.rxLabel}>Bag</Text><Text style={styles.rxValue}>{rx.bag} ({rx.blood_group})</Text></View>
                  <View style={styles.rxItem}><Text style={styles.rxLabel}>Component</Text><Text style={styles.rxValue}>{rx.component}</Text></View>
                  <View style={styles.rxItem}><Text style={styles.rxLabel}>Onset</Text><Text style={styles.rxValue}>{rx.onset_min} min</Text></View>
                </View>
                <Text style={styles.sympLabel}>Symptoms</Text>
                {rx.symptoms.map((s, i) => (
                  <Text key={i} style={styles.sympText}>• {s}</Text>
                ))}
                <View style={styles.outcomeRow}>
                  <Text style={styles.outcomeText}>Managed by: {rx.managed_by}</Text>
                  <View style={[styles.outcomeBadge, { backgroundColor: rx.outcome === 'RESOLVED' ? '#10b98120' : '#ef444420' }]}>
                    <Text style={[styles.outcomeLabel, { color: rx.outcome === 'RESOLVED' ? '#10b981' : '#ef4444' }]}>{rx.outcome}</Text>
                  </View>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.m },
  sumCard: { flex: 1, padding: 14, alignItems: 'center', borderWidth: 0, gap: 4 },
  sumValue: { fontFamily: FONTS.bold, fontSize: 22 },
  sumLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
  safeBanner: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.l },
  safeText: { fontFamily: FONTS.regular, color: '#6ee7b7', fontSize: 12, flex: 1, lineHeight: 18 },
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  rxCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  rxTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  rxPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  rxMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  sevBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  sevText: { fontFamily: FONTS.bold, fontSize: 10 },
  rxType: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 },
  rxGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  rxItem: { flex: 1, padding: 8, backgroundColor: COLORS.surface, borderRadius: 8, alignItems: 'center' },
  rxLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9, marginBottom: 2 },
  rxValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 11 },
  sympLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' as any, marginBottom: 2 },
  sympText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 12, paddingVertical: 1 },
  outcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  outcomeText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  outcomeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  outcomeLabel: { fontFamily: FONTS.bold, fontSize: 10 },
});
