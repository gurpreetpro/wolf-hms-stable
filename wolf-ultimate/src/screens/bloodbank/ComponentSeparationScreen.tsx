import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Droplet } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const COMPONENT_DATA = [
  { id: 1, source_bag: 'BB-2026-0010', blood_group: 'A+', donor: 'Amit Verma', date: '2026-03-05', status: 'COMPLETED', components: [
    { name: 'PRBC', bag: 'BB-2026-0010-P', volume: 280, storage: 'Fridge-1', shelf_life: '42 days', expiry: '2026-04-16' },
    { name: 'FFP', bag: 'BB-2026-0010-F', volume: 150, storage: 'Deep Freeze', shelf_life: '1 year', expiry: '2027-03-05' },
    { name: 'Platelets', bag: 'BB-2026-0010-PL', volume: 50, storage: 'Agitator', shelf_life: '5 days', expiry: '2026-03-10' },
  ]},
  { id: 2, source_bag: 'BB-2026-0011', blood_group: 'O+', donor: 'Sunita Sharma', date: '2026-03-05', status: 'COMPLETED', components: [
    { name: 'PRBC', bag: 'BB-2026-0011-P', volume: 220, storage: 'Fridge-1', shelf_life: '42 days', expiry: '2026-04-16' },
    { name: 'FFP', bag: 'BB-2026-0011-F', volume: 120, storage: 'Deep Freeze', shelf_life: '1 year', expiry: '2027-03-05' },
  ]},
  { id: 3, source_bag: 'BB-2026-0012', blood_group: 'B+', donor: 'Rajesh Jain', date: '2026-03-05', status: 'PENDING', components: [] },
];

const STATUS_C = { COMPLETED: '#10b981', PENDING: '#f59e0b', IN_PROGRESS: '#3b82f6' };
const COMP_COLORS: Record<string, string> = { PRBC: '#ef4444', FFP: '#f59e0b', Platelets: '#8b5cf6', Cryoprecipitate: '#06b6d4' };

export const ComponentSeparationScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Component Separation</Text>
            <Text style={styles.headerSub}>{COMPONENT_DATA.length} source bags</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {COMPONENT_DATA.map(item => {
            const sColor = STATUS_C[item.status as keyof typeof STATUS_C];
            return (
              <GlassCard key={item.id} style={styles.sepCard}>
                <View style={styles.sepTop}>
                  <Droplet size={16} color="#ef4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sepBag}>{item.source_bag} ({item.blood_group})</Text>
                    <Text style={styles.sepMeta}>{item.donor} • {item.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sColor + '20' }]}>
                    <Text style={[styles.statusText, { color: sColor }]}>{item.status}</Text>
                  </View>
                </View>
                {item.components.length > 0 ? (
                  item.components.map(c => (
                    <View key={c.bag} style={styles.compItem}>
                      <View style={[styles.compDot, { backgroundColor: COMP_COLORS[c.name] || '#3b82f6' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.compName}>{c.name}</Text>
                        <Text style={styles.compInfo}>{c.bag} • {c.volume}ml</Text>
                      </View>
                      <View>
                        <Text style={styles.compStorage}>{c.storage}</Text>
                        <Text style={styles.compExpiry}>Exp: {c.expiry}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.pendingText}>⏳ Awaiting separation</Text>
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
  sepCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  sepTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sepBag: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  sepMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  compItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  compDot: { width: 10, height: 10, borderRadius: 5 },
  compName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13 },
  compInfo: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  compStorage: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10, textAlign: 'right' },
  compExpiry: { fontFamily: FONTS.regular, color: '#f59e0b', fontSize: 9, textAlign: 'right', marginTop: 1 },
  pendingText: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});
