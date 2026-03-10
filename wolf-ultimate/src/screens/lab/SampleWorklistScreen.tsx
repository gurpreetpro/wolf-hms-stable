import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, Filter, Clock, AlertTriangle, ChevronRight,
  ArrowDown, ArrowUp, TestTubes, FlaskConical,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import labService, { SampleWorklistItem } from '../../services/labService';

const PRIORITY_COLORS: Record<string, string> = {
  STAT: '#ef4444',
  URGENT: '#f59e0b',
  ROUTINE: '#64748b',
};

const STATUS_COLORS: Record<string, string> = {
  COLLECTED: '#94a3b8',
  RECEIVED: '#3b82f6',
  PROCESSING: '#f59e0b',
  RESULTED: '#8b5cf6',
  VERIFIED: '#10b981',
  DISPATCHED: '#64748b',
};

const DEPARTMENTS = ['ALL', 'HEMATOLOGY', 'BIOCHEMISTRY', 'MICROBIOLOGY', 'SEROLOGY', 'HISTOPATH', 'URINE'];
const STATUSES = ['ALL', 'COLLECTED', 'RECEIVED', 'PROCESSING', 'RESULTED', 'VERIFIED'];

export const SampleWorklistScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [samples, setSamples] = useState<SampleWorklistItem[]>([]);
  const [filtered, setFiltered] = useState<SampleWorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const loadWorklist = async () => {
    try {
      const data = await labService.getWorklist();
      setSamples(data);
    } catch (error) {
      console.error('Failed to load worklist:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadWorklist(); }, []);

  useEffect(() => {
    let list = samples;
    if (selectedDept !== 'ALL') list = list.filter(s => s.department === selectedDept);
    if (selectedStatus !== 'ALL') list = list.filter(s => s.status === selectedStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.patient_name.toLowerCase().includes(q) ||
        s.sample_id.toLowerCase().includes(q) ||
        s.test_name.toLowerCase().includes(q) ||
        s.patient_uhid.toLowerCase().includes(q)
      );
    }
    // Sort: STAT first, then by TAT remaining
    list.sort((a, b) => {
      const pOrder = { STAT: 0, URGENT: 1, ROUTINE: 2 };
      const pDiff = (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return (a.tat_remaining ?? 999) - (b.tat_remaining ?? 999);
    });
    setFiltered(list);
  }, [samples, selectedDept, selectedStatus, searchQuery]);

  const onRefresh = () => { setRefreshing(true); loadWorklist(); };

  const formatTAT = (mins?: number) => {
    if (mins === undefined || mins === null) return '—';
    if (mins <= 0) return 'OVERDUE';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sample Worklist</Text>
          <Text style={styles.headerCount}>{filtered.length} samples</Text>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient, sample ID, test..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Department Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {DEPARTMENTS.map(dept => (
            <TouchableOpacity
              key={dept}
              style={[styles.filterChip, selectedDept === dept && styles.filterChipActive]}
              onPress={() => setSelectedDept(dept)}
            >
              <Text style={[styles.filterChipText, selectedDept === dept && styles.filterChipTextActive]}>
                {dept === 'ALL' ? 'All Depts' : dept.charAt(0) + dept.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {STATUSES.map(st => (
            <TouchableOpacity
              key={st}
              style={[styles.filterChip, selectedStatus === st && styles.filterChipActive]}
              onPress={() => setSelectedStatus(st)}
            >
              <View style={[styles.statusDot, { backgroundColor: st === 'ALL' ? '#64748b' : STATUS_COLORS[st] }]} />
              <Text style={[styles.filterChipText, selectedStatus === st && styles.filterChipTextActive]}>
                {st === 'ALL' ? 'All Status' : st.charAt(0) + st.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Worklist */}
        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {filtered.map(sample => (
            <TouchableOpacity
              key={sample.id}
              onPress={() => navigation.navigate('ResultEntry', { sampleId: sample.sample_id, testName: sample.test_name })}
            >
              <GlassCard style={styles.sampleCard}>
                <View style={styles.sampleTop}>
                  <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[sample.priority] + '20' }]}>
                    <Text style={[styles.priorityText, { color: PRIORITY_COLORS[sample.priority] }]}>
                      {sample.priority}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[sample.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[sample.status] }]}>
                      {sample.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.testName}>{sample.test_name}</Text>
                <Text style={styles.sampleId}>{sample.sample_id}</Text>

                <View style={styles.patientRow}>
                  <Text style={styles.patientName}>{sample.patient_name}</Text>
                  <Text style={styles.patientMeta}>{sample.age}/{sample.gender} • {sample.patient_uhid}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>
                    {sample.source}{sample.ward_name ? ` • ${sample.ward_name}` : ''} • {sample.ordering_doctor}
                  </Text>
                  <View style={[
                    styles.tatChip,
                    { backgroundColor: (sample.tat_remaining ?? 999) <= 10 ? '#ef444420' : '#10b98120' }
                  ]}>
                    <Clock size={12} color={(sample.tat_remaining ?? 999) <= 10 ? '#ef4444' : '#10b981'} />
                    <Text style={[
                      styles.tatText,
                      { color: (sample.tat_remaining ?? 999) <= 10 ? '#ef4444' : '#10b981' }
                    ]}>
                      {formatTAT(sample.tat_remaining)}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}

          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <FlaskConical size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No samples found</Text>
              <Text style={styles.emptySubtext}>Adjust filters or check back later</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m,
  },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28 },
  headerCount: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  // Search
  searchRow: { paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14 },
  // Filters
  filterScroll: { marginBottom: 8, maxHeight: 42 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  filterChipText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterChipTextActive: { color: COLORS.primary },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  // Sample Card
  sampleCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  sampleTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  priorityText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  testName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: 2 },
  sampleId: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
  patientRow: { marginBottom: 6 },
  patientName: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 14 },
  patientMeta: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  detailText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, flex: 1 },
  tatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  tatText: { fontFamily: FONTS.bold, fontSize: 11 },
  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: 16 },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
});
