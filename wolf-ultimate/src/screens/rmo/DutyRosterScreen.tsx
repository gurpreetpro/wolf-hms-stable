import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sun, Sunset, Moon, ArrowLeft, ChevronLeft, ChevronRight,
  RefreshCw, ArrowRightLeft, Clock,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import rmoService, { DutyRosterEntry } from '../../services/rmoService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getShiftIcon = (type: string) => {
  switch (type) {
    case 'MORNING': return Sun;
    case 'EVENING': return Sunset;
    case 'NIGHT': return Moon;
    default: return Clock;
  }
};

const getShiftColor = (type: string) => {
  switch (type) {
    case 'MORNING': return '#22c55e';
    case 'EVENING': return '#f59e0b';
    case 'NIGHT': return '#8b5cf6';
    default: return '#64748b';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return '#22c55e';
    case 'COMPLETED': return '#64748b';
    case 'SWAPPED': return '#f59e0b';
    default: return '#3b82f6';
  }
};

// Get week dates from a given date
const getWeekDates = (baseDate: Date): Date[] => {
  const day = baseDate.getDay();
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - day); // Start from Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

export const DutyRosterScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [roster, setRoster] = useState<DutyRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadRoster = async () => {
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];
      const data = await rmoService.getDutyRoster(startDate, endDate);
      setRoster(data);
    } catch (error) {
      console.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadRoster(); }, [weekOffset]);

  const filteredRoster = roster.filter(r => r.shift_date === selectedDate);
  const myShifts = roster.filter(r => r.shift_date === selectedDate);

  const monthYear = weekDates[3].toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Duty Roster</Text>
          <TouchableOpacity onPress={loadRoster} style={styles.backBtn}>
            <RefreshCw size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Week Selector */}
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={styles.navArrow}>
            <ChevronLeft size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{monthYear}</Text>
          <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={styles.navArrow}>
            <ChevronRight size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Day Selector */}
        <View style={styles.dayRow}>
          {weekDates.map((d, i) => {
            const dateStr = d.toISOString().split('T')[0];
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const hasShift = roster.some(r => r.shift_date === dateStr);

            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {DAYS[d.getDay()]}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected, isToday && !isSelected && { color: COLORS.primary }]}>
                  {d.getDate()}
                </Text>
                {hasShift && <View style={[styles.dayDot, isSelected && { backgroundColor: '#fff' }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRoster(); }} tintColor={COLORS.primary} />}
        >
          {loading ? (
            <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 }}>Loading roster...</Text>
          ) : myShifts.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Shifts Scheduled</Text>
              <Text style={styles.emptySubtitle}>No duties assigned for this date</Text>
            </View>
          ) : (
            myShifts.map(shift => {
              const ShiftIcon = getShiftIcon(shift.shift_type);
              const shiftColor = getShiftColor(shift.shift_type);
              return (
                <GlassCard key={shift.id} style={styles.shiftCard}>
                  <View style={styles.shiftRow}>
                    <View style={[styles.shiftIconBox, { backgroundColor: shiftColor + '20' }]}>
                      <ShiftIcon size={24} color={shiftColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.shiftType}>{shift.shift_type} Shift</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shift.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(shift.status) }]}>
                            {shift.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.shiftTime}>{shift.start_time} — {shift.end_time}</Text>
                      <Text style={styles.shiftDept}>{shift.department}</Text>
                      {shift.ward_name && (
                        <Text style={styles.shiftWard}>Ward: {shift.ward_name}</Text>
                      )}
                    </View>
                  </View>
                  {shift.status === 'SCHEDULED' && (
                    <TouchableOpacity style={styles.swapBtn}>
                      <ArrowRightLeft size={14} color={COLORS.primary} />
                      <Text style={styles.swapText}>Request Swap</Text>
                    </TouchableOpacity>
                  )}
                </GlassCard>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.s,
  },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  // Week Nav
  weekNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, marginTop: SPACING.s, marginBottom: SPACING.s,
  },
  navArrow: { padding: 8 },
  monthText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  // Day Selector
  dayRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.s,
    gap: 4, marginBottom: SPACING.m,
  },
  dayCell: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 16, backgroundColor: COLORS.surface,
  },
  dayCellSelected: { backgroundColor: COLORS.primary },
  dayName: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11, marginBottom: 4 },
  dayNameSelected: { color: 'rgba(255,255,255,0.7)' },
  dayNum: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  dayNumSelected: { color: '#fff' },
  dayDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  // Shift Cards
  shiftCard: { marginBottom: 12, padding: SPACING.m, borderWidth: 0 },
  shiftRow: { flexDirection: 'row', gap: 14 },
  shiftIconBox: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  shiftType: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  shiftTime: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  shiftDept: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  shiftWard: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, textTransform: 'uppercase' as any },
  swapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
  },
  swapText: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 12 },
  // Empty
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  emptySubtitle: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 14 },
});
