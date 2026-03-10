import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle2, Heart } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const DONATIONS = [
  { id: 1, donor_name: 'Amit Verma', donor_id: 'DON-2026-001', blood_group: 'A+', age: 28, gender: 'M', weight_kg: 72, hb_level: 14.2, donation_date: '2026-03-05', bag_number: 'BB-2026-0010', volume_ml: 450, screening: 'PASS', components: ['PRBC', 'FFP', 'Platelets'] },
  { id: 2, donor_name: 'Sunita Sharma', donor_id: 'DON-2026-002', blood_group: 'O+', age: 35, gender: 'F', weight_kg: 58, hb_level: 12.8, donation_date: '2026-03-05', bag_number: 'BB-2026-0011', volume_ml: 350, screening: 'PASS', components: ['PRBC', 'FFP'] },
  { id: 3, donor_name: 'Rajesh Jain', donor_id: 'DON-2026-003', blood_group: 'B+', age: 42, gender: 'M', weight_kg: 80, hb_level: 15.1, donation_date: '2026-03-05', bag_number: 'BB-2026-0012', volume_ml: 450, screening: 'PENDING', components: [] },
  { id: 4, donor_name: 'Priya Reddy', donor_id: 'DON-2026-004', blood_group: 'AB-', age: 25, gender: 'F', weight_kg: 52, hb_level: 11.5, donation_date: '2026-03-04', bag_number: 'BB-2026-0009', volume_ml: 350, screening: 'FAIL', components: [] },
];

const SCREEN_COLORS = { PASS: '#10b981', FAIL: '#ef4444', PENDING: '#f59e0b' };
const BG_COLORS: Record<string, string> = { 'A+': '#ef4444', 'O+': '#10b981', 'B+': '#3b82f6', 'AB-': '#8b5cf6' };

export const DonationRecordsScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Donations</Text>
            <Text style={styles.headerSub}>{DONATIONS.length} records</Text>
          </View>
          <Heart size={18} color="#ef4444" />
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {DONATIONS.map(d => {
            const sColor = SCREEN_COLORS[d.screening as keyof typeof SCREEN_COLORS];
            return (
              <GlassCard key={d.id} style={[styles.donCard, d.screening === 'FAIL' && { borderColor: '#ef444440', borderWidth: 1 }]}>
                <View style={styles.donTop}>
                  <View style={[styles.bgCircle, { backgroundColor: (BG_COLORS[d.blood_group] || '#ef4444') + '20' }]}>
                    <Text style={[styles.bgText, { color: BG_COLORS[d.blood_group] || '#ef4444' }]}>{d.blood_group}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.donName}>{d.donor_name}</Text>
                    <Text style={styles.donMeta}>{d.donor_id} • {d.age}y/{d.gender} • {d.weight_kg}kg</Text>
                  </View>
                  <View style={[styles.screenBadge, { backgroundColor: sColor + '20' }]}>
                    <Text style={[styles.screenText, { color: sColor }]}>{d.screening}</Text>
                  </View>
                </View>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}><Text style={styles.dLabel}>Hb</Text><Text style={styles.dValue}>{d.hb_level} g/dL</Text></View>
                  <View style={styles.detailItem}><Text style={styles.dLabel}>Volume</Text><Text style={styles.dValue}>{d.volume_ml} ml</Text></View>
                  <View style={styles.detailItem}><Text style={styles.dLabel}>Bag</Text><Text style={styles.dValue}>{d.bag_number}</Text></View>
                </View>
                <Text style={styles.dateText}>📅 {d.donation_date}</Text>
                {d.components.length > 0 && (
                  <View style={styles.compRow}>
                    {d.components.map(c => (
                      <View key={c} style={styles.compChip}><CheckCircle2 size={10} color="#10b981" /><Text style={styles.compText}>{c}</Text></View>
                    ))}
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
  donCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  donTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  bgCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  bgText: { fontFamily: FONTS.bold, fontSize: 14 },
  donName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  donMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  screenBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  screenText: { fontFamily: FONTS.bold, fontSize: 10 },
  detailGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  detailItem: { flex: 1, padding: 8, backgroundColor: COLORS.surface, borderRadius: 8, alignItems: 'center' },
  dLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9, marginBottom: 2 },
  dValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 11 },
  dateText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11, marginBottom: 6 },
  compRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  compChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b98115', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  compText: { fontFamily: FONTS.medium, color: '#10b981', fontSize: 10 },
});
