import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, AlertTriangle, Shield } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const MLC_DATA = [
  { id: 1, patient: 'Vijay Singh', uhid: 'UHID-5003', mr: 'MR-2026-0503', type: 'RTA', fir_number: 'FIR-2026-0312', police_station: 'Koramangala PS', brought_by: 'Ambulance 108', admission: '2026-03-02', ward: 'Neuro-ICU', consultant: 'Dr. Reddy', status: 'ACTIVE', custody: 'HOSPITAL', docs_completed: ['MLC Form', 'Wound Certificate', 'Consent'], docs_pending: ['Discharge Summary', 'Final MLC Report'], injuries: ['Skull fracture — Rt temporal', 'Soft tissue injury — Rt arm', 'Abrasion — L knee'] },
  { id: 2, patient: 'Ajay Malhotra', uhid: 'UHID-6001', mr: 'MR-2026-0490', type: 'ASSAULT', fir_number: 'FIR-2026-0298', police_station: 'JP Nagar PS', brought_by: 'Police', admission: '2026-02-28', ward: 'Gen Surgery', consultant: 'Dr. Kapoor', status: 'DISCHARGED', custody: 'RELEASED', docs_completed: ['MLC Form', 'Wound Certificate', 'Consent', 'Discharge Summary', 'Final MLC Report'], docs_pending: [], injuries: ['Stab wound — L chest', 'Intercostal drain placed'] },
];

const STATUS_C = { ACTIVE: '#ef4444', DISCHARGED: '#10b981', ABSCONDED: '#f59e0b' };
const TYPE_LABELS: Record<string, string> = { RTA: '🚗 Road Traffic Accident', ASSAULT: '⚔️ Assault', POISONING: '☠️ Poisoning', BURNS: '🔥 Burns', SEXUAL_ASSAULT: '🛡️ Sexual Assault' };

export const MLCCasesScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>MLC Cases</Text>
            <Text style={styles.headerSub}>{MLC_DATA.filter(m => m.status === 'ACTIVE').length} active</Text>
          </View>
          <Shield size={18} color="#ef4444" />
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Legal Notice */}
          <LinearGradient colors={['#450a0a', '#1c1917']} style={styles.noticeBanner}>
            <AlertTriangle size={14} color="#ef4444" />
            <Text style={styles.noticeText}>MLC records are legally sensitive. Access is logged and audited per IPC/BNS guidelines.</Text>
          </LinearGradient>

          {MLC_DATA.map(mlc => {
            const sColor = STATUS_C[mlc.status as keyof typeof STATUS_C];
            const completed = mlc.docs_completed.length;
            const total = completed + mlc.docs_pending.length;
            return (
              <GlassCard key={mlc.id} style={[styles.mlcCard, { borderColor: sColor + '40', borderWidth: 1 }]}>
                <View style={styles.mlcTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mlcName}>{mlc.patient}</Text>
                    <Text style={styles.mlcMeta}>{mlc.mr} • {mlc.uhid} • {mlc.ward}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sColor + '20' }]}>
                    <Text style={[styles.statusText, { color: sColor }]}>{mlc.status}</Text>
                  </View>
                </View>
                <Text style={styles.typeLabel}>{TYPE_LABELS[mlc.type] || mlc.type}</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}><Text style={styles.iLabel}>FIR</Text><Text style={styles.iValue}>{mlc.fir_number}</Text></View>
                  <View style={styles.infoItem}><Text style={styles.iLabel}>PS</Text><Text style={styles.iValue}>{mlc.police_station}</Text></View>
                  <View style={styles.infoItem}><Text style={styles.iLabel}>Brought</Text><Text style={styles.iValue}>{mlc.brought_by}</Text></View>
                  <View style={styles.infoItem}><Text style={styles.iLabel}>Custody</Text><Text style={styles.iValue}>{mlc.custody}</Text></View>
                </View>

                <Text style={styles.secLabel}>INJURIES</Text>
                {mlc.injuries.map((inj, i) => <Text key={i} style={styles.injText}>• {inj}</Text>)}

                <Text style={styles.secLabel}>DOCUMENTS ({completed}/{total})</Text>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(completed / total) * 100}%` as any }]} /></View>
                <View style={styles.docRow}>
                  {mlc.docs_completed.map(d => <Text key={d} style={styles.docDone}>✅ {d}</Text>)}
                  {mlc.docs_pending.map(d => <Text key={d} style={styles.docPending}>⏳ {d}</Text>)}
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
  noticeBanner: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.l },
  noticeText: { fontFamily: FONTS.regular, color: '#fca5a5', fontSize: 11, flex: 1, lineHeight: 16 },
  mlcCard: { padding: SPACING.m, marginBottom: 14 },
  mlcTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  mlcName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  mlcMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  typeLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoItem: { width: '47%' as any, padding: 8, backgroundColor: COLORS.surface, borderRadius: 8 },
  iLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9, marginBottom: 1 },
  iValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 11 },
  secLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 9, letterSpacing: 0.5, marginTop: 6, marginBottom: 4 },
  injText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 12, paddingVertical: 1 },
  barTrack: { height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%' as any, backgroundColor: '#10b981', borderRadius: 3 },
  docRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  docDone: { fontFamily: FONTS.medium, color: '#10b981', fontSize: 10 },
  docPending: { fontFamily: FONTS.medium, color: '#f59e0b', fontSize: 10 },
});
