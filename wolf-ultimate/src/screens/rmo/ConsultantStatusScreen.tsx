import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Phone, MessageSquare, RefreshCw,
  CheckCircle2, Clock, XCircle, Syringe, BedDouble, Search,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import rmoService, { ConsultantStatus } from '../../services/rmoService';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return { color: '#22c55e', label: 'Available', icon: CheckCircle2 };
    case 'ON_CALL': return { color: '#f59e0b', label: 'On Call', icon: Phone };
    case 'IN_OT': return { color: '#8b5cf6', label: 'In OT', icon: Syringe };
    case 'UNREACHABLE': return { color: '#ef4444', label: 'Unreachable', icon: XCircle };
    case 'OFF_DUTY': return { color: '#64748b', label: 'Off Duty', icon: BedDouble };
    default: return { color: '#64748b', label: status, icon: Clock };
  }
};

export const ConsultantStatusScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [consultants, setConsultants] = useState<ConsultantStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConsultants = async () => {
    try {
      const data = await rmoService.getConsultantStatus();
      setConsultants(data);
    } catch (error) {
      console.error('Failed to load consultants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadConsultants(); }, []);

  const filteredConsultants = consultants.filter(c => {
    if (filter && c.status !== filter) return false;
    return true;
  });

  // Group by status priority: AVAILABLE first, then ON_CALL, IN_OT, UNREACHABLE, OFF_DUTY
  const statusOrder = ['AVAILABLE', 'ON_CALL', 'IN_OT', 'UNREACHABLE', 'OFF_DUTY'];
  const sortedConsultants = [...filteredConsultants].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  );

  // Count by status
  const statusCounts = consultants.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  const filterChips = [
    { key: null, label: 'All', count: consultants.length },
    { key: 'AVAILABLE', label: 'Available', count: statusCounts['AVAILABLE'] || 0 },
    { key: 'ON_CALL', label: 'On Call', count: statusCounts['ON_CALL'] || 0 },
    { key: 'IN_OT', label: 'In OT', count: statusCounts['IN_OT'] || 0 },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Consultant Status</Text>
          <TouchableOpacity onPress={loadConsultants} style={styles.backBtn}>
            <RefreshCw size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Live Status Summary */}
        <LinearGradient
          colors={['#065f46', '#064e3b']}
          style={styles.summaryBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{statusCounts['AVAILABLE'] || 0}</Text>
              <Text style={styles.summaryLabel}>Available</Text>
            </View>
            <View style={[styles.summaryDivider]} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{statusCounts['ON_CALL'] || 0}</Text>
              <Text style={styles.summaryLabel}>On Call</Text>
            </View>
            <View style={[styles.summaryDivider]} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{statusCounts['IN_OT'] || 0}</Text>
              <Text style={styles.summaryLabel}>In OT</Text>
            </View>
            <View style={[styles.summaryDivider]} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{consultants.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {filterChips.map(chip => {
            const isActive = filter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key ?? 'all'}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setFilter(chip.key)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {chip.label} ({chip.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadConsultants(); }}
              tintColor={COLORS.primary}
            />
          }
        >
          {loading ? (
            <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 }}>Loading consultants...</Text>
          ) : sortedConsultants.length === 0 ? (
            <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 40 }}>No consultants found</Text>
          ) : (
            sortedConsultants.map(doc => {
              const statusConfig = getStatusConfig(doc.status);
              const StatusIcon = statusConfig.icon;
              return (
                <GlassCard key={doc.id} style={styles.consultantCard}>
                  <View style={styles.cardRow}>
                    {/* Avatar */}
                    <LinearGradient
                      colors={[statusConfig.color + '40', statusConfig.color + '20']}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarText}>{doc.name.charAt(4) || doc.name.charAt(0)}</Text>
                    </LinearGradient>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.docName}>{doc.name}</Text>
                        <View style={[styles.statusPill, { backgroundColor: statusConfig.color + '20' }]}>
                          <StatusIcon size={10} color={statusConfig.color} />
                          <Text style={[styles.statusPillText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.docDept}>{doc.department}</Text>
                      {doc.specialty && (
                        <Text style={styles.docSpecialty}>{doc.specialty}</Text>
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionCol}>
                      {doc.phone && doc.status !== 'OFF_DUTY' && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#22c55e20' }]}
                            onPress={() => handleCall(doc.phone!)}
                          >
                            <Phone size={16} color="#22c55e" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#3b82f620' }]}
                            onPress={() => handleMessage(doc.phone!)}
                          >
                            <MessageSquare size={16} color="#3b82f6" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
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
  // Summary Banner
  summaryBanner: {
    marginHorizontal: SPACING.m, borderRadius: 20, padding: 16,
    marginBottom: SPACING.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontFamily: FONTS.bold, color: '#fff', fontSize: 24 },
  summaryLabel: { fontFamily: FONTS.medium, color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  // Filter Chips
  chipRow: { paddingHorizontal: SPACING.m, gap: 8, paddingBottom: SPACING.s },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  chipTextActive: { color: '#fff' },
  // Consultant Cards
  consultantCard: { marginBottom: 10, padding: SPACING.m, borderWidth: 0 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 18 },
  docName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  docDept: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  docSpecialty: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  statusPillText: { fontFamily: FONTS.bold, fontSize: 9, textTransform: 'uppercase' as any },
  // Action Buttons
  actionCol: { gap: 6 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
});
