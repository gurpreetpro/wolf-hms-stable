import React, { useState, useEffect } from 'react';
import doctorService, { OPDQueueItem } from '../../services/doctorService';
import { PatientDetailModal } from './PatientDetailModal';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { HeartPulse, User, Calendar, Activity, ArrowRight, Clock } from 'lucide-react-native';
import { FONTS, SPACING, SHADOWS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';
import { syncOfflineQueue } from '../../services/networkService';
import { useTheme } from '../../theme/ThemeContext';
import { WifiOff, RefreshCw } from 'lucide-react-native';

// Helper: Time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// Sub-component: Stat Card
interface StatCardProps {
  icon: React.ComponentType<any>;
  title: string;
  value: string;
  color: string;
}

interface PatientItemProps {
  item: OPDQueueItem;
  onPress: () => void;
}

// Main Component
export const DoctorHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  
  // Dynamic Theme
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  // Sub-components moved inside to access Theme Context
  const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color }) => (
    <GlassCard style={styles.statCardContainer} intensity={60}>
      <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>  
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </GlassCard>
  );

  const PatientItem: React.FC<PatientItemProps> = ({ item, onPress }) => (
    <TouchableOpacity onPress={onPress}>
      <GlassCard style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.m, marginBottom: SPACING.s, borderWidth: 0 }}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.avatar}>
          <Text style={styles.avatarText}>{item.patient_name?.charAt(0) || '?'}</Text>
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.patientName}>{item.patient_name}</Text>
            {item.status === 'In Progress' && (
              <View style={styles.criticalBadge}><Text style={styles.criticalText}>IN CONSULT</Text></View>
            )}
          </View>
          <Text style={styles.diagnosis}>Token #{item.token_number} • {item.department || 'General'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Clock size={12} color={COLORS.textMuted} />
            <Text style={styles.subText}> {item.visit_date}</Text>
          </View>
        </View>
        <ArrowRight size={20} color={COLORS.textSecondary} />
      </GlassCard>
    </TouchableOpacity>
  );

  const [queue, setQueue] = useState<OPDQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<OPDQueueItem | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await doctorService.getQueue();
      setQueue(data);
    } catch (error: any) {
      console.error('Failed to load queue:', error);
      Alert.alert('Error', 'Could not load patient queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handlePatientPress = (patient: OPDQueueItem) => {
    setSelectedPatient(patient);
    setModalVisible(true);
  };

    return (
    <View style={styles.container}>
        <LinearGradient
            colors={[COLORS.background, COLORS.surface]} // Dynamic Gradient
            style={StyleSheet.absoluteFill}
        />
        
        {/* Background Decor - Optional (Maybe hide in light mode) */}
        {/* <BackgroundOrb color={COLORS.primary} position="top-right" /> */}

        <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{getGreeting()}</Text>
                    <Text style={styles.name}>Dr. {user?.name || user?.username || 'Physician'}</Text>
                </View>
                <TouchableOpacity style={styles.bellBtn} onPress={loadQueue}>
                    <Activity size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            {/* Offline Banner */}
            {useOfflineStore(state => state.isOffline) && (
                <View style={styles.offlineBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                       <WifiOff size={16} color="#fff" />
                       <Text style={styles.offlineText}>
                           Offline Mode ({useOfflineStore(state => state.queue.length)} pending)
                       </Text>
                    </View>
                    <TouchableOpacity onPress={syncOfflineQueue} style={styles.syncBtn}>
                        <RefreshCw size={14} color={COLORS.text} />
                        <Text style={styles.syncText}>Sync</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <StatCard icon={User} title="Waiting" value={queue.filter(q => q.status === 'Waiting').length.toString()} color={COLORS.primary} />
                    <StatCard icon={HeartPulse} title="In Consult" value={queue.filter(q => q.status === 'In Progress').length.toString()} color={COLORS.error} />
                    <StatCard icon={Calendar} title="Total" value={queue.length.toString()} color={COLORS.warning} />
                </View>

                {/* Specialty Modules (New) */}
                <View style={[styles.sectionHeader, { marginTop: SPACING.s }]}>
                    <Text style={styles.sectionTitle}>Specialty Units</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: SPACING.l }}>
                    <TouchableOpacity 
                        style={[styles.specialtyCard, { backgroundColor: '#312e81' }]}
                        onPress={() => (navigation as any).navigate('ChemoTracking')}
                    >
                         <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                            <Activity size={24} color="#fff" />
                         </View>
                         <Text style={styles.specialtyTitle}>Oncology</Text>
                         <Text style={styles.specialtySub}>Chemo Tracking</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.specialtyCard, { backgroundColor: '#0c4a6e' }]}
                        onPress={() => (navigation as any).navigate('DialysisMonitoring')}
                    >
                         <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                            <Activity size={24} color="#fff" />
                         </View>
                         <Text style={styles.specialtyTitle}>Dialysis</Text>
                         <Text style={styles.specialtySub}>Unit Monitor</Text>
                    </TouchableOpacity>
                </View>

                {/* Section Title */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>OPD Queue</Text>
                    <TouchableOpacity onPress={loadQueue}>
                        <Text style={styles.seeAll}>Refresh</Text>
                    </TouchableOpacity>
                </View>

                {/* Loading State */}
                {loading ? (
                    <Text style={{color: COLORS.textSecondary, textAlign: 'center'}}>Loading Queue...</Text>
                ) : (
                    <>
                        {queue.length === 0 ? (
                            <Text style={{color: COLORS.textMuted, textAlign: 'center', marginTop: 20}}>No patients in queue</Text>
                        ) : (
                             queue.map(p => (
                                <PatientItem 
                                    key={p.id} 
                                    item={p} 
                                    onPress={() => handlePatientPress(p)}
                                />
                             ))
                        )}
                    </>
                )}

            </ScrollView>

            <PatientDetailModal 
                visible={modalVisible} 
                patient={selectedPatient} 
                onClose={() => setModalVisible(false)} 
            />
        </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
  },
  greeting: {
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  name: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontSize: 28,
  },
  bellBtn: {
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: SPACING.l,
  },
  // New vertically oriented stat card styles
  statCardContainer: { 
    flex: 1, 
    aspectRatio: 0.7, // Tall card
    padding: SPACING.m, 
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface, // Or specific gray from design
    borderRadius: 24,
    borderWidth: 0, // Design looks borderless/filled
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  statValue: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontSize: 32,
    marginBottom: 4,
  },
  statTitle: {
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontSize: 20,
  },
  seeAll: {
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bold,
    color: '#fff',
    fontSize: 18,
  },
  patientName: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontSize: 16,
  },
  diagnosis: {
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  subText: {
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    fontSize: 12,
  },
  criticalBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  criticalText: {
    color: COLORS.error,
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  specialtyCard: {
      flex: 1,
      padding: 20,
      borderRadius: 24,
      height: 140,
      justifyContent: 'flex-end',
      position: 'relative',
      overflow: 'hidden',
  },
  specialtyTitle: {
      color: '#fff',
      fontFamily: FONTS.bold,
      fontSize: 18,
      marginBottom: 4,
  },
  specialtySub: {
      color: 'rgba(255,255,255,0.7)',
      fontFamily: FONTS.medium,
      fontSize: 12,
  },
  iconCircle: {
      position: 'absolute',
      top: 20,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
  },
  offlineBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: COLORS.error,
      marginHorizontal: SPACING.m,
      marginTop: SPACING.s,
      padding: SPACING.s,
      borderRadius: 8,
  },
  offlineText: {
      fontFamily: FONTS.medium,
      color: '#fff',
      fontSize: 12,
  },
  syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
  },
  syncText: {
      fontFamily: FONTS.bold,
      color: COLORS.text,
      fontSize: 12,
  },
});
