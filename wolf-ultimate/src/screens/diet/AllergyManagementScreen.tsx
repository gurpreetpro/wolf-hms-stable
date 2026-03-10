import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, AlertTriangle, ShieldAlert, Plus } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface AllergyRecord {
  id: number; patient_name: string; patient_uhid: string; ward: string;
  allergies: { allergen: string; severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'ANAPHYLAXIS'; reaction: string }[];
  diet_restrictions: string[];
}

const MOCK_ALLERGIES: AllergyRecord[] = [
  { id: 1, patient_name: 'Anita Devi', patient_uhid: 'UHID-5002', ward: 'Gen-B', allergies: [{ allergen: 'Gluten', severity: 'MODERATE', reaction: 'Bloating, diarrhea' }], diet_restrictions: ['No wheat products', 'Use rice/millet-based alternatives'] },
  { id: 2, patient_name: 'Priya Nair', patient_uhid: 'UHID-2004', ward: 'Card-B', allergies: [{ allergen: 'Shellfish', severity: 'ANAPHYLAXIS', reaction: 'Urticaria, angioedema, anaphylactic shock' }, { allergen: 'Tree Nuts', severity: 'SEVERE', reaction: 'Throat swelling, difficulty breathing' }], diet_restrictions: ['No seafood', 'No nuts/nut products', 'Check all ingredients for cross-contamination'] },
  { id: 3, patient_name: 'Geeta Devi', patient_uhid: 'UHID-4008', ward: 'Surg-A', allergies: [{ allergen: 'Lactose', severity: 'MILD', reaction: 'Gas, bloating' }], diet_restrictions: ['Use lactose-free milk', 'Curd OK (fermented)'] },
];

const SEV_COLORS = { MILD: '#3b82f6', MODERATE: '#f59e0b', SEVERE: '#ef4444', ANAPHYLAXIS: '#7f1d1d' };

export const AllergyManagementScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Allergy Management</Text>
            <Text style={styles.headerSub}>{MOCK_ALLERGIES.length} patients with dietary allergies</Text>
          </View>
        </View>

        {/* Warning Banner */}
        <LinearGradient colors={['#7f1d1d', '#450a0a']} style={styles.warnBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <ShieldAlert size={18} color="#ef4444" />
          <Text style={styles.warnText}>All meal trays must be cross-checked against allergy records. NABH/NABL mandate — document all allergy screening.</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {MOCK_ALLERGIES.map(record => (
            <GlassCard key={record.id} style={styles.allergyCard}>
              <View style={styles.cardTop}>
                <View style={styles.avatarCircle}><Text style={styles.avatarText}>{record.patient_name.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patName}>{record.patient_name}</Text>
                  <Text style={styles.patMeta}>{record.patient_uhid} • {record.ward}</Text>
                </View>
              </View>

              <Text style={styles.subHead}>Allergies</Text>
              {record.allergies.map((a, i) => {
                const sevColor = SEV_COLORS[a.severity];
                return (
                  <View key={i} style={[styles.allergyItem, a.severity === 'ANAPHYLAXIS' && { borderColor: '#ef444440', borderWidth: 1 }]}>
                    <View style={styles.allergyRow}>
                      <AlertTriangle size={14} color={sevColor} />
                      <Text style={styles.allergenName}>{a.allergen}</Text>
                      <View style={[styles.sevBadge, { backgroundColor: sevColor + '20' }]}>
                        <Text style={[styles.sevText, { color: sevColor }]}>{a.severity}</Text>
                      </View>
                    </View>
                    <Text style={styles.reactionText}>Reaction: {a.reaction}</Text>
                  </View>
                );
              })}

              <Text style={styles.subHead}>Diet Restrictions</Text>
              {record.diet_restrictions.map((r, i) => (
                <Text key={i} style={styles.restrictText}>• {r}</Text>
              ))}
            </GlassCard>
          ))}
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
  warnBanner: { marginHorizontal: SPACING.m, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.m },
  warnText: { fontFamily: FONTS.regular, color: '#fca5a5', fontSize: 12, flex: 1, lineHeight: 18 },
  allergyCard: { padding: SPACING.m, marginBottom: 14, borderWidth: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef444420', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 16 },
  patName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  patMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  subHead: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' as any, marginBottom: 6 },
  allergyItem: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginBottom: 6 },
  allergyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  allergenName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14, flex: 1 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sevText: { fontFamily: FONTS.bold, fontSize: 9 },
  reactionText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  restrictText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, lineHeight: 20, marginLeft: 4 },
});
