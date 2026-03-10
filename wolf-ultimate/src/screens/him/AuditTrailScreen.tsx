import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Eye, Edit, FileText, Download } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const AUDIT_LOG = [
  { id: 1, action: 'VIEWED', user: 'Dr. Mehra', department: 'Cardiology', record: 'MR-2026-0501', patient: 'Ramesh Gupta', timestamp: '2026-03-05 10:15', ip: '192.168.1.45', reason: 'Follow-up review' },
  { id: 2, action: 'RETRIEVED', user: 'Meera P. (HIM)', department: 'Medical Records', record: 'MR-2026-0502', patient: 'Anita Sharma', timestamp: '2026-03-05 09:30', ip: '192.168.1.12', reason: 'Insurance TPA request' },
  { id: 3, action: 'CODED', user: 'Meera P. (HIM)', department: 'Medical Records', record: 'MR-2026-0502', patient: 'Anita Sharma', timestamp: '2026-03-04 16:45', ip: '192.168.1.12', reason: 'ICD-10 coding' },
  { id: 4, action: 'DOWNLOADED', user: 'Legal Dept', department: 'Administration', record: 'MR-2026-0503', patient: 'Vijay Singh', timestamp: '2026-03-05 08:00', ip: '192.168.1.88', reason: 'MLC documentation' },
  { id: 5, action: 'EDITED', user: 'Dr. Reddy', department: 'Neurology', record: 'MR-2026-0503', patient: 'Vijay Singh', timestamp: '2026-03-04 22:30', ip: '192.168.1.51', reason: 'Clinical notes update' },
  { id: 6, action: 'VIEWED', user: 'Insurance TPA', department: 'External', record: 'MR-2026-0502', patient: 'Anita Sharma', timestamp: '2026-03-05 11:00', ip: '203.45.67.89', reason: 'Claim verification' },
];

const ACTION_CFG: Record<string, { icon: React.FC<any>; color: string }> = {
  VIEWED: { icon: Eye, color: '#3b82f6' },
  RETRIEVED: { icon: FileText, color: '#8b5cf6' },
  CODED: { icon: Edit, color: '#10b981' },
  DOWNLOADED: { icon: Download, color: '#f59e0b' },
  EDITED: { icon: Edit, color: '#ef4444' },
};

export const AuditTrailScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Audit Trail</Text>
            <Text style={styles.headerSub}>{AUDIT_LOG.length} events today</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Timeline */}
          {AUDIT_LOG.map((log, idx) => {
            const cfg = ACTION_CFG[log.action] || ACTION_CFG.VIEWED;
            const IconComp = cfg.icon;
            const isExternal = log.ip.startsWith('203');
            return (
              <View key={log.id} style={styles.timelineItem}>
                {/* Connector line */}
                {idx > 0 && <View style={[styles.connector, { backgroundColor: COLORS.border }]} />}
                <View style={[styles.iconCircle, { backgroundColor: cfg.color + '20' }]}>
                  <IconComp size={16} color={cfg.color} />
                </View>
                <GlassCard style={[styles.logCard, isExternal && { borderColor: '#f59e0b40', borderWidth: 1 }]}>
                  <View style={styles.logTop}>
                    <View style={[styles.actionBadge, { backgroundColor: cfg.color + '20' }]}>
                      <Text style={[styles.actionText, { color: cfg.color }]}>{log.action}</Text>
                    </View>
                    <Text style={styles.timestamp}>{log.timestamp}</Text>
                  </View>
                  <Text style={styles.logUser}>{log.user} ({log.department})</Text>
                  <Text style={styles.logRecord}>📄 {log.record} — {log.patient}</Text>
                  <Text style={styles.logReason}>💬 {log.reason}</Text>
                  <Text style={[styles.logIp, isExternal && { color: '#f59e0b' }]}>🌐 {log.ip} {isExternal ? '(External)' : '(Internal)'}</Text>
                </GlassCard>
              </View>
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
  timelineItem: { flexDirection: 'row', gap: 10, marginBottom: 4, position: 'relative' },
  connector: { position: 'absolute', left: 17, top: -10, width: 2, height: 14 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  logCard: { flex: 1, padding: 12, borderWidth: 0, marginBottom: 4 },
  logTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  actionText: { fontFamily: FONTS.bold, fontSize: 9 },
  timestamp: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
  logUser: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13, marginBottom: 2 },
  logRecord: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11, marginBottom: 1 },
  logReason: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 11, marginBottom: 1 },
  logIp: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
});
