import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, AlertTriangle, Phone, CheckCircle2,
  Clock, User, MessageSquare,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import labService, { CriticalAlert } from '../../services/labService';

export const CriticalValueScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = async () => {
    try {
      const data = await labService.getCriticalAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load critical alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  const onRefresh = () => { setRefreshing(true); loadAlerts(); };

  const handleNotify = (alert: CriticalAlert) => {
    Alert.alert(
      '📞 Notify Physician',
      `Call ${alert.ordering_doctor} about critical ${alert.parameter}: ${alert.value} ${alert.unit} for patient ${alert.patient_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Notified',
          onPress: () => {
            setAlerts(prev => prev.map(a =>
              a.id === alert.id
                ? { ...a, notified: true, notified_to: alert.ordering_doctor, notified_at: new Date().toISOString() }
                : a
            ));
          },
        },
      ],
    );
  };

  const handleReadback = (alert: CriticalAlert) => {
    Alert.alert(
      '✅ Read-Back Confirmation',
      `Confirm that ${alert.ordering_doctor} read back the critical value of ${alert.parameter}: ${alert.value} ${alert.unit}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Read-Back',
          onPress: () => {
            setAlerts(prev => prev.map(a =>
              a.id === alert.id ? { ...a, readback_confirmed: true } : a
            ));
          },
        },
      ],
    );
  };

  const notified = alerts.filter(a => a.notified);
  const pending = alerts.filter(a => !a.notified);

  const getElapsedMinutes = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.round(diff / 60000);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Critical Values</Text>
            <Text style={styles.headerSub}>NABH Mandate: Notify within 30 minutes</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
        >
          {/* Pending Notifications */}
          {pending.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <AlertTriangle size={18} color="#ef4444" />
                <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>
                  PENDING NOTIFICATION ({pending.length})
                </Text>
              </View>

              {pending.map(alert => {
                const elapsed = getElapsedMinutes(alert.created_at);
                const isOverdue = elapsed > 30;
                return (
                  <GlassCard key={alert.id} style={[styles.alertCard, styles.urgentBorder]}>
                    {/* Timer */}
                    <View style={[styles.timerBanner, { backgroundColor: isOverdue ? '#ef444430' : '#f59e0b30' }]}>
                      <Clock size={14} color={isOverdue ? '#ef4444' : '#f59e0b'} />
                      <Text style={[styles.timerText, { color: isOverdue ? '#ef4444' : '#f59e0b' }]}>
                        {isOverdue ? `⚠️ OVERDUE — ${elapsed} min elapsed` : `${elapsed} min elapsed — ${30 - elapsed} min remaining`}
                      </Text>
                    </View>

                    {/* Critical Value */}
                    <View style={styles.criticalValueRow}>
                      <View>
                        <Text style={styles.critParam}>{alert.parameter}</Text>
                        <Text style={styles.critTest}>{alert.test_name}</Text>
                      </View>
                      <View style={styles.critValueBox}>
                        <Text style={styles.critValue}>{alert.value}</Text>
                        <Text style={styles.critUnit}>{alert.unit}</Text>
                      </View>
                    </View>
                    <Text style={styles.critRef}>Reference: {alert.reference_range}</Text>

                    {/* Patient & Doctor */}
                    <View style={styles.infoRow}>
                      <User size={12} color={COLORS.textSecondary} />
                      <Text style={styles.infoText}>{alert.patient_name} ({alert.patient_uhid})</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <MessageSquare size={12} color={COLORS.textSecondary} />
                      <Text style={styles.infoText}>{alert.ordering_doctor} • {alert.ward_name || 'OPD'}</Text>
                    </View>

                    {/* Action */}
                    <TouchableOpacity style={styles.notifyBtn} onPress={() => handleNotify(alert)}>
                      <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.notifyGradient}>
                        <Phone size={18} color="#fff" />
                        <Text style={styles.notifyBtnText}>Notify {alert.ordering_doctor}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </GlassCard>
                );
              })}
            </>
          )}

          {/* Already Notified */}
          {notified.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: pending.length > 0 ? SPACING.l : 0 }]}>
                <CheckCircle2 size={18} color="#10b981" />
                <Text style={[styles.sectionTitle, { color: '#10b981' }]}>
                  NOTIFIED ({notified.length})
                </Text>
              </View>

              {notified.map(alert => (
                <GlassCard key={alert.id} style={styles.alertCard}>
                  <View style={styles.criticalValueRow}>
                    <View>
                      <Text style={styles.critParam}>{alert.parameter}</Text>
                      <Text style={styles.critTest}>{alert.test_name}</Text>
                    </View>
                    <View style={styles.critValueBox}>
                      <Text style={[styles.critValue, { color: '#f59e0b' }]}>{alert.value}</Text>
                      <Text style={styles.critUnit}>{alert.unit}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <User size={12} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>{alert.patient_name} ({alert.patient_uhid})</Text>
                  </View>

                  {/* Notification Log */}
                  <View style={styles.notificationLog}>
                    <View style={styles.logRow}>
                      <CheckCircle2 size={14} color="#10b981" />
                      <Text style={styles.logText}>
                        Notified: {alert.notified_to} at {alert.notified_at ? new Date(alert.notified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </Text>
                    </View>
                    <View style={styles.logRow}>
                      {alert.readback_confirmed
                        ? <CheckCircle2 size={14} color="#10b981" />
                        : <AlertTriangle size={14} color="#f59e0b" />}
                      <Text style={styles.logText}>
                        Read-back: {alert.readback_confirmed ? 'Confirmed ✓' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Read-back button if not confirmed */}
                  {!alert.readback_confirmed && (
                    <TouchableOpacity style={styles.readbackBtn} onPress={() => handleReadback(alert)}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <Text style={styles.readbackBtnText}>Confirm Read-Back</Text>
                    </TouchableOpacity>
                  )}
                </GlassCard>
              ))}
            </>
          )}

          {alerts.length === 0 && (
            <View style={styles.emptyState}>
              <CheckCircle2 size={48} color="#10b981" />
              <Text style={styles.emptyText}>No Critical Values</Text>
              <Text style={styles.emptySubtext}>All values within normal range</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m,
  },
  backBtn: {
    padding: 10, backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.m },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' as any },
  // Alert Card
  alertCard: { padding: SPACING.m, marginBottom: 14, borderWidth: 0 },
  urgentBorder: { borderWidth: 1, borderColor: '#ef444440' },
  // Timer
  timerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 12,
  },
  timerText: { fontFamily: FONTS.bold, fontSize: 12 },
  // Critical value
  criticalValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  critParam: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  critTest: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  critValueBox: { alignItems: 'flex-end' },
  critValue: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 28 },
  critUnit: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  critRef: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginBottom: 10 },
  // Info
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  // Notify button
  notifyBtn: { marginTop: 12, borderRadius: 14, overflow: 'hidden' },
  notifyGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  notifyBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15 },
  // Notification log
  notificationLog: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 10,
    marginTop: 10, gap: 6,
  },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  // Read-back
  readbackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 10, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#10b98120', borderWidth: 1, borderColor: '#10b98140',
  },
  readbackBtnText: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 13 },
  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22, marginTop: 16 },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
});
