import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const ICD_DATA = [
  { id: 1, mr: 'MR-2026-0501', patient: 'Ramesh Gupta', uhid: 'UHID-1001', dept: 'Cardiology', discharge: '2026-03-04', status: 'PENDING',
    primary: { diag: 'Acute MI — Anterior wall', icd: 'I21.0' },
    secondary: [{ diag: 'Type 2 Diabetes', icd: 'E11.9' }, { diag: 'Essential Hypertension', icd: 'I10' }],
    procedures: [{ name: 'PCI with DES', code: '00.66' }, { name: 'Coronary Angiography', code: '88.56' }],
  },
  { id: 2, mr: 'MR-2026-0505', patient: 'Suresh Patel', uhid: 'UHID-3102', dept: 'Ophthalmology', discharge: '2026-03-03', status: 'PENDING',
    primary: { diag: 'Senile nuclear cataract', icd: 'H25.1' },
    secondary: [],
    procedures: [{ name: 'Phacoemulsification with IOL', code: '13.41' }],
  },
  { id: 3, mr: 'MR-2026-0502', patient: 'Anita Sharma', uhid: 'UHID-2004', dept: 'General Surgery', discharge: '2026-03-03', status: 'CODED',
    primary: { diag: 'Acute appendicitis', icd: 'K35.80' },
    secondary: [{ diag: 'Personal history of diseases of digestive system', icd: 'Z87.19' }],
    procedures: [{ name: 'Laparoscopic Appendectomy', code: '47.01' }],
    coded_by: 'Meera P.', coded_date: '2026-03-04',
  },
];

const STATUS_C = { PENDING: '#f59e0b', CODED: '#10b981', VERIFIED: '#8b5cf6' };

export const ICDCodingScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>ICD Coding</Text>
            <Text style={styles.headerSub}>{ICD_DATA.filter(d => d.status === 'PENDING').length} pending</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {ICD_DATA.map(item => {
            const sColor = STATUS_C[item.status as keyof typeof STATUS_C];
            return (
              <GlassCard key={item.id} style={styles.codeCard}>
                <View style={styles.codeTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.codeName}>{item.patient}</Text>
                    <Text style={styles.codeMeta}>{item.mr} • {item.dept} • D/C: {item.discharge}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sColor + '20' }]}>
                    <Text style={[styles.statusText, { color: sColor }]}>{item.status}</Text>
                  </View>
                </View>

                {/* Primary Diagnosis */}
                <View style={styles.diagSection}>
                  <Text style={styles.diagLabel}>PRIMARY DIAGNOSIS</Text>
                  <View style={styles.diagRow}>
                    <View style={styles.icdBadge}><Text style={styles.icdCode}>{item.primary.icd}</Text></View>
                    <Text style={styles.diagText}>{item.primary.diag}</Text>
                  </View>
                </View>

                {/* Secondary */}
                {item.secondary.length > 0 && (
                  <View style={styles.diagSection}>
                    <Text style={styles.diagLabel}>SECONDARY</Text>
                    {item.secondary.map((s, i) => (
                      <View key={i} style={styles.diagRow}>
                        <View style={[styles.icdBadge, { backgroundColor: '#3b82f615' }]}><Text style={[styles.icdCode, { color: '#3b82f6' }]}>{s.icd}</Text></View>
                        <Text style={styles.diagText}>{s.diag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Procedures */}
                <View style={styles.diagSection}>
                  <Text style={styles.diagLabel}>PROCEDURES</Text>
                  {item.procedures.map((p, i) => (
                    <View key={i} style={styles.diagRow}>
                      <View style={[styles.icdBadge, { backgroundColor: '#8b5cf615' }]}><Text style={[styles.icdCode, { color: '#8b5cf6' }]}>{p.code}</Text></View>
                      <Text style={styles.diagText}>{p.name}</Text>
                    </View>
                  ))}
                </View>

                {item.coded_by && (
                  <View style={styles.codedRow}>
                    <CheckCircle2 size={12} color="#10b981" />
                    <Text style={styles.codedText}>Coded by {item.coded_by} on {item.coded_date}</Text>
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
  codeCard: { padding: SPACING.m, marginBottom: 14, borderWidth: 0 },
  codeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  codeName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  codeMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  diagSection: { marginBottom: 8 },
  diagLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 },
  diagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  icdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#10b98115' },
  icdCode: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 11 },
  diagText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 12, flex: 1 },
  codedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  codedText: { fontFamily: FONTS.medium, color: '#10b981', fontSize: 11 },
});
