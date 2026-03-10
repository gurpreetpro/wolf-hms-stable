import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, Truck } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import dietService, { KitchenOrder } from '../../services/dietService';

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  PENDING: { color: '#f59e0b', label: '⏳ Pending' },
  PREPARING: { color: '#3b82f6', label: '🍳 Preparing' },
  DISPATCHED: { color: '#8b5cf6', label: '🚗 Dispatched' },
  DELIVERED: { color: '#10b981', label: '✅ Delivered' },
};

export const KitchenOrdersScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    try { setOrders(await dietService.getKitchenOrders()); }
    catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => filter === 'ALL' || o.status === filter);

  const advanceStatus = (order: KitchenOrder) => {
    const next: Record<string, string> = { PENDING: 'PREPARING', PREPARING: 'DISPATCHED', DISPATCHED: 'DELIVERED' };
    const nextStatus = next[order.status];
    if (!nextStatus) return;
    Alert.alert('Update Status', `Mark ${order.patient_name}'s ${order.meal_type} as ${nextStatus}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: () => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus as KitchenOrder['status'] } : o)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Kitchen Orders</Text>
            <Text style={styles.headerSub}>{orders.filter(o => o.status === 'PENDING').length} pending</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {[{ key: 'ALL', label: 'All' }, { key: 'PENDING', label: 'Pending' }, { key: 'PREPARING', label: 'Preparing' }, { key: 'DISPATCHED', label: 'Dispatched' }, { key: 'DELIVERED', label: 'Delivered' }].map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {filtered.map(order => {
            const st = STATUS_CFG[order.status];
            return (
              <GlassCard key={order.id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderPatient}>{order.patient_name}</Text>
                    <Text style={styles.orderMeta}>{order.ward} {order.bed} • {order.diet_type}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.mealBadge}><Clock size={10} color={COLORS.primary} /><Text style={styles.mealTime}>{order.meal_type} • {order.scheduled_time}</Text></View>
                <View style={styles.itemsList}>
                  {order.items.map((item, i) => <Text key={i} style={styles.itemText}>• {item}</Text>)}
                </View>
                {order.allergies.length > 0 && (
                  <View style={styles.allergyRow}><AlertTriangle size={12} color="#ef4444" /><Text style={styles.allergyText}>⚠️ {order.allergies.join(', ')}</Text></View>
                )}
                {order.special_instructions ? <Text style={styles.instrText}>📝 {order.special_instructions}</Text> : null}
                {order.status !== 'DELIVERED' && (
                  <TouchableOpacity style={styles.advanceBtn} onPress={() => advanceStatus(order)}>
                    <Truck size={14} color={COLORS.primary} /><Text style={styles.advanceText}>Advance →</Text>
                  </TouchableOpacity>
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
  filterActive: { backgroundColor: '#10b98120', borderColor: '#10b981' },
  filterText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterTextActive: { color: '#10b981' },
  orderCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  orderTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  orderPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  orderMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  mealBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  mealTime: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 11 },
  itemsList: { marginBottom: 6 },
  itemText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  allergyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef444410', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6, alignSelf: 'flex-start' },
  allergyText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 10 },
  instrText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11, marginBottom: 6 },
  advanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '30' },
  advanceText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12 },
});
